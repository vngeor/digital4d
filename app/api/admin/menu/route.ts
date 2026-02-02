import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

const RESERVED_SLUGS = ['news', 'admin', 'login', 'api', 'register']

async function requireAdminApi() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function GET() {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const menuItems = await prisma.menuItem.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { contents: true }
        }
      }
    })

    return NextResponse.json(menuItems)
  } catch (error) {
    console.error("Error fetching menu items:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Generate slug from English title if not provided
    const slug = data.slug || generateSlug(data.titleEn)

    // Check for reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json(
        { error: `The slug "${slug}" is reserved and cannot be used.` },
        { status: 400 }
      )
    }

    // Check for existing slug
    const existing = await prisma.menuItem.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A menu item with slug "${slug}" already exists.` },
        { status: 400 }
      )
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        slug,
        type: data.type || "general",
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        order: data.order || 0,
        published: data.published ?? true,
      },
    })

    // Manually add _count since new items have 0 contents
    // (Neon HTTP mode doesn't support implicit transactions from include)
    return NextResponse.json({ ...menuItem, _count: { contents: 0 } }, { status: 201 })
  } catch (error) {
    console.error("Error creating menu item:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Menu item ID required" }, { status: 400 })
    }

    // If slug is being changed, check for conflicts
    if (data.slug) {
      if (RESERVED_SLUGS.includes(data.slug)) {
        return NextResponse.json(
          { error: `The slug "${data.slug}" is reserved and cannot be used.` },
          { status: 400 }
        )
      }

      const existing = await prisma.menuItem.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: data.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: `A menu item with slug "${data.slug}" already exists.` },
          { status: 400 }
        )
      }
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        type: data.type,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        order: data.order,
        published: data.published,
      },
    })

    // Fetch _count separately to avoid implicit transaction
    // (Neon HTTP mode doesn't support transactions)
    const count = await prisma.content.count({
      where: { menuItemId: data.id }
    })

    return NextResponse.json({ ...menuItem, _count: { contents: count } })
  } catch (error) {
    console.error("Error updating menu item:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Menu item ID required" }, { status: 400 })
    }

    // Delete the menu item (contents will have menuItemId set to null due to onDelete: SetNull)
    await prisma.menuItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting menu item:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
