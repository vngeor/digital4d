import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/prisma"
import { randomBytes } from "crypto"
import { generateOrderNumber } from "@/lib/generateCode"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(key)
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
  }
  return secret
}

async function createDigitalPurchase(productId: string, email: string, stripeSession: string, couponId?: string | null) {
  const downloadToken = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await prisma.digitalPurchase.create({
    data: {
      productId,
      email,
      downloadToken,
      downloadCount: 0,
      maxDownloads: 3,
      expiresAt,
      stripeSession,
      couponId: couponId || null,
    },
  })
}

async function createPhysicalOrder(nameEn: string, quantity: number, price: string, currency: string, email: string, stripeSession: string, userId?: string | null) {
  await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: email,
      customerEmail: email,
      userId: userId || null,
      description: `${nameEn} × ${quantity} — ${price} ${currency}`,
      notes: `Stripe session: ${stripeSession}`,
      status: "PENDING",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      const stripe = getStripe()
      const webhookSecret = getWebhookSecret()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err instanceof Error ? err.message : "Unknown")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_email || session.customer_details?.email
      const isCartCheckout = session.metadata?.type === "cart"
      const userId = session.metadata?.userId || null

      // Idempotency: skip duplicate Stripe event deliveries
      const [existingPurchase, existingOrder] = await Promise.all([
        prisma.digitalPurchase.findFirst({ where: { stripeSession: session.id } }),
        prisma.order.findFirst({ where: { notes: { contains: session.id } } }),
      ])
      if (existingPurchase || existingOrder) {
        console.log(`Duplicate webhook for session ${session.id} — skipping`)
        return NextResponse.json({ received: true })
      }

      if (isCartCheckout) {
        // ── Cart multi-item flow ──────────────────────────────────────────────
        if (!customerEmail) {
          console.error("Missing email in cart session")
          return NextResponse.json({ error: "Missing email" }, { status: 400 })
        }

        let cartItems: Array<{
          productId: string
          fileType: string
          quantity: number
          nameEn: string
          price: string
          currency: string
        }> = []

        try {
          cartItems = JSON.parse(session.metadata!.items)
        } catch {
          console.error("Failed to parse cart items from metadata")
          return NextResponse.json({ error: "Invalid cart metadata" }, { status: 400 })
        }

        const orders: Array<{ id: string }> = []

        for (const item of cartItems) {
          if (item.fileType === "digital") {
            await createDigitalPurchase(item.productId, customerEmail, session.id)
            console.log(`Digital purchase created for product ${item.productId}`)
          } else {
            const newOrder = await prisma.order.create({
              data: {
                orderNumber: generateOrderNumber(),
                customerName: customerEmail,
                customerEmail: customerEmail,
                userId: userId || null,
                description: `${item.nameEn} × ${item.quantity} — ${item.price} ${item.currency}`,
                notes: `Stripe session: ${session.id}`,
                status: "PENDING",
              },
            })
            orders.push({ id: newOrder.id })
            console.log(`Physical order created for product ${item.productId}`)
          }
        }

        // Record coupon usage for cart checkout
        if (session.metadata?.couponId) {
          const couponId = session.metadata.couponId
          try {
            const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { maxUses: true } })
            const existing = await prisma.couponUsage.findFirst({ where: { couponId, stripeSession: session.id } })
            if (!existing) {
              const totalAmount = session.amount_total ? session.amount_total / 100 : 0
              const amountSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : totalAmount
              const discountAmount = Math.max(amountSubtotal - totalAmount, 0)
              const usageRecord = await prisma.couponUsage.create({
                data: {
                  couponId,
                  email: customerEmail,
                  originalPrice: amountSubtotal,
                  discountAmount,
                  finalPrice: Math.max(totalAmount, 0.50),
                  stripeSession: session.id,
                },
              })
              if (coupon?.maxUses) {
                const updated = await prisma.coupon.updateMany({
                  where: { id: couponId, usedCount: { lt: coupon.maxUses } },
                  data: { usedCount: { increment: 1 } },
                })
                if (updated.count === 0) {
                  await prisma.couponUsage.delete({ where: { id: usageRecord.id } })
                  console.log(`Cart coupon ${couponId} max uses reached — usage rolled back`)
                }
              } else {
                await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
              }
              console.log(`Cart coupon usage recorded, coupon ${couponId}`)
            }
          } catch (e) {
            console.error("Failed to record cart coupon usage:", e instanceof Error ? e.message : "Unknown error")
          }
        }
      } else {
        // ── Single-product flow ───────────────────────────────────────────────
        const productId = session.metadata?.productId

        if (!productId || !customerEmail) {
          console.error("Missing productId or email in session metadata")
          return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
        }

        // Default "digital" for backward compat with existing sessions (no fileType in metadata)
        const fileType = session.metadata?.fileType || "digital"

        if (fileType === "digital") {
          await createDigitalPurchase(productId, customerEmail, session.id, session.metadata?.couponId)
          console.log(`Digital purchase created, product ${productId}`)

          // Record coupon usage if a coupon was used
          const couponId = session.metadata?.couponId
          if (couponId) {
            try {
              const originalPrice = parseFloat(session.metadata?.originalPrice || "0")
              const discountAmount = parseFloat(session.metadata?.discountAmount || "0")
              const finalPrice = originalPrice - discountAmount

              const usageRecord = await prisma.couponUsage.create({
                data: {
                  couponId,
                  email: customerEmail,
                  originalPrice,
                  discountAmount,
                  finalPrice: Math.max(finalPrice, 0.50),
                  stripeSession: session.id,
                },
              })

              const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { maxUses: true } })
              if (coupon) {
                if (coupon.maxUses !== null) {
                  const updated = await prisma.coupon.updateMany({
                    where: { id: couponId, usedCount: { lt: coupon.maxUses } },
                    data: { usedCount: { increment: 1 } },
                  })
                  // Race condition: another concurrent webhook already hit the cap — roll back usage record
                  if (updated.count === 0) {
                    await prisma.couponUsage.delete({ where: { id: usageRecord.id } })
                    console.log(`Coupon ${couponId} max uses reached during concurrent processing — usage rolled back`)
                  }
                } else {
                  await prisma.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                  })
                }
              }

              console.log(`Coupon usage recorded, coupon ${couponId}`)
            } catch (couponError) {
              console.error("Error recording coupon usage:", couponError instanceof Error ? couponError.message : "Unknown")
              // Non-critical — purchase still valid
            }
          }
        } else {
          // Physical single-item "Buy Now" → create Order
          const nameEn = session.metadata?.nameEn || `Product ${productId}`
          const price = session.metadata?.price || (session.amount_total ? (session.amount_total / 100).toFixed(2) : "0")
          const currency = session.currency?.toUpperCase() || "EUR"
          await createPhysicalOrder(nameEn, 1, price, currency, customerEmail, session.id, userId)
          console.log(`Physical order created, product ${productId}`)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
