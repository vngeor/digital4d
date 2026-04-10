import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { buildProductUrlsBatch } from "@/lib/productUrl"
import { isProductEligibleForCoupon } from "@/lib/couponHelpers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    if (!productId) return NextResponse.json([])

    const excludeIdsRaw = searchParams.get("excludeIds")
    const excludeSet = new Set([
      productId,
      ...(excludeIdsRaw ? excludeIdsRaw.split(",").filter(Boolean) : []),
    ])

    // 1. Find the source product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { upsellProductIds: true, category: true },
    })
    if (!product) return NextResponse.json([])

    // 2. Fetch upsell products — 3-tier: per-product → global → same-category
    // Only show products that are purchasable in the upsell section
    const availableStatus = { in: ["in_stock", "pre_order"] }

    const include = {
      brand: { select: { slug: true, nameEn: true, nameBg: true, nameEs: true } },
      variants: {
        select: { image: true, status: true },
        orderBy: { order: "asc" as const },
      },
    }

    let related: Awaited<ReturnType<typeof prisma.product.findMany<{ include: typeof include }>>> = []

    // Tier 1: per-product manual picks
    if (product.upsellProductIds.length > 0) {
      related = await prisma.product.findMany({
        where: {
          id: { in: product.upsellProductIds.filter((id) => !excludeSet.has(id)) },
          published: true,
          status: availableStatus,
        },
        include,
        take: 4,
      })
    }

    // Tier 2: global upsell picks from SiteSettings
    if (!related.length) {
      const siteSettings = await prisma.siteSettings.findUnique({
        where: { id: "singleton" },
        select: { globalUpsellProductIds: true },
      })
      const globalIds = siteSettings?.globalUpsellProductIds ?? []
      if (globalIds.length > 0) {
        related = await prisma.product.findMany({
          where: {
            id: { in: globalIds.filter((id) => !excludeSet.has(id)) },
            published: true,
            status: availableStatus,
          },
          include,
          take: 4,
        })
      }
    }

    // Tier 3: same-category fallback
    if (!related.length) {
      related = await prisma.product.findMany({
        where: {
          category: product.category,
          published: true,
          status: availableStatus,
          id: { notIn: [...excludeSet] },
        },
        orderBy: [{ featured: "desc" }, { order: "asc" }],
        include,
        take: 4,
      })
    }

    // 3. Build URLs in batch
    const urlMap = await buildProductUrlsBatch(related)

    // 4. Coupon badge lookup for upsell cards (respects productIds, categoryIds, brandIds)
    const now = new Date()
    const [activeCoupons, allCategories] = await Promise.all([
      prisma.coupon.findMany({
        where: {
          active: true,
          showOnProduct: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { type: true, value: true, currency: true, productIds: true, categoryIds: true, brandIds: true, allowOnSale: true },
      }),
      prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } }),
    ])
    const couponMap: Record<string, { type: string; value: string; currency: string | null }> = {}
    for (const p of related) {
      const isOnSale = p.onSale && p.salePrice
      const brandId = (p as { brandId?: string | null }).brandId ?? null
      const c = activeCoupons.find(c =>
        !(isOnSale && !c.allowOnSale) &&
        isProductEligibleForCoupon(
          p.id,
          p.category,
          brandId,
          c.productIds ?? [],
          c.categoryIds ?? [],
          c.brandIds ?? [],
          allCategories
        )
      )
      if (c) couponMap[p.id] = { type: c.type, value: c.value.toString(), currency: c.currency }
    }

    // 5. Map response — Decimal → string, pick variant image
    return NextResponse.json(
      related.map((p) => ({
        id: p.id,
        slug: p.slug,
        nameEn: p.nameEn,
        nameBg: p.nameBg,
        nameEs: p.nameEs,
        image:
          p.variants.find((v) =>
            ["in_stock", "pre_order"].includes(v.status)
          )?.image ||
          p.image ||
          null,
        price: (p.price ?? 0).toString(),
        salePrice: p.salePrice?.toString() ?? null,
        onSale: p.onSale,
        currency: p.currency,
        priceType: p.priceType,
        fileType: p.fileType || "physical",
        status: p.status,
        productUrl: urlMap[p.id] || `/products/${p.slug}`,
        bestSeller: p.bestSeller,
        featured: p.featured,
        brandNameEn: p.brand?.nameEn ?? null,
        brandNameBg: p.brand?.nameBg ?? null,
        brandNameEs: p.brand?.nameEs ?? null,
        createdAt: p.createdAt.toISOString(),
        coupon: couponMap[p.id] ?? null,
        bulkDiscountTiers: (p as { bulkDiscountTiers?: string | null }).bulkDiscountTiers ?? null,
      }))
    )
  } catch {
    return NextResponse.json([]) // Graceful degradation — never 500 to client
  }
}
