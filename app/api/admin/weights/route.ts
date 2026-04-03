import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET() {
  try {
    const { error } = await requirePermissionApi("products", "view")
    if (error) return error

    const weights = await prisma.weight.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
      include: { _count: { select: { packages: true } } },
    })

    return NextResponse.json(weights)
  } catch (error) {
    console.error("Error fetching weights:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.label?.trim()) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 })
    }

    const existing = await prisma.weight.findUnique({ where: { label: data.label.trim() } })
    if (existing) {
      return NextResponse.json({ error: `A weight with label "${data.label}" already exists` }, { status: 400 })
    }

    const weight = await prisma.weight.create({
      data: {
        label: data.label.trim(),
        grams: data.grams ? parseInt(data.grams) : null,
        order: data.order ?? 0,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "weights", recordId: weight.id, recordTitle: weight.label }).catch(() => {})

    return NextResponse.json(weight, { status: 201 })
  } catch (error) {
    console.error("Error creating weight:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Weight ID required" }, { status: 400 })
    }

    const oldWeight = await prisma.weight.findUnique({ where: { id: data.id } })
    if (!oldWeight) {
      return NextResponse.json({ error: "Weight not found" }, { status: 404 })
    }

    if (data.label && data.label.trim() !== oldWeight.label) {
      const existing = await prisma.weight.findUnique({ where: { label: data.label.trim() } })
      if (existing) {
        return NextResponse.json({ error: `A weight with label "${data.label}" already exists` }, { status: 400 })
      }
    }

    const weight = await prisma.weight.update({
      where: { id: data.id },
      data: {
        label: data.label?.trim() ?? oldWeight.label,
        grams: data.grams !== undefined ? (data.grams ? parseInt(data.grams) : null) : oldWeight.grams,
        order: data.order ?? oldWeight.order,
      },
    })

    const fields = ["label", "grams", "order"]
    const details = getChangeDetails(oldWeight as Record<string, unknown>, weight as Record<string, unknown>, fields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "weights", recordId: weight.id, recordTitle: weight.label, details }).catch(() => {})

    return NextResponse.json(weight)
  } catch (error) {
    console.error("Error updating weight:", error instanceof Error ? error.message : "Unknown")
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
      await prisma.weight.update({ where: { id: item.id }, data: { order: item.order } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering weights:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Weight ID required" }, { status: 400 })
    }

    const weight = await prisma.weight.findUnique({
      where: { id },
      include: { _count: { select: { packages: true } } },
    })

    if (!weight) {
      return NextResponse.json({ error: "Weight not found" }, { status: 404 })
    }

    if (weight._count.packages > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this weight is used by ${weight._count.packages} package(s)` },
        { status: 400 }
      )
    }

    await prisma.weight.delete({ where: { id } })

    logAuditAction({ userId: session.user.id, action: "delete", resource: "weights", recordId: id, recordTitle: weight.label }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting weight:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
