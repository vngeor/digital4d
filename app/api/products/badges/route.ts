import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { isProductEligibleForCoupon } from "@/lib/couponHelpers"

/**
 * GET /api/products/badges?ids=id1,id2,...
 * Returns a coupon badge map { [productId]: { type, value, currency } | null }
 * Used by client-side sections (Recently Viewed) that can't fetch coupons server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get("ids")
    if (!idsParam) return NextResponse.json({})

    const ids = idsParam.split(",").filter(Boolean).slice(0, 20) // max 20 products
    if (ids.length === 0) return NextResponse.json({})

    const now = new Date()

    const [products, promotedCoupons, allCategories] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, category: true, brandId: true, onSale: true, salePrice: true },
      }),
      prisma.coupon.findMany({
        where: {
          showOnProduct: true,
          active: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        select: {
          type: true,
          value: true,
          currency: true,
          productIds: true,
          categoryIds: true,
          brandIds: true,
          allowOnSale: true,
          expiresAt: true,
        },
      }),
      prisma.productCategory.findMany({
        select: { id: true, slug: true, parentId: true },
      }),
    ])

    const result: Record<string, { type: string; value: string; currency: string | null } | null> = {}

    for (const p of products) {
      const isOnSale = p.onSale && p.salePrice
      const eligible = promotedCoupons.find(c =>
        !(isOnSale && !c.allowOnSale) &&
        isProductEligibleForCoupon(
          p.id,
          p.category,
          p.brandId,
          c.productIds ?? [],
          c.categoryIds ?? [],
          c.brandIds ?? [],
          allCategories
        )
      )
      result[p.id] = eligible
        ? { type: eligible.type, value: eligible.value.toString(), currency: eligible.currency }
        : null
    }

    // Products not found in DB get null
    for (const id of ids) {
      if (!(id in result)) result[id] = null
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch {
    return NextResponse.json({})
  }
}
