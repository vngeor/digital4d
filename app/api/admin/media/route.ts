import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { deleteBlobSafe } from "@/lib/blob"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

// Collect URLs used by a specific source type
async function getUrlsBySource(source: string): Promise<Set<string>> {
  const urls = new Set<string>()

  if (source === "products") {
    const products = await prisma.product.findMany({
      select: { image: true, gallery: true, fileUrl: true },
    })
    for (const p of products) {
      if (p.image) urls.add(p.image)
      if (p.fileUrl) urls.add(p.fileUrl)
      for (const g of p.gallery || []) {
        if (g) urls.add(g)
      }
    }
  } else if (source === "banners") {
    const banners = await prisma.banner.findMany({ select: { image: true } })
    for (const b of banners) {
      if (b.image) urls.add(b.image)
    }
  } else if (source === "content") {
    const contents = await prisma.content.findMany({ select: { image: true } })
    for (const c of contents) {
      if (c.image) urls.add(c.image)
    }
  } else if (source === "categories") {
    const categories = await prisma.productCategory.findMany({ select: { image: true } })
    for (const c of categories) {
      if (c.image) urls.add(c.image)
    }
  }

  return urls
}

// Collect ALL used URLs across all models
async function getAllUsedUrls(): Promise<Set<string>> {
  const [productUrls, bannerUrls, contentUrls, categoryUrls] = await Promise.all([
    getUrlsBySource("products"),
    getUrlsBySource("banners"),
    getUrlsBySource("content"),
    getUrlsBySource("categories"),
  ])
  return new Set([...productUrls, ...bannerUrls, ...contentUrls, ...categoryUrls])
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("media", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams

    // Usage check mode — return which models use this URL
    const checkUsageUrl = searchParams.get("checkUsage")
    if (checkUsageUrl) {
      const usedBy = await checkMediaUsage(checkUsageUrl)
      void session
      return NextResponse.json({ usedBy })
    }

    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const source = searchParams.get("source") // products | banners | content | categories | unused
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortDir = searchParams.get("sortDir") || "desc"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "30")

    const where: Record<string, unknown> = {}

    if (type) {
      where.mimeType = type
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: "insensitive" } },
        { altEn: { contains: search, mode: "insensitive" } },
        { altBg: { contains: search, mode: "insensitive" } },
        { altEs: { contains: search, mode: "insensitive" } },
      ]
    }

    // Source filter — filter by where the image is used
    if (source) {
      if (source === "unused") {
        const allUsedUrls = await getAllUsedUrls()
        if (allUsedUrls.size > 0) {
          where.url = { notIn: Array.from(allUsedUrls) }
        }
      } else {
        const sourceUrls = await getUrlsBySource(source)
        if (sourceUrls.size > 0) {
          where.url = { in: Array.from(sourceUrls) }
        } else {
          // No URLs found for this source — return empty result
          return NextResponse.json({ files: [], total: 0, page, limit, totalPages: 0 })
        }
      }
    }

    // Validate and apply sort
    const allowedSortFields = ["filename", "mimeType", "size", "createdAt"]
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt"
    const orderDir = sortDir === "asc" ? "asc" as const : "desc" as const

    const [files, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { [orderField]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mediaFile.count({ where }),
    ])

    void session // used for auth check

    return NextResponse.json({
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching media:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("media", "edit")
    if (error) return error

    const body = await request.json()
    const { id, altBg, altEn, altEs } = body

    if (!id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 })
    }

    // Fetch old record for change tracking
    const oldMedia = await prisma.mediaFile.findUnique({ where: { id } })
    if (!oldMedia) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    const updated = await prisma.mediaFile.update({
      where: { id },
      data: {
        altBg: altBg || null,
        altEn: altEn || null,
        altEs: altEs || null,
      },
    })

    // Audit log with change details
    const mediaFields = ["altBg", "altEn", "altEs"]
    const details = getChangeDetails(
      oldMedia as Record<string, unknown>,
      updated as Record<string, unknown>,
      mediaFields
    )
    logAuditAction({
      userId: session.user.id,
      action: "edit",
      resource: "media",
      recordId: updated.id,
      recordTitle: updated.filename,
      details,
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating media:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("media", "delete")
    if (error) return error

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 })
    }

    const media = await prisma.mediaFile.findUnique({ where: { id } })
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Check usage across all models
    const usedBy = await checkMediaUsage(media.url)
    if (usedBy.length > 0) {
      return NextResponse.json(
        { error: "Media is in use and cannot be deleted", usedBy },
        { status: 409 }
      )
    }

    // Delete from blob storage
    await deleteBlobSafe(media.url)

    // Delete DB record
    await prisma.mediaFile.delete({ where: { id } })

    // Audit log
    logAuditAction({
      userId: session.user.id,
      action: "delete",
      resource: "media",
      recordId: media.id,
      recordTitle: media.filename,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting media:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("media", "delete")
    if (error) return error

    const body = await request.json()
    const { action, ids } = body

    if (action === "delete" && Array.isArray(ids)) {
      const results = { deleted: 0, skipped: 0, inUse: [] as string[] }

      for (const id of ids) {
        const media = await prisma.mediaFile.findUnique({ where: { id } })
        if (!media) continue

        const usedBy = await checkMediaUsage(media.url)
        if (usedBy.length > 0) {
          results.skipped++
          results.inUse.push(media.filename)
          continue
        }

        await deleteBlobSafe(media.url)
        await prisma.mediaFile.delete({ where: { id } })

        logAuditAction({
          userId: session.user.id,
          action: "delete",
          resource: "media",
          recordId: media.id,
          recordTitle: media.filename,
        }).catch(() => {})

        results.deleted++
      }

      return NextResponse.json(results)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in bulk media operation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// Check if a media URL is used by any model
async function checkMediaUsage(url: string): Promise<{ type: string; id: string; name: string }[]> {
  const usedBy: { type: string; id: string; name: string }[] = []

  // Check Product.image and Product.fileUrl
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { image: url },
        { fileUrl: url },
      ],
    },
    select: { id: true, nameEn: true },
  })
  for (const p of products) {
    usedBy.push({ type: "products", id: p.id, name: p.nameEn })
  }

  // Check Product.gallery (array contains)
  const galleryProducts = await prisma.product.findMany({
    where: { gallery: { has: url } },
    select: { id: true, nameEn: true },
  })
  for (const p of galleryProducts) {
    if (!usedBy.find((u) => u.type === "products" && u.id === p.id)) {
      usedBy.push({ type: "products", id: p.id, name: p.nameEn })
    }
  }

  // Check Content.image
  const contents = await prisma.content.findMany({
    where: { image: url },
    select: { id: true, titleEn: true },
  })
  for (const c of contents) {
    usedBy.push({ type: "content", id: c.id, name: c.titleEn })
  }

  // Check Banner.image
  const banners = await prisma.banner.findMany({
    where: { image: url },
    select: { id: true, titleEn: true },
  })
  for (const b of banners) {
    usedBy.push({ type: "banners", id: b.id, name: b.titleEn })
  }

  // Check ProductCategory.image
  const categories = await prisma.productCategory.findMany({
    where: { image: url },
    select: { id: true, nameEn: true },
  })
  for (const c of categories) {
    usedBy.push({ type: "categories", id: c.id, name: c.nameEn })
  }

  return usedBy
}
