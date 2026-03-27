import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"

export async function GET() {
  try {
    const { session, error } = await requirePermissionApi("categories", "view")
    if (error) return error

    const categories = await prisma.productCategory.findMany({
      include: { children: true, parent: true },
      orderBy: [{ order: "asc" }, { nameBg: "asc" }],
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("categories", "create")
    if (error) return error

    const data = await request.json()

    // Check for existing slug
    const existing = await prisma.productCategory.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A category with slug "${data.slug}" already exists.` },
        { status: 400 }
      )
    }

    const category = await prisma.productCategory.create({
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        image: data.image || null,
        color: data.color || "emerald",
        order: data.order || 0,
        parentId: data.parentId || null,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("categories", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 })
    }

    // Fetch current category to detect slug changes
    const current = await prisma.productCategory.findUnique({
      where: { id: data.id },
      select: { slug: true },
    })

    // Prevent circular parent references
    if (data.parentId) {
      if (data.parentId === data.id) {
        return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 })
      }
      const children = await prisma.productCategory.findMany({
        where: { parentId: data.id },
        select: { id: true },
      })
      if (children.some(c => c.id === data.parentId)) {
        return NextResponse.json({ error: "Cannot set a subcategory as parent" }, { status: 400 })
      }
    }

    // Check for duplicate slug
    if (data.slug) {
      const existing = await prisma.productCategory.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: data.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: `A category with slug "${data.slug}" already exists.` },
          { status: 400 }
        )
      }
    }

    const category = await prisma.productCategory.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        image: data.image || null,
        color: data.color || "emerald",
        order: data.order || 0,
        parentId: data.parentId || null,
      },
    })

    // Cascade slug change to all products referencing the old slug
    if (current && data.slug && current.slug !== data.slug) {
      const updated = await prisma.product.updateMany({
        where: { category: current.slug },
        data: { category: data.slug },
      })
      if (updated.count > 0) {
        console.log(`[Categories] Cascaded slug change "${current.slug}" → "${data.slug}" to ${updated.count} product(s)`)
      }
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error updating category:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("categories", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 })
    }

    // Prevent deletion of parent categories with children
    const children = await prisma.productCategory.findMany({
      where: { parentId: id },
      select: { id: true },
    })
    if (children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories. Remove subcategories first." },
        { status: 400 }
      )
    }

    await prisma.productCategory.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
