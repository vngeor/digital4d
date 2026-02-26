import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET() {
  try {
    const { session, error } = await requirePermissionApi("types", "view")
    if (error) return error

    const types = await prisma.contentType.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json(types)
  } catch (error) {
    console.error("Error fetching types:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("types", "create")
    if (error) return error

    const data = await request.json()

    // Check for existing slug
    const existing = await prisma.contentType.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A type with slug "${data.slug}" already exists.` },
        { status: 400 }
      )
    }

    const contentType = await prisma.contentType.create({
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        color: data.color || "purple",
        order: data.order || 0,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "types", recordId: contentType.id, recordTitle: contentType.nameEn }).catch(() => {})

    return NextResponse.json(contentType, { status: 201 })
  } catch (error) {
    console.error("Error creating type:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("types", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
    }

    // Fetch old record for change tracking
    const oldType = await prisma.contentType.findUnique({ where: { id: data.id } })
    if (!oldType) {
      return NextResponse.json({ error: "Type not found" }, { status: 404 })
    }

    // Check for duplicate slug
    if (data.slug) {
      const existing = await prisma.contentType.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: data.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: `A type with slug "${data.slug}" already exists.` },
          { status: 400 }
        )
      }
    }

    const contentType = await prisma.contentType.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        color: data.color,
        order: data.order,
      },
    })

    const typeFields = ["slug", "nameBg", "nameEn", "nameEs", "descBg", "descEn", "descEs", "color", "order"]
    const details = getChangeDetails(oldType as Record<string, unknown>, contentType as Record<string, unknown>, typeFields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "types", recordId: contentType.id, recordTitle: contentType.nameEn, details }).catch(() => {})

    return NextResponse.json(contentType)
  } catch (error) {
    console.error("Error updating type:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("types", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
    }

    await prisma.contentType.delete({
      where: { id },
    })

    logAuditAction({ userId: session.user.id, action: "delete", resource: "types", recordId: id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting type:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
