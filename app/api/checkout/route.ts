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
    const { productId, email } = await request.json()

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

    // Determine price (use sale price if on sale)
    let priceAmount: number
    if (product.onSale && product.salePrice) {
      priceAmount = parseFloat(product.salePrice.toString())
    } else if (product.price) {
      priceAmount = parseFloat(product.price.toString())
    } else {
      return NextResponse.json({ error: "Product has no price" }, { status: 400 })
    }

    // Convert to cents for Stripe
    const priceInCents = Math.round(priceAmount * 100)

    // Map currency codes
    const currencyMap: Record<string, string> = {
      BGN: "bgn",
      EUR: "eur",
      USD: "usd",
    }
    const currency = currencyMap[product.currency] || "bgn"

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000"

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
              description: product.descEn || undefined,
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
