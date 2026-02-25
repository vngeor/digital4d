import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting type:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
