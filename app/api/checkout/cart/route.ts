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

interface CartRequestItem {
  productId: string
  quantity: number
}

export async function POST(request: NextRequest) {
  try {
    const { items: rawItems } = await request.json()

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    if (rawItems.length > 50) {
      return NextResponse.json({ error: "Too many items in cart" }, { status: 400 })
    }

    // Validate and fetch each product
    const validatedItems: Array<{
      productId: string
      productSlug: string
      nameEn: string
      nameBg: string
      nameEs: string
      image: string | null
      effectivePrice: number
      currency: string
      fileType: string
      quantity: number
    }> = []

    let sharedCurrency: string | null = null

    for (const raw of rawItems as CartRequestItem[]) {
      const { productId, quantity: rawQty } = raw
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(rawQty) || 1)))

      if (!productId) {
        return NextResponse.json({ error: "Missing productId in cart item" }, { status: 400 })
      }

      const product = await prisma.product.findUnique({ where: { id: productId } })

      if (!product) {
        return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 404 })
      }

      if (!product.published) {
        return NextResponse.json({ error: `Product "${product.nameEn}" is not available` }, { status: 400 })
      }

      if (!["in_stock", "pre_order"].includes(product.status)) {
        return NextResponse.json({ error: `Product "${product.nameEn}" is not available for purchase` }, { status: 400 })
      }

      if (product.fileType === "service" || product.priceType !== "fixed") {
        return NextResponse.json({ error: `Product "${product.nameEn}" cannot be purchased via cart` }, { status: 400 })
      }

      const effectivePrice = product.onSale && product.salePrice
        ? parseFloat(product.salePrice.toString())
        : product.price
          ? parseFloat(product.price.toString())
          : null

      if (!effectivePrice || effectivePrice < 0.50) {
        return NextResponse.json({ error: `Product "${product.nameEn}" has no valid price` }, { status: 400 })
      }

      const currency = product.currency || "EUR"

      // Enforce single currency across cart
      if (sharedCurrency === null) {
        sharedCurrency = currency
      } else if (sharedCurrency !== currency) {
        return NextResponse.json(
          { error: "All cart items must use the same currency" },
          { status: 400 }
        )
      }

      validatedItems.push({
        productId: product.id,
        productSlug: product.slug,
        nameEn: product.nameEn,
        nameBg: product.nameBg,
        nameEs: product.nameEs,
        image: product.image,
        effectivePrice,
        currency,
        fileType: product.fileType || "physical",
        quantity,
      })
    }

    if (!sharedCurrency) {
      return NextResponse.json({ error: "No valid items in cart" }, { status: 400 })
    }

    // Map currency to Stripe format
    const stripeCurrency = sharedCurrency.toLowerCase()

    // Build Stripe line items
    const lineItems = validatedItems.map((item) => ({
      price_data: {
        currency: stripeCurrency,
        product_data: {
          name: item.nameEn,
          ...(item.image ? { images: [item.image] } : {}),
        },
        unit_amount: Math.round(item.effectivePrice * 100),
      },
      quantity: item.quantity,
    }))

    // Build metadata — serialize cart items for webhook processing
    const metaItems = validatedItems.map((item) => ({
      productId: item.productId,
      productSlug: item.productSlug,
      fileType: item.fileType,
      quantity: item.quantity,
      nameEn: item.nameEn,
      nameBg: item.nameBg,
      nameEs: item.nameEs,
      price: item.effectivePrice.toFixed(2),
      currency: item.currency,
    }))

    // Validate against Stripe metadata 500-char value limit
    const itemsJson = JSON.stringify(metaItems)
    if (itemsJson.length > 490) {
      // Truncate names to fit if needed (keep product IDs intact)
      const compactItems = metaItems.map((i) => ({
        productId: i.productId,
        fileType: i.fileType,
        quantity: i.quantity,
        nameEn: i.nameEn.slice(0, 40),
        price: i.price,
        currency: i.currency,
      }))
      // Use compact version
      Object.assign(metaItems, compactItems)
    }

    // Get base URL
    const ALLOWED_ORIGINS = ["https://www.digital4d.eu", "https://digital4d.eu", "http://localhost:3000"]
    const origin = request.headers.get("origin") || ""
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.digital4d.eu")

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: {
        type: "cart",
        items: JSON.stringify(metaItems),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Cart checkout error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
