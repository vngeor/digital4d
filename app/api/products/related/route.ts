import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { buildProductUrlsBatch } from "@/lib/productUrl"

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
    const include = {
      brand: { select: { slug: true, nameEn: true, nameBg: true, nameEs: true } },
      variants: {
        select: { image: true, status: true },
        orderBy: { order: "asc" as const },
      },
    }

    let related: Awaited<ReturnType<typeof prisma.product.findMany<{ include: typeof include }>>> = []

    // Only show products that are purchasable in the upsell section
    const availableStatus = { in: ["in_stock", "pre_order"] }

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

    // 4. Coupon badge lookup for upsell cards
    const now = new Date()
    const activeCoupons = await prisma.coupon.findMany({
      where: {
        active: true,
        showOnProduct: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { type: true, value: true, currency: true, productIds: true },
    })
    const relatedIds = related.map(p => p.id)
    const couponMap: Record<string, { type: string; value: string; currency: string | null }> = {}
    for (const id of relatedIds) {
      const c = activeCoupons.find(c => c.productIds.length === 0 || c.productIds.includes(id))
      if (c) couponMap[id] = { type: c.type, value: c.value.toString(), currency: c.currency }
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
        bulkDiscountTiers: p.bulkDiscountTiers ?? null,
      }))
    )
  } catch {
    return NextResponse.json([]) // Graceful degradation — never 500 to client
  }
}
