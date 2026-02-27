import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/prisma"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  try {
    const { productId, email, couponCode } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    // Fetch the product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (!product.published) {
      return NextResponse.json({ error: "Product is not available" }, { status: 400 })
    }

    if (product.fileType !== "digital") {
      return NextResponse.json({ error: "Product is not a digital product" }, { status: 400 })
    }

    // Determine base price (use sale price if on sale)
    let priceAmount: number
    if (product.onSale && product.salePrice) {
      priceAmount = parseFloat(product.salePrice.toString())
    } else if (product.price) {
      priceAmount = parseFloat(product.price.toString())
    } else {
      return NextResponse.json({ error: "Product has no price" }, { status: 400 })
    }

    // Handle coupon if provided
    let couponId: string | null = null
    let discountAmount = 0
    let originalPrice = priceAmount

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: { equals: couponCode.toUpperCase().trim(), mode: "insensitive" } },
      })

      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
      }

      // Re-validate coupon server-side
      if (!coupon.active) {
        return NextResponse.json({ error: "Coupon is no longer active" }, { status: 400 })
      }

      const now = new Date()
      if (coupon.startsAt && now < coupon.startsAt) {
        return NextResponse.json({ error: "Coupon is not yet valid" }, { status: 400 })
      }
      if (coupon.expiresAt && now > coupon.expiresAt) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 })
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 })
      }

      // Per-user limit
      if (email && coupon.perUserLimit > 0) {
        const userUsages = await prisma.couponUsage.count({
          where: { couponId: coupon.id, email },
        })
        if (userUsages >= coupon.perUserLimit) {
          return NextResponse.json({ error: "You have already used this coupon" }, { status: 400 })
        }
      }

      // Product restriction
      if (coupon.productIds.length > 0 && !coupon.productIds.includes(productId)) {
        return NextResponse.json({ error: "Coupon is not valid for this product" }, { status: 400 })
      }

      // Sale check
      if (product.onSale && product.salePrice && !coupon.allowOnSale) {
        return NextResponse.json({ error: "Coupon cannot be used on sale products" }, { status: 400 })
      }

      // Min purchase check
      if (coupon.minPurchase && priceAmount < parseFloat(coupon.minPurchase.toString())) {
        return NextResponse.json({ error: "Minimum purchase amount not met" }, { status: 400 })
      }

      // Calculate discount
      if (coupon.type === "percentage") {
        discountAmount = priceAmount * (parseFloat(coupon.value.toString()) / 100)
      } else {
        // Fixed amount
        if (coupon.currency && coupon.currency !== product.currency) {
          return NextResponse.json({ error: "Coupon currency does not match product currency" }, { status: 400 })
        }
        discountAmount = parseFloat(coupon.value.toString())
      }

      // Cap discount
      discountAmount = Math.min(discountAmount, priceAmount - 0.50)
      discountAmount = Math.max(discountAmount, 0)

      originalPrice = priceAmount
      priceAmount = Math.max(priceAmount - discountAmount, 0.50)
      couponId = coupon.id
    }

    // Convert to cents for Stripe
    const priceInCents = Math.round(priceAmount * 100)

    // Map currency codes
    const currencyMap: Record<string, string> = {
      EUR: "eur",
    }
    const currency = currencyMap[product.currency] || "eur"

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"

    // Build product description with discount info
    let description = product.descEn || undefined
    if (couponCode && discountAmount > 0) {
      description = `${description ? description + " | " : ""}Coupon: ${couponCode.toUpperCase()} (-${discountAmount.toFixed(2)} ${product.currency})`
    }

    // Create Stripe checkout session
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: product.nameEn,
              description,
              images: product.image ? [product.image] : undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel?product=${product.slug}`,
      customer_email: email || undefined,
      metadata: {
        productId: product.id,
        productSlug: product.slug,
        ...(couponId ? { couponId, couponCode: couponCode.toUpperCase(), originalPrice: originalPrice.toFixed(2), discountAmount: discountAmount.toFixed(2) } : {}),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
