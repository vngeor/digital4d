import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { rateLimit } from "@/lib/rateLimit"
import { isProductEligibleForCoupon } from "@/lib/couponHelpers"

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const { success } = await rateLimit(`coupon-cart:${ip}`, { limit: 10, windowMs: 60 * 1000 })
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

    // Currency check
    const cartCurrency = items[0]?.currency
    if (coupon.currency && coupon.currency !== cartCurrency) {
      return NextResponse.json({ valid: false, error: "CURRENCY_MISMATCH" })
    }

    // Eligible items — support productIds, categoryIds, and brandIds targeting
    const productInfoMap = new Map<string, { category: string; brandId: string | null }>()
    let allCategories: { id: string; slug: string; parentId: string | null }[] = []

    const needsProductInfo = (coupon.categoryIds?.length ?? 0) > 0 || (coupon.brandIds?.length ?? 0) > 0
    if (needsProductInfo) {
      const pids = items.map((i: { productId: string }) => i.productId)
      const [productRecords, cats] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: pids } }, select: { id: true, category: true, brandId: true } }),
        prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } }),
      ])
      for (const p of productRecords) productInfoMap.set(p.id, { category: p.category, brandId: p.brandId })
      allCategories = cats
    }

    const hasRestrictions =
      (coupon.productIds?.length ?? 0) > 0 ||
      (coupon.categoryIds?.length ?? 0) > 0 ||
      (coupon.brandIds?.length ?? 0) > 0

    let eligibleItems = items
    if (hasRestrictions) {
      eligibleItems = items.filter((item: { productId: string }) => {
        const info = productInfoMap.get(item.productId)
        return isProductEligibleForCoupon(
          item.productId,
          info?.category ?? "",
          info?.brandId ?? null,
          coupon.productIds ?? [],
          coupon.categoryIds ?? [],
          coupon.brandIds ?? [],
          allCategories
        )
      })
      if (eligibleItems.length === 0) {
        return NextResponse.json({ valid: false, error: "WRONG_PRODUCT" })
      }
    }

    // allowOnSale filter
    if (!coupon.allowOnSale) {
      eligibleItems = eligibleItems.filter((item: { onSale?: boolean }) => !item.onSale)
      if (eligibleItems.length === 0) {
        return NextResponse.json({ valid: false, error: "ON_SALE" })
      }
    }

    // Fetch real prices from DB
    const eligibleProductIds: string[] = []
    let eligibleSubtotal = 0

    for (const item of eligibleItems) {
      const { productId, packageId, quantity = 1 } = item as {
        productId: string; packageId?: string | null; quantity?: number
      }

      let effectivePrice = 0

      if (packageId) {
        const pkg = await prisma.productPackage.findUnique({
          where: { id: packageId },
          select: { price: true, salePrice: true },
        })
        if (pkg) {
          effectivePrice = pkg.salePrice ? Number(pkg.salePrice) : Number(pkg.price)
        }
      } else {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { price: true, salePrice: true },
        })
        if (product) {
          effectivePrice = product.salePrice ? Number(product.salePrice) : Number(product.price)
        }
      }

      eligibleSubtotal += effectivePrice * quantity
      eligibleProductIds.push(productId)
    }

    // minPurchase check
    if (coupon.minPurchase && eligibleSubtotal < Number(coupon.minPurchase)) {
      return NextResponse.json({
        valid: false,
        error: "MIN_PURCHASE",
        minPurchase: Number(coupon.minPurchase),
      })
    }

    // Discount calculation
    let discountAmount = 0
    if (coupon.type === "percentage") {
      discountAmount = Math.round(eligibleSubtotal * (Number(coupon.value) / 100) * 100) / 100
    } else {
      // fixed — never reduce below €0.50
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
