import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const type = searchParams.get("type") // "admin_message" | "coupon" | "quote_offer"
    const status = searchParams.get("status") // "scheduled" | "delivered"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}

    if (type) {
      if (type === "auto") {
        where.type = { startsWith: "auto_" }
      } else {
        where.type = type
      }
    }

    // Status filter: scheduled (future) vs delivered (immediate or past)
    if (status === "scheduled") {
      where.scheduledAt = { gt: new Date() }
    } else if (status === "delivered") {
      where.OR = [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } },
      ]
    }

    if (search) {
      // If we already have OR from status filter, wrap in AND
      const searchConditions = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]
      if (where.OR) {
        where.AND = [{ OR: where.OR as unknown[] }, { OR: searchConditions }]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          coupon: {
            select: { id: true, code: true, type: true, value: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ])

    void session

    return NextResponse.json({
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "create")
    if (error) return error

    const body = await request.json()
    const { userIds, type, title, message, couponId, link, scheduledAt, couponExpiresAt } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "At least one user must be selected" }, { status: 400 })
    }

    if (!type || !title || !message) {
      return NextResponse.json({ error: "Type, title, and message are required" }, { status: 400 })
    }

    if (!["admin_message", "coupon"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'admin_message' or 'coupon'" }, { status: 400 })
    }

    if (type === "coupon" && !couponId) {
      return NextResponse.json({ error: "Coupon is required for coupon notifications" }, { status: 400 })
    }

    // Validate scheduledAt if provided
    let scheduledDate: Date | null = null
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt)
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled date" }, { status: 400 })
      }
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ error: "Scheduled date must be in the future" }, { status: 400 })
      }
    }

    // Validate coupon exists if provided
    if (couponId) {
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
      }
    }

    // Update coupon expiration if provided
    if (couponId && couponExpiresAt) {
      const expiresDate = new Date(couponExpiresAt)
      if (!isNaN(expiresDate.getTime()) && expiresDate > new Date()) {
        await prisma.coupon.update({
          where: { id: couponId },
          data: { expiresAt: expiresDate },
        })
      }
    }

    // Create notifications for each user
    let createdCount = 0
    for (const userId of userIds) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            couponId: couponId || null,
            link: link || null,
            scheduledAt: scheduledDate,
            createdById: session.user.id,
          },
        })
        createdCount++
      } catch {
        // Skip if user doesn't exist
      }
    }

    logAuditAction({
      userId: session.user.id,
      action: "create",
      resource: "notifications",
      recordId: "bulk",
      recordTitle: `${title} (${createdCount} recipients)`,
    }).catch(() => {})

    return NextResponse.json({ success: true, count: createdCount }, { status: 201 })
  } catch (error) {
    console.error("Error sending notifications:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "delete")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    await prisma.notification.delete({ where: { id } })

    logAuditAction({
      userId: session.user.id,
      action: "delete",
      resource: "notifications",
      recordId: notification.id,
      recordTitle: notification.title,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
