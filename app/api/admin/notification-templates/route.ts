import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (id) {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { sendLogs: true },
          },
        },
      })

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }

      return NextResponse.json(template)
    }

    const templates = await prisma.notificationTemplate.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { sendLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    void session

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching notification templates:", error)
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

    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.trigger || !data.titleBg || !data.titleEn || !data.titleEs || !data.messageBg || !data.messageEn || !data.messageEs) {
      return NextResponse.json({ error: "Name, trigger, title, and message in all languages are required" }, { status: 400 })
    }

    const validTriggers = ["birthday", "christmas", "new_year", "orthodox_easter", "custom_date"]
    if (!validTriggers.includes(data.trigger)) {
      return NextResponse.json({ error: "Invalid trigger type" }, { status: 400 })
    }

    if (data.trigger === "custom_date" && (!data.customMonth || !data.customDay)) {
      return NextResponse.json({ error: "Custom date requires month and day" }, { status: 400 })
    }

    if (data.couponEnabled && (!data.couponType || !data.couponValue)) {
      return NextResponse.json({ error: "Coupon type and value are required when coupon is enabled" }, { status: 400 })
    }

    if (data.couponEnabled && data.couponType === "fixed" && !data.couponCurrency) {
      return NextResponse.json({ error: "Currency is required for fixed coupon type" }, { status: 400 })
    }

    // Ensure numeric values are properly typed for Prisma Decimal fields
    const couponValue = data.couponEnabled && data.couponValue != null ? Number(data.couponValue) : null
    const couponMinPurchase = data.couponEnabled && data.couponMinPurchase != null ? Number(data.couponMinPurchase) : null

    // Create without include to avoid Neon HTTP transaction limitation
    const created = await prisma.notificationTemplate.create({
      data: {
        name: data.name,
        trigger: data.trigger,
        daysBefore: typeof data.daysBefore === "number" ? data.daysBefore : 0,
        customMonth: data.trigger === "custom_date" ? data.customMonth : null,
        customDay: data.trigger === "custom_date" ? data.customDay : null,
        recurring: data.recurring !== false,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        messageBg: data.messageBg,
        messageEn: data.messageEn,
        messageEs: data.messageEs,
        link: data.link || null,
        couponEnabled: data.couponEnabled || false,
        couponType: data.couponEnabled ? data.couponType : null,
        couponValue: isNaN(couponValue as number) ? null : couponValue,
        couponCurrency: data.couponEnabled ? (data.couponCurrency || null) : null,
        couponDuration: data.couponEnabled ? (data.couponDuration || 30) : null,
        couponPerUser: data.couponEnabled ? (data.couponPerUser || 1) : 1,
        couponProductIds: data.couponEnabled ? (data.couponProductIds || []) : [],
        couponAllowOnSale: data.couponEnabled ? (data.couponAllowOnSale || false) : false,
        couponMinPurchase: isNaN(couponMinPurchase as number) ? null : couponMinPurchase,
        couponExpiryMode: data.couponEnabled ? (data.couponExpiryMode || "duration") : null,
        couponExpiresAt: data.couponEnabled && data.couponExpiryMode === "date" && data.couponExpiresAt ? new Date(data.couponExpiresAt) : null,
        active: data.active !== false,
        createdById: session.user.id,
      },
    })

    // Fetch with relations separately (Neon HTTP doesn't support transactions in create+include)
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: created.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { sendLogs: true },
        },
      },
    })

    logAuditAction({
      userId: session.user.id,
      action: "create",
      resource: "notifications",
      recordId: created.id,
      recordTitle: `Template: ${created.name}`,
    }).catch(() => {})

    return NextResponse.json(template ?? created, { status: 201 })
  } catch (error) {
    console.error("Error creating notification template:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    const existing = await prisma.notificationTemplate.findUnique({ where: { id: data.id } })
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Validate trigger if provided
    if (data.trigger) {
      const validTriggers = ["birthday", "christmas", "new_year", "orthodox_easter", "custom_date"]
      if (!validTriggers.includes(data.trigger)) {
        return NextResponse.json({ error: "Invalid trigger type" }, { status: 400 })
      }
    }

    const trigger = data.trigger || existing.trigger

    if (trigger === "custom_date" && data.customMonth !== undefined && data.customDay !== undefined) {
      if (!data.customMonth || !data.customDay) {
        return NextResponse.json({ error: "Custom date requires month and day" }, { status: 400 })
      }
    }

    const couponEnabled = data.couponEnabled !== undefined ? data.couponEnabled : existing.couponEnabled

    if (couponEnabled && data.couponType !== undefined && !data.couponType) {
      return NextResponse.json({ error: "Coupon type is required when coupon is enabled" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    // Basic fields
    if (data.name !== undefined) updateData.name = data.name
    if (data.trigger !== undefined) updateData.trigger = data.trigger
    if (data.daysBefore !== undefined) updateData.daysBefore = data.daysBefore
    if (data.recurring !== undefined) updateData.recurring = data.recurring
    if (data.titleBg !== undefined) updateData.titleBg = data.titleBg
    if (data.titleEn !== undefined) updateData.titleEn = data.titleEn
    if (data.titleEs !== undefined) updateData.titleEs = data.titleEs
    if (data.messageBg !== undefined) updateData.messageBg = data.messageBg
    if (data.messageEn !== undefined) updateData.messageEn = data.messageEn
    if (data.messageEs !== undefined) updateData.messageEs = data.messageEs
    if (data.link !== undefined) updateData.link = data.link || null
    if (data.active !== undefined) updateData.active = data.active

    // Custom date fields
    if (trigger === "custom_date") {
      if (data.customMonth !== undefined) updateData.customMonth = data.customMonth
      if (data.customDay !== undefined) updateData.customDay = data.customDay
    } else {
      updateData.customMonth = null
      updateData.customDay = null
    }

    // Coupon fields
    if (data.couponEnabled !== undefined) updateData.couponEnabled = data.couponEnabled
    if (couponEnabled) {
      if (data.couponType !== undefined) updateData.couponType = data.couponType
      if (data.couponValue !== undefined) updateData.couponValue = data.couponValue
      if (data.couponCurrency !== undefined) updateData.couponCurrency = data.couponCurrency
      if (data.couponDuration !== undefined) updateData.couponDuration = data.couponDuration
      if (data.couponPerUser !== undefined) updateData.couponPerUser = data.couponPerUser
      if (data.couponProductIds !== undefined) updateData.couponProductIds = data.couponProductIds
      if (data.couponAllowOnSale !== undefined) updateData.couponAllowOnSale = data.couponAllowOnSale
      if (data.couponMinPurchase !== undefined) updateData.couponMinPurchase = data.couponMinPurchase
      if (data.couponExpiryMode !== undefined) updateData.couponExpiryMode = data.couponExpiryMode
      if (data.couponExpiresAt !== undefined) updateData.couponExpiresAt = data.couponExpiresAt ? new Date(data.couponExpiresAt) : null
    } else if (data.couponEnabled === false) {
      updateData.couponType = null
      updateData.couponValue = null
      updateData.couponCurrency = null
      updateData.couponDuration = null
      updateData.couponPerUser = 1
      updateData.couponProductIds = []
      updateData.couponAllowOnSale = false
      updateData.couponMinPurchase = null
      updateData.couponExpiryMode = null
      updateData.couponExpiresAt = null
    }

    // Update without include to avoid Neon HTTP transaction limitation
    await prisma.notificationTemplate.update({
      where: { id: data.id },
      data: updateData,
    })

    // Fetch with relations separately
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: data.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { sendLogs: true },
        },
      },
    })

    logAuditAction({
      userId: session.user.id,
      action: "edit",
      resource: "notifications",
      recordId: data.id,
      recordTitle: `Template: ${template?.name ?? data.name}`,
    }).catch(() => {})

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating notification template:", error)
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
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    const template = await prisma.notificationTemplate.findUnique({ where: { id } })
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await prisma.notificationTemplate.delete({ where: { id } })

    logAuditAction({
      userId: session.user.id,
      action: "delete",
      resource: "notifications",
      recordId: id,
      recordTitle: `Template: ${template.name}`,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification template:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
