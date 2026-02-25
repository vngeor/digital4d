import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("content", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    const content = await prisma.content.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        menuItem: {
          select: {
            id: true,
            slug: true,
            titleEn: true,
          }
        }
      }
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error("Error fetching content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("content", "create")
    if (error) return error

    const data = await request.json()

    // Check for duplicate slug
    if (data.slug) {
      const existing = await prisma.content.findUnique({ where: { slug: data.slug } })
      if (existing) {
        const status = existing.published ? "published" : "draft"
        return NextResponse.json(
          { error: `Content with slug "${data.slug}" already exists (type: ${existing.type}, ${status}). Check the "${existing.type}" filter tab.` },
          { status: 400 }
        )
      }
    }

    const content = await prisma.content.create({
      data: {
        type: data.type,
        slug: data.slug || null,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        bodyBg: data.bodyBg || null,
        bodyEn: data.bodyEn || null,
        bodyEs: data.bodyEs || null,
        image: data.image || null,
        published: data.published || false,
        order: data.order || 0,
        menuItemId: data.menuItemId || null,
      },
    })

    // Fetch menuItem separately if needed to avoid implicit transaction
    // (Neon HTTP mode doesn't support transactions)
    let menuItem = null
    if (data.menuItemId) {
      menuItem = await prisma.menuItem.findUnique({
        where: { id: data.menuItemId },
        select: { id: true, slug: true, titleEn: true }
      })
    }

    return NextResponse.json({ ...content, menuItem }, { status: 201 })
  } catch (error) {
    console.error("Error creating content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("content", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 })
    }

    // Check for duplicate slug (if changing)
    if (data.slug) {
      const existing = await prisma.content.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: data.id }
        }
      })
      if (existing) {
        const status = existing.published ? "published" : "draft"
        return NextResponse.json(
          { error: `Content with slug "${data.slug}" already exists (type: ${existing.type}, ${status}). Check the "${existing.type}" filter tab.` },
          { status: 400 }
        )
      }
    }

    const content = await prisma.content.update({
      where: { id: data.id },
      data: {
        type: data.type,
        slug: data.slug || null,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        bodyBg: data.bodyBg || null,
        bodyEn: data.bodyEn || null,
        bodyEs: data.bodyEs || null,
        image: data.image || null,
        published: data.published,
        order: data.order,
        menuItemId: data.menuItemId || null,
      },
    })

    // Fetch menuItem separately to avoid implicit transaction
    // (Neon HTTP mode doesn't support transactions)
    let menuItem = null
    if (data.menuItemId) {
      menuItem = await prisma.menuItem.findUnique({
        where: { id: data.menuItemId },
        select: { id: true, slug: true, titleEn: true }
      })
    }

    return NextResponse.json({ ...content, menuItem })
  } catch (error) {
    console.error("Error updating content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Bulk update order
export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("content", "edit")
    if (error) return error

    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array required" }, { status: 400 })
    }

    // Update all items (Neon HTTP mode doesn't support transactions, so update one by one)
    for (const item of items) {
      await prisma.content.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("content", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 })
    }

    await prisma.content.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
