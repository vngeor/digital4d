import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"
import { notifyWishlistCoupon } from "@/lib/wishlistNotifications"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("coupons", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status") // "active" | "expired" | "inactive" | null (all)
    const source = searchParams.get("source") // "auto" | null
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = []

    if (search) {
      conditions.push({ code: { contains: search.toUpperCase(), mode: "insensitive" } })
    }

    if (status === "active") {
      conditions.push({ active: true })
      conditions.push({
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      })
    } else if (status === "expired") {
      conditions.push({ expiresAt: { lte: new Date() } })
    } else if (status === "inactive") {
      conditions.push({ active: false })
    }

    // Filter by source: auto-generated coupons have known prefixes
    if (source === "auto") {
      conditions.push({
        OR: [
          { code: { startsWith: "BDAY-" } },
          { code: { startsWith: "XMAS-" } },
          { code: { startsWith: "NEWYEAR-" } },
          { code: { startsWith: "EASTER-" } },
          { code: { startsWith: "TMPL-" } },
        ],
      })
    }

    const where: Record<string, unknown> = conditions.length > 0 ? { AND: conditions } : {}

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { usages: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ])

    // Fetch product names for coupons that have productIds
    const allProductIds = coupons.flatMap(c => c.productIds)
    const uniqueProductIds = [...new Set(allProductIds)]
    let productMap: Record<string, string> = {}

    if (uniqueProductIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        select: { id: true, nameEn: true },
      })
      productMap = Object.fromEntries(products.map(p => [p.id, p.nameEn]))
    }

    // Build category and brand name maps
    const allCatSlugs = [...new Set(coupons.flatMap(c => c.categoryIds ?? []))]
    let categoryNameMap: Record<string, string> = {}
    if (allCatSlugs.length > 0) {
      const cats = await prisma.productCategory.findMany({ where: { slug: { in: allCatSlugs } }, select: { slug: true, nameEn: true } })
      categoryNameMap = Object.fromEntries(cats.map(c => [c.slug, c.nameEn]))
    }
    const allBrandIds = [...new Set(coupons.flatMap(c => c.brandIds ?? []))]
    let brandNameMap: Record<string, string> = {}
    if (allBrandIds.length > 0) {
      const brands = await prisma.brand.findMany({ where: { id: { in: allBrandIds } }, select: { id: true, nameEn: true } })
      brandNameMap = Object.fromEntries(brands.map(b => [b.id, b.nameEn]))
    }

    // Attach product, category, and brand names to each coupon
    const couponsWithProducts = coupons.map(c => ({
      ...c,
      value: c.value.toString(),
      minPurchase: c.minPurchase?.toString() || null,
      productNames: c.productIds.map(id => productMap[id] || "Unknown").filter(Boolean),
      categoryNames: (c.categoryIds ?? []).map(slug => categoryNameMap[slug] || slug),
      brandNames: (c.brandIds ?? []).map(id => brandNameMap[id] || id),
    }))

    void session

    return NextResponse.json({
      coupons: couponsWithProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching coupons:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("coupons", "create")
    if (error) return error

    const body = await request.json()
    const {
      code, type, value, currency, minPurchase, maxUses,
      perUserLimit, productIds, categoryIds, brandIds, allowOnSale, showOnProduct, active, startsAt, expiresAt,
    } = body

    if (!code || !type || value === undefined || value === null) {
      return NextResponse.json({ error: "Code, type, and value are required" }, { status: 400 })
    }

    if (!["percentage", "fixed"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'percentage' or 'fixed'" }, { status: 400 })
    }

    if (type === "percentage" && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
      return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 })
    }

    if (type === "fixed" && !currency) {
      return NextResponse.json({ error: "Currency is required for fixed amount coupons" }, { status: 400 })
    }

    const upperCode = code.toUpperCase().trim()

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({ where: { code: upperCode } })
    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: upperCode,
        type,
        value: parseFloat(value),
        currency: type === "fixed" ? currency : null,
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        perUserLimit: (perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== "") ? parseInt(perUserLimit) : 1,
        productIds: productIds || [],
        categoryIds: categoryIds ?? [],
        brandIds: brandIds ?? [],
        allowOnSale: allowOnSale ?? false,
        showOnProduct: showOnProduct ?? false,
        active: active ?? true,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.user.id,
      },
    })

    logAuditAction({
      userId: session.user.id,
      action: "create",
      resource: "coupons",
      recordId: coupon.id,
      recordTitle: coupon.code,
    }).catch(() => {})

    // Notify wishlist users if coupon is active
    if (coupon.active) {
      let notifyProductIds = coupon.productIds
      if (notifyProductIds.length === 0 && (coupon.categoryIds.length > 0 || coupon.brandIds.length > 0)) {
        const whereClauses: Array<{ category?: { in: string[] }; brandId?: { in: string[] } }> = []
        if (coupon.categoryIds.length > 0) {
          const allCats = await prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } })
          const targetSlugs = new Set<string>()
          for (const slug of coupon.categoryIds) {
            targetSlugs.add(slug)
            allCats.forEach(c => {
              const parent = allCats.find(p => p.id === c.parentId)
              if (parent?.slug === slug) targetSlugs.add(c.slug)
            })
          }
          whereClauses.push({ category: { in: [...targetSlugs] } })
        }
        if (coupon.brandIds.length > 0) whereClauses.push({ brandId: { in: coupon.brandIds } })
        const prods = await prisma.product.findMany({ where: { OR: whereClauses }, select: { id: true } })
        notifyProductIds = prods.map(p => p.id)
      }
      notifyWishlistCoupon(
        coupon.id,
        coupon.code,
        coupon.type,
        parseFloat(coupon.value.toString()),
        coupon.currency,
        notifyProductIds
      ).catch((err) => console.error("Failed to send wishlist coupon notifications:", err instanceof Error ? err.message : "Unknown"))
    }

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    console.error("Error creating coupon:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("coupons", "edit")
    if (error) return error

    const body = await request.json()
    const {
      id, type, value, currency, minPurchase, maxUses,
      perUserLimit, productIds, categoryIds, brandIds, allowOnSale, showOnProduct, active, startsAt, expiresAt,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 })
    }

    const oldCoupon = await prisma.coupon.findUnique({ where: { id } })
    if (!oldCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    if (type === "fixed" && !currency) {
      return NextResponse.json({ error: "Currency is required for fixed amount coupons" }, { status: 400 })
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        type: type || oldCoupon.type,
        value: value !== undefined ? parseFloat(value) : undefined,
        currency: type === "fixed" ? currency : null,
        minPurchase: minPurchase !== undefined ? (minPurchase ? parseFloat(minPurchase) : null) : undefined,
        maxUses: maxUses !== undefined ? (maxUses ? parseInt(maxUses) : null) : undefined,
        perUserLimit: perUserLimit !== undefined ? parseInt(perUserLimit) : undefined,
        productIds: productIds !== undefined ? productIds : undefined,
        categoryIds: categoryIds !== undefined ? categoryIds : undefined,
        brandIds: brandIds !== undefined ? brandIds : undefined,
        allowOnSale: allowOnSale !== undefined ? allowOnSale : undefined,
        showOnProduct: showOnProduct !== undefined ? showOnProduct : undefined,
        active: active !== undefined ? active : undefined,
        startsAt: startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
    })

    const trackFields = ["type", "value", "currency", "minPurchase", "maxUses", "perUserLimit", "productIds", "categoryIds", "brandIds", "allowOnSale", "showOnProduct", "active", "startsAt", "expiresAt"]
    const details = getChangeDetails(
      oldCoupon as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      trackFields
    )
    logAuditAction({
      userId: session.user.id,
      action: "edit",
      resource: "coupons",
      recordId: updated.id,
      recordTitle: updated.code,
      details,
    }).catch(() => {})

    // Notify wishlist users if coupon was just activated
    if (!oldCoupon.active && updated.active) {
      let notifyProductIds = updated.productIds
      if (notifyProductIds.length === 0 && (updated.categoryIds.length > 0 || updated.brandIds.length > 0)) {
        const whereClauses: Array<{ category?: { in: string[] }; brandId?: { in: string[] } }> = []
        if (updated.categoryIds.length > 0) {
          const allCats = await prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } })
          const targetSlugs = new Set<string>()
          for (const slug of updated.categoryIds) {
            targetSlugs.add(slug)
            allCats.forEach(c => {
              const parent = allCats.find(p => p.id === c.parentId)
              if (parent?.slug === slug) targetSlugs.add(c.slug)
            })
          }
          whereClauses.push({ category: { in: [...targetSlugs] } })
        }
        if (updated.brandIds.length > 0) whereClauses.push({ brandId: { in: updated.brandIds } })
        const prods = await prisma.product.findMany({ where: { OR: whereClauses }, select: { id: true } })
        notifyProductIds = prods.map(p => p.id)
      }
      notifyWishlistCoupon(
        updated.id,
        updated.code,
        updated.type,
        parseFloat(updated.value.toString()),
        updated.currency,
        notifyProductIds
      ).catch((err) => console.error("Failed to send wishlist coupon notifications:", err instanceof Error ? err.message : "Unknown"))
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating coupon:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("coupons", "delete")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 })
    }

    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    if (coupon.usedCount > 0) {
      return NextResponse.json(
        { error: "Coupon has been used and cannot be deleted", usedCount: coupon.usedCount },
        { status: 409 }
      )
    }

    await prisma.coupon.delete({ where: { id } })

    logAuditAction({
      userId: session.user.id,
      action: "delete",
      resource: "coupons",
      recordId: coupon.id,
      recordTitle: coupon.code,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting coupon:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
