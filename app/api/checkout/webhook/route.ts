import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/prisma"
import { randomBytes } from "crypto"

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
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      const productId = session.metadata?.productId
      const customerEmail = session.customer_email || session.customer_details?.email

      if (!productId || !customerEmail) {
        console.error("Missing productId or email in session metadata")
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      // Generate unique download token
      const downloadToken = randomBytes(32).toString("hex")

      // Set expiry to 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create digital purchase record
      await prisma.digitalPurchase.create({
        data: {
          productId,
          email: customerEmail,
          downloadToken,
          downloadCount: 0,
          maxDownloads: 3,
          expiresAt,
          stripeSession: session.id,
          couponId: session.metadata?.couponId || null,
        },
      })

      console.log(`Digital purchase created for ${customerEmail}, product ${productId}`)

      // Record coupon usage if a coupon was used
      const couponId = session.metadata?.couponId
      if (couponId) {
        try {
          const originalPrice = parseFloat(session.metadata?.originalPrice || "0")
          const discountAmount = parseFloat(session.metadata?.discountAmount || "0")
          const finalPrice = originalPrice - discountAmount

          await prisma.couponUsage.create({
            data: {
              couponId,
              email: customerEmail,
              originalPrice,
              discountAmount,
              finalPrice: Math.max(finalPrice, 0.50),
              stripeSession: session.id,
            },
          })

          // Increment coupon usage count
          await prisma.coupon.update({
            where: { id: couponId },
            data: { usedCount: { increment: 1 } },
          })

          console.log(`Coupon usage recorded for ${customerEmail}, coupon ${couponId}`)
        } catch (couponError) {
          console.error("Error recording coupon usage:", couponError)
          // Non-critical — purchase still valid
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}