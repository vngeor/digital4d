import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`coupon-cart:${ip}`, { limit: 10, windowMs: 60 * 1000 })
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { code, items } = body

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ valid: false, error: "INVALID_CODE" }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ valid: false, error: "NO_ITEMS" }, { status: 400 })
    }

    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), active: true },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "INVALID" })
    }

    const now = new Date()
    if (coupon.startsAt && coupon.startsAt > now) {
      return NextResponse.json({ valid: false, error: "INVALID" })
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return NextResponse.json({ valid: false, error: "EXPIRED" })
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "INVALID" })
    }

    const cartCurrency = items[0]?.currency as string
    if (coupon.currency && coupon.currency !== cartCurrency) {
      return NextResponse.json({ valid: false, error: "CURRENCY_MISMATCH" })
    }

    type InputItem = { productId: string; packageId?: string | null; onSale?: boolean; currency: string; quantity: number }
    let eligibleItems: InputItem[] = [...items] as InputItem[]

    if (coupon.productIds && coupon.productIds.length > 0) {
      eligibleItems = eligibleItems.filter(item => coupon.productIds.includes(item.productId))
      if (eligibleItems.length === 0) {
        return NextResponse.json({ valid: false, error: "WRONG_PRODUCT" })
      }
    }

    if (!coupon.allowOnSale) {
      eligibleItems = eligibleItems.filter(item => !item.onSale)
      if (eligibleItems.length === 0) {
        return NextResponse.json({ valid: false, error: "ON_SALE" })
      }
    }

    const eligibleProductIds: string[] = []
    let eligibleSubtotal = 0

    for (const item of eligibleItems) {
      const { productId, packageId, quantity = 1 } = item
      let effectivePrice = 0

      if (packageId) {
        const pkg = await prisma.productPackage.findUnique({
          where: { id: packageId },
          select: { price: true, salePrice: true },
        })
        if (pkg) effectivePrice = pkg.salePrice ? Number(pkg.salePrice) : Number(pkg.price)
      } else {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { price: true, salePrice: true },
        })
        if (product) effectivePrice = product.salePrice ? Number(product.salePrice) : Number(product.price)
      }

      eligibleSubtotal += effectivePrice * quantity
      eligibleProductIds.push(productId)
    }

    if (coupon.minPurchase && eligibleSubtotal < Number(coupon.minPurchase)) {
      return NextResponse.json({
        valid: false,
        error: "MIN_PURCHASE",
        minPurchase: Number(coupon.minPurchase),
      })
    }

    let discountAmount = 0
    if (coupon.type === "percentage") {
      discountAmount = Math.round(eligibleSubtotal * (Number(coupon.value) / 100) * 100) / 100
    } else {
      discountAmount = Math.min(Number(coupon.value), eligibleSubtotal - 0.5)
      if (discountAmount <= 0) {
        return NextResponse.json({ valid: false, error: "WRONG_PRODUCT" })
      }
      discountAmount = Math.round(discountAmount * 100) / 100
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      currency: coupon.currency ?? cartCurrency,
      discountAmount,
      eligibleProductIds,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
