import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { parseTiers, getActiveTier, applyBulkDiscount } from "@/lib/bulkDiscount"
import { isProductEligibleForCoupon } from "@/lib/couponHelpers"

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
    const { items: rawItems, couponCode } = body

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
      category: string
      brandId: string | null
      onSale: boolean
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
      let itemOnSale = false
      if (packageId) {
        const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } })
        if (!pkg || pkg.productId !== productId) {
          return NextResponse.json({ error: `Package not found for product "${product.nameEn}"` }, { status: 404 })
        }
        if (!["in_stock", "pre_order"].includes(pkg.status)) {
          return NextResponse.json({ error: `Package for "${product.nameEn}" is not available` }, { status: 400 })
        }
        itemOnSale = pkg.salePrice != null
        effectivePrice = pkg.salePrice
          ? parseFloat(pkg.salePrice.toString())
          : parseFloat(pkg.price.toString())
      } else {
        itemOnSale = !!(product.onSale && product.salePrice)
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
      // Product-level tiers override global tiers when non-empty; skip if expired
      if (quantity > 1) {
        const productTierRaw = parseTiers((product as { bulkDiscountTiers?: string }).bulkDiscountTiers || "")
        const productTierExpiry = (product as { bulkDiscountExpiresAt?: Date | null }).bulkDiscountExpiresAt
        const productTiersActive = productTierRaw.length > 0 &&
          (!productTierExpiry || new Date(productTierExpiry) > new Date())
        const activeTiers = productTiersActive ? productTierRaw : bulkTiers
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
        category: product.category,
        brandId: product.brandId,
        onSale: itemOnSale,
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

    // Server-side coupon validation (if couponCode provided)
    let stripeCouponId: string | null = null
    let validatedCouponId: string | null = null
    let validatedCouponCode: string | null = null

    if (couponCode && typeof couponCode === "string") {
      try {
        const coupon = await prisma.coupon.findFirst({
          where: { code: couponCode.trim().toUpperCase(), active: true },
        })

        if (coupon) {
          const now = new Date()
          const isValid =
            (!coupon.startsAt || coupon.startsAt <= now) &&
            (!coupon.expiresAt || coupon.expiresAt >= now) &&
            (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
            (!coupon.currency || coupon.currency === sharedCurrency)

          if (isValid) {
            // Filter eligible items by productIds, categoryIds, or brandIds
            let allCategories: { id: string; slug: string; parentId: string | null }[] = []
            if ((coupon.categoryIds?.length ?? 0) > 0) {
              allCategories = await prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } })
            }
            const hasRestrictions =
              (coupon.productIds?.length ?? 0) > 0 ||
              (coupon.categoryIds?.length ?? 0) > 0 ||
              (coupon.brandIds?.length ?? 0) > 0

            let eligibleItems = validatedItems
            // Exclude on-sale items if coupon doesn't allow stacking with sale prices
            if (!coupon.allowOnSale) {
              eligibleItems = eligibleItems.filter(i => !i.onSale)
            }
            if (hasRestrictions) {
              eligibleItems = eligibleItems.filter(i =>
                isProductEligibleForCoupon(
                  i.productId, i.category ?? "", i.brandId ?? null,
                  coupon.productIds ?? [], coupon.categoryIds ?? [], coupon.brandIds ?? [],
                  allCategories
                )
              )
            }
            if (eligibleItems.length > 0) {
              const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0)

              if (!coupon.minPurchase || eligibleSubtotal >= Number(coupon.minPurchase)) {
                let discountAmount = 0
                if (coupon.type === "percentage") {
                  const raw = Math.round(eligibleSubtotal * (Number(coupon.value) / 100) * 100) / 100
                  discountAmount = Math.round(Math.min(raw, eligibleSubtotal - 0.50) * 100) / 100
                } else {
                  discountAmount = Math.min(Number(coupon.value), eligibleSubtotal - 0.5)
                  discountAmount = Math.round(discountAmount * 100) / 100
                }

                if (discountAmount > 0) {
                  const discountCents = Math.round(discountAmount * 100)
                  const sc = await stripe.coupons.create({
                    amount_off: discountCents,
                    currency: stripeCurrency,
                    duration: "once",
                    max_redemptions: 1,
                  })
                  stripeCouponId = sc.id
                  validatedCouponId = coupon.id
                  validatedCouponCode = coupon.code
                }
              }
            }
          }
        }
      } catch (couponError) {
        console.error("Coupon validation error at checkout:", couponError instanceof Error ? couponError.message : "Unknown")
        // Non-critical — proceed without coupon
      }
    }
    let stripeSession
    try {
      stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel`,
        customer_email: session.user.email || undefined,
        metadata: {
          type: "cart",
          userId: session.user.id,
          items: JSON.stringify(metaItems),
          ...(validatedCouponId ? { couponId: validatedCouponId, couponCode: validatedCouponCode ?? "" } : {}),
        },
      })
    } catch (sessionError) {
      // Clean up orphaned Stripe coupon if session creation failed
      if (stripeCouponId) {
        try { await stripe.coupons.del(stripeCouponId) } catch { /* ignore cleanup errors */ }
      }
      throw sessionError
    }

    return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url })
  } catch (error) {
    console.error("Cart checkout error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
