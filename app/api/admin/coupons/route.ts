import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("coupons", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status") // "active" | "expired" | "inactive" | null (all)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}

    if (search) {
      where.code = { contains: search.toUpperCase(), mode: "insensitive" }
    }

    if (status === "active") {
      where.active = true
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ]
    } else if (status === "expired") {
      where.expiresAt = { lte: new Date() }
    } else if (status === "inactive") {
      where.active = false
    }

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

    // Attach product names to each coupon
    const couponsWithProducts = coupons.map(c => ({
      ...c,
      value: c.value.toString(),
      minPurchase: c.minPurchase?.toString() || null,
      productNames: c.productIds.map(id => productMap[id] || "Unknown").filter(Boolean),
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
    console.error("Error fetching coupons:", error)
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
      perUserLimit, productIds, allowOnSale, active, startsAt, expiresAt,
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
        perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
        productIds: productIds || [],
        allowOnSale: allowOnSale ?? false,
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

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    console.error("Error creating coupon:", error)
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
      perUserLimit, productIds, allowOnSale, active, startsAt, expiresAt,
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
        allowOnSale: allowOnSale !== undefined ? allowOnSale : undefined,
        active: active !== undefined ? active : undefined,
        startsAt: startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
    })

    const trackFields = ["type", "value", "currency", "minPurchase", "maxUses", "perUserLimit", "productIds", "allowOnSale", "active", "startsAt", "expiresAt"]
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating coupon:", error)
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
    console.error("Error deleting coupon:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
