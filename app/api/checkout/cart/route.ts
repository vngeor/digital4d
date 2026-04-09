import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { parseTiers, getActiveTier, applyBulkDiscount } from "@/lib/bulkDiscount"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(key)
}

interface CartRequestItem {
  productId: string
  packageId?: string | null
  quantity: number
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to checkout" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { items: rawItems, couponCode: rawCouponCode } = body

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

    // Fetch bulk discount settings once for all items
    const bulkSettings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
    const bulkTiers = bulkSettings?.bulkDiscountEnabled ? parseTiers(bulkSettings.bulkDiscountTiers) : []

    for (const raw of rawItems as CartRequestItem[]) {
      const { productId, packageId, quantity: rawQty } = raw
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

      // When a packageId is provided, look up the package price and status
      let effectivePrice: number | null = null
      if (packageId) {
        const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } })
        if (!pkg || pkg.productId !== productId) {
          return NextResponse.json({ error: `Package not found for product "${product.nameEn}"` }, { status: 404 })
        }
        if (!["in_stock", "pre_order"].includes(pkg.status)) {
          return NextResponse.json({ error: `Package for "${product.nameEn}" is not available` }, { status: 400 })
        }
        effectivePrice = pkg.salePrice
          ? parseFloat(pkg.salePrice.toString())
          : parseFloat(pkg.price.toString())
      } else {
        effectivePrice = product.onSale && product.salePrice
          ? parseFloat(product.salePrice.toString())
          : product.price
            ? parseFloat(product.price.toString())
            : null
      }

      if (!effectivePrice || effectivePrice < 0.50) {
        return NextResponse.json({ error: `Product "${product.nameEn}" has no valid price` }, { status: 400 })
      }

      // Apply bulk discount server-side
      // Product-level tiers override global tiers when non-empty
      if (quantity > 1) {
        const productTiers = parseTiers((product as { bulkDiscountTiers?: string }).bulkDiscountTiers || "")
        const activeTiers = productTiers.length > 0 ? productTiers : bulkTiers
        if (activeTiers.length > 0) {
          const tier = getActiveTier(quantity, activeTiers)
          if (tier) {
            effectivePrice = Math.max(applyBulkDiscount(effectivePrice as number, tier), 0.50)
          }
        }
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

    // Validate coupon if provided
    let stripeCouponId: string | undefined
    let couponDbId: string | undefined
    let couponDbCode: string | undefined

    if (rawCouponCode && typeof rawCouponCode === "string") {
      try {
        const couponCode = rawCouponCode.trim().toUpperCase()
        const coupon = await prisma.coupon.findFirst({
          where: { code: couponCode, active: true },
        })
        if (coupon) {
          const now = new Date()
          const isValid =
            (!coupon.startsAt || coupon.startsAt <= now) &&
            (!coupon.expiresAt || coupon.expiresAt > now) &&
            (!coupon.maxUses || coupon.usedCount < coupon.maxUses)

          if (isValid) {
            type ValidatedItemLite = { productId: string; effectivePrice: number; quantity: number }
            let eligibleItems: ValidatedItemLite[] = validatedItems
            if (coupon.productIds.length > 0) {
              eligibleItems = validatedItems.filter(item => coupon.productIds.includes(item.productId))
            }

            if (eligibleItems.length > 0) {
              const eligibleSubtotal = eligibleItems.reduce(
                (sum, item) => sum + item.effectivePrice * item.quantity, 0
              )

              let discountAmount = 0
              if (coupon.type === "percentage") {
                discountAmount = Math.round(eligibleSubtotal * (Number(coupon.value) / 100) * 100) / 100
              } else {
                discountAmount = Math.min(Number(coupon.value), eligibleSubtotal - 0.5)
                discountAmount = Math.round(discountAmount * 100) / 100
              }

              if (discountAmount > 0) {
                const discountCents = Math.round(discountAmount * 100)
                const stripeSdk = getStripe()
              const sc = await stripeSdk.coupons.create({
                  amount_off: discountCents,
                  currency: stripeCurrency,
                  duration: "once",
                  max_redemptions: 1,
                })
                stripeCouponId = sc.id
                couponDbId = coupon.id
                couponDbCode = coupon.code
              }
            }
          }
        }
      } catch (err) {
        console.error("Cart coupon error:", err instanceof Error ? err.message : "error")
        // Don't block checkout if coupon fails
      }
    }

    // Get base URL
    const ALLOWED_ORIGINS = ["https://www.digital4d.eu", "https://digital4d.eu", "http://localhost:3000"]
    const origin = request.headers.get("origin") || ""
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.digital4d.eu")

    const stripe = getStripe()
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      customer_email: session.user.email || undefined,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
      metadata: {
        type: "cart",
        userId: session.user.id,
        items: JSON.stringify(metaItems),
        ...(couponDbId ? { couponId: couponDbId, couponCode: couponDbCode ?? "" } : {}),
      },
    })

    return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url })
  } catch (error) {
    console.error("Cart checkout error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
