import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

async function requireAdminApi() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    const banners = await prisma.banner.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(banners)
  } catch (error) {
    console.error("Error fetching banners:", error)
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

    const banner = await prisma.banner.create({
      data: {
        type: data.type,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        subtitleBg: data.subtitleBg || null,
        subtitleEn: data.subtitleEn || null,
        subtitleEs: data.subtitleEs || null,
        image: data.image || null,
        link: data.link || null,
        linkTextBg: data.linkTextBg || null,
        linkTextEn: data.linkTextEn || null,
        linkTextEs: data.linkTextEs || null,
        published: data.published || false,
        order: data.order || 0,
      },
    })

    return NextResponse.json(banner, { status: 201 })
  } catch (error) {
    console.error("Error creating banner:", error)
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
      return NextResponse.json({ error: "Banner ID required" }, { status: 400 })
    }

    const banner = await prisma.banner.update({
      where: { id: data.id },
      data: {
        type: data.type,
        titleBg: data.titleBg,
        titleEn: data.titleEn,
        titleEs: data.titleEs,
        subtitleBg: data.subtitleBg || null,
        subtitleEn: data.subtitleEn || null,
        subtitleEs: data.subtitleEs || null,
        image: data.image || null,
        link: data.link || null,
        linkTextBg: data.linkTextBg || null,
        linkTextEn: data.linkTextEn || null,
        linkTextEs: data.linkTextEs || null,
        published: data.published,
        order: data.order,
      },
    })

    return NextResponse.json(banner)
  } catch (error) {
    console.error("Error updating banner:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Bulk update order
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array required" }, { status: 400 })
    }

    // Update all items (Neon HTTP mode doesn't support transactions, so update one by one)
    for (const item of items) {
      await prisma.banner.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering banners:", error)
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
      return NextResponse.json({ error: "Banner ID required" }, { status: 400 })
    }

    await prisma.banner.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting banner:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
