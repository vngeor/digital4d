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
}

export async function POST(request: NextRequest) {
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
      titleBg: data.titleBg,
      titleEn: data.titleEn,
      titleEs: data.titleEs,
      order: data.order || 0,
      published: data.published ?? true,
    },
    include: {
      _count: {
        select: { contents: true }
      }
    }
  })

  return NextResponse.json(menuItem, { status: 201 })
}

export async function PUT(request: NextRequest) {
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
      titleBg: data.titleBg,
      titleEn: data.titleEn,
      titleEs: data.titleEs,
      order: data.order,
      published: data.published,
    },
    include: {
      _count: {
        select: { contents: true }
      }
    }
  })

  return NextResponse.json(menuItem)
}

export async function DELETE(request: NextRequest) {
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
}
