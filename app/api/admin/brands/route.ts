import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"
import { deleteBlobsBatch } from "@/lib/blob"

export async function GET() {
  try {
    const { error } = await requirePermissionApi("brands", "view")
    if (error) return error

    const brands = await prisma.brand.findMany({
      orderBy: [{ order: "asc" }, { nameEn: "asc" }],
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error("Error fetching brands:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("brands", "create")
    if (error) return error

    const data = await request.json()

    const existing = await prisma.brand.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A brand with slug "${data.slug}" already exists.` },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        titleBg: data.titleBg || null,
        titleEn: data.titleEn || null,
        titleEs: data.titleEs || null,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        image: data.image || null,
        order: data.order || 0,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "brands", recordId: brand.id, recordTitle: brand.nameEn }).catch(() => {})

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error("Error creating brand:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("brands", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 })
    }

    const oldBrand = await prisma.brand.findUnique({ where: { id: data.id } })
    if (!oldBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    if (data.slug) {
      const existing = await prisma.brand.findFirst({
        where: { slug: data.slug, NOT: { id: data.id } },
      })
      if (existing) {
        return NextResponse.json(
          { error: `A brand with slug "${data.slug}" already exists.` },
          { status: 400 }
        )
      }
    }

    const brand = await prisma.brand.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        titleBg: data.titleBg || null,
        titleEn: data.titleEn || null,
        titleEs: data.titleEs || null,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        image: data.image || null,
        order: data.order || 0,
      },
    })

    const brandFields = ["slug", "nameBg", "nameEn", "nameEs", "titleBg", "titleEn", "titleEs", "descBg", "descEn", "descEs", "image", "order"]
    const details = getChangeDetails(oldBrand as Record<string, unknown>, brand as Record<string, unknown>, brandFields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "brands", recordId: brand.id, recordTitle: brand.nameEn, details }).catch(() => {})

    // Cleanup old image if changed
    if (oldBrand.image && oldBrand.image !== brand.image) {
      deleteBlobsBatch([oldBrand.image]).catch(() => {})
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Error updating brand:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("brands", "delete")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 })
    }

    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { image: true, nameEn: true },
    })

    await prisma.brand.delete({ where: { id } })

    if (brand?.image) {
      deleteBlobsBatch([brand.image]).catch(() => {})
    }

    logAuditAction({ userId: session.user.id, action: "delete", resource: "brands", recordId: id, recordTitle: brand?.nameEn }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting brand:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
