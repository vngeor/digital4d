import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { code, productId, email } = await request.json()

    if (!code || !productId) {
      return NextResponse.json({ valid: false, error: "MISSING_PARAMS" }, { status: 400 })
    }

    // 1. Find coupon by code (case-insensitive)
    const coupon = await prisma.coupon.findFirst({
      where: { code: { equals: code.toUpperCase().trim(), mode: "insensitive" } },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "NOT_FOUND" })
    }

    // 2. Check active
    if (!coupon.active) {
      return NextResponse.json({ valid: false, error: "INACTIVE" })
    }

    // 3. Check date range
    const now = new Date()
    if (coupon.startsAt && now < coupon.startsAt) {
      return NextResponse.json({ valid: false, error: "NOT_STARTED" })
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return NextResponse.json({ valid: false, error: "EXPIRED" })
    }

    // 4. Check max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "MAX_USES" })
    }

    // 5. Per-user limit
    if (email && coupon.perUserLimit > 0) {
      const userUsages = await prisma.couponUsage.count({
        where: { couponId: coupon.id, email },
      })
      if (userUsages >= coupon.perUserLimit) {
        return NextResponse.json({ valid: false, error: "USER_LIMIT" })
      }
    }

    // 6. Product match
    if (coupon.productIds.length > 0 && !coupon.productIds.includes(productId)) {
      return NextResponse.json({ valid: false, error: "WRONG_PRODUCT" })
    }

    // Fetch product for price calculation
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, salePrice: true, onSale: true, currency: true },
    })

    if (!product || !product.price) {
      return NextResponse.json({ valid: false, error: "PRODUCT_NOT_FOUND" })
    }

    // 7. Sale check
    if (product.onSale && product.salePrice && !coupon.allowOnSale) {
      return NextResponse.json({ valid: false, error: "NOT_ON_SALE" })
    }

    // Determine base price (sale price if on sale, regular price otherwise)
    const basePrice = (product.onSale && product.salePrice)
      ? parseFloat(product.salePrice.toString())
      : parseFloat(product.price.toString())

    // 8. Min purchase check
    if (coupon.minPurchase && basePrice < parseFloat(coupon.minPurchase.toString())) {
      return NextResponse.json({ valid: false, error: "MIN_PURCHASE" })
    }

    // Calculate discount
    let discountAmount: number
    if (coupon.type === "percentage") {
      discountAmount = basePrice * (parseFloat(coupon.value.toString()) / 100)
    } else {
      // Fixed amount — check currency match
      if (coupon.currency && coupon.currency !== product.currency) {
        return NextResponse.json({ valid: false, error: "CURRENCY_MISMATCH" })
      }
      discountAmount = parseFloat(coupon.value.toString())
    }

    // Cap discount at base price - €0.50 (Stripe minimum)
    discountAmount = Math.min(discountAmount, basePrice - 0.50)
    discountAmount = Math.max(discountAmount, 0)

    const finalPrice = Math.max(basePrice - discountAmount, 0.50)

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toString(),
        currency: coupon.currency,
        allowOnSale: coupon.allowOnSale,
      },
      discount: {
        original: basePrice.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        final: finalPrice.toFixed(2),
        productCurrency: product.currency,
      },
    })
  } catch (error) {
    console.error("Error validating coupon:", error)
    return NextResponse.json(
      { valid: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
