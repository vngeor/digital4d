import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET() {
  try {
    const { error } = await requirePermissionApi("products", "view")
    if (error) return error

    const colors = await prisma.color.findMany({
      orderBy: [{ order: "asc" }, { nameEn: "asc" }],
      include: { _count: { select: { variants: true } } },
    })

    return NextResponse.json(colors)
  } catch (error) {
    console.error("Error fetching colors:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.nameEn?.trim() || !data.nameBg?.trim() || !data.nameEs?.trim()) {
      return NextResponse.json({ error: "All language names are required" }, { status: 400 })
    }
    if (!data.hex?.trim()) {
      return NextResponse.json({ error: "Hex color is required" }, { status: 400 })
    }

    const color = await prisma.color.create({
      data: {
        nameBg: data.nameBg.trim(),
        nameEn: data.nameEn.trim(),
        nameEs: data.nameEs.trim(),
        hex: data.hex.trim(),
        order: data.order ?? 0,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "colors", recordId: color.id, recordTitle: color.nameEn }).catch(() => {})

    return NextResponse.json(color, { status: 201 })
  } catch (error) {
    console.error("Error creating color:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Color ID required" }, { status: 400 })
    }

    const oldColor = await prisma.color.findUnique({ where: { id: data.id } })
    if (!oldColor) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 })
    }

    const color = await prisma.color.update({
      where: { id: data.id },
      data: {
        nameBg: data.nameBg?.trim() ?? oldColor.nameBg,
        nameEn: data.nameEn?.trim() ?? oldColor.nameEn,
        nameEs: data.nameEs?.trim() ?? oldColor.nameEs,
        hex: data.hex?.trim() ?? oldColor.hex,
        order: data.order ?? oldColor.order,
      },
    })

    const fields = ["nameBg", "nameEn", "nameEs", "hex", "order"]
    const details = getChangeDetails(oldColor as Record<string, unknown>, color as Record<string, unknown>, fields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "colors", recordId: color.id, recordTitle: color.nameEn, details }).catch(() => {})

    return NextResponse.json(color)
  } catch (error) {
    console.error("Error updating color:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const { items } = await request.json()
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array required" }, { status: 400 })
    }

    for (const item of items) {
      await prisma.color.update({ where: { id: item.id }, data: { order: item.order } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering colors:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Color ID required" }, { status: 400 })
    }

    const color = await prisma.color.findUnique({
      where: { id },
      include: { _count: { select: { variants: true } } },
    })

    if (!color) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 })
    }

    if (color._count.variants > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this color is used by ${color._count.variants} variant(s)` },
        { status: 400 }
      )
    }

    await prisma.color.delete({ where: { id } })

    logAuditAction({ userId: session.user.id, action: "delete", resource: "colors", recordId: id, recordTitle: color.nameEn }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting color:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
