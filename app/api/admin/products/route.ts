import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { deleteBlobsBatch } from "@/lib/blob"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"
import { notifyWishlistPriceDrop } from "@/lib/wishlistNotifications"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const ids = searchParams.get("ids")

    // If specific IDs requested, return just those products
    if (ids) {
      const idList = ids.split(",").filter(Boolean)
      const products = await prisma.product.findMany({
        where: { id: { in: idList } },
      })
      return NextResponse.json(products)
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: "insensitive" } },
        { nameBg: { contains: search, mode: "insensitive" } },
        { nameEs: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const products = await prisma.product.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "create")
    if (error) return error

    const data = await request.json()

    // Check for existing slug
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A product with slug "${data.slug}" already exists.` },
        { status: 400 }
      )
    }

    // Auto-generate SKU if not provided
    let sku = data.sku
    if (!sku) {
      // Get the count of products to generate unique SKU
      const count = await prisma.product.count()
      const timestamp = Date.now().toString(36).toUpperCase()
      sku = `D4D-${(count + 1).toString().padStart(4, "0")}-${timestamp.slice(-4)}`
    }

    // Check for existing SKU
    const existingSku = await prisma.product.findUnique({ where: { sku } })
    if (existingSku) {
      return NextResponse.json(
        { error: `A product with SKU "${sku}" already exists.` },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        sku,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        price: data.price ? parseFloat(data.price) : null,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
        onSale: data.onSale || false,
        currency: data.currency || "BGN",
        priceType: data.priceType || "fixed",
        category: data.category,
        tags: data.tags || [],
        image: data.image || null,
        gallery: data.gallery || [],
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || "physical",
        featured: data.featured || false,
        published: data.published || false,
        inStock: data.inStock !== false,
        order: data.order || 0,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "products", recordId: product.id, recordTitle: product.nameEn }).catch(() => {})

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    // Fetch old record for change tracking
    const oldProduct = await prisma.product.findUnique({ where: { id: data.id } })
    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check for duplicate slug
    if (data.slug) {
      const existing = await prisma.product.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: data.id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: `A product with slug "${data.slug}" already exists.` },
          { status: 400 }
        )
      }
    }

    // Check for duplicate SKU if provided
    if (data.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          NOT: { id: data.id }
        }
      })
      if (existingSku) {
        return NextResponse.json(
          { error: `A product with SKU "${data.sku}" already exists.` },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        sku: data.sku || null,
        nameBg: data.nameBg,
        nameEn: data.nameEn,
        nameEs: data.nameEs,
        descBg: data.descBg || null,
        descEn: data.descEn || null,
        descEs: data.descEs || null,
        price: data.price ? parseFloat(data.price) : null,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
        onSale: data.onSale || false,
        currency: data.currency || "BGN",
        priceType: data.priceType || "fixed",
        category: data.category,
        tags: data.tags || [],
        image: data.image || null,
        gallery: data.gallery || [],
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || "physical",
        featured: data.featured || false,
        published: data.published || false,
        inStock: data.inStock !== false,
        order: data.order || 0,
      },
    })

    const productFields = ["slug", "sku", "nameBg", "nameEn", "nameEs", "descBg", "descEn", "descEs", "price", "salePrice", "onSale", "currency", "priceType", "category", "tags", "image", "gallery", "fileUrl", "fileType", "featured", "published", "inStock", "order"]
    const details = getChangeDetails(oldProduct as Record<string, unknown>, product as Record<string, unknown>, productFields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "products", recordId: product.id, recordTitle: product.nameEn, details }).catch(() => {})

    // Detect price drop or sale activation → notify wishlist users
    const oldPriceNum = oldProduct.price ? parseFloat(oldProduct.price.toString()) : null
    const newPriceNum = product.price ? parseFloat(product.price.toString()) : null
    const oldSalePriceNum = oldProduct.salePrice ? parseFloat(oldProduct.salePrice.toString()) : null
    const newSalePriceNum = product.salePrice ? parseFloat(product.salePrice.toString()) : null

    const priceDropped = newPriceNum !== null && oldPriceNum !== null && newPriceNum < oldPriceNum
    const wentOnSale = !oldProduct.onSale && product.onSale
    const salePriceDropped = product.onSale && newSalePriceNum !== null && oldSalePriceNum !== null && newSalePriceNum < oldSalePriceNum

    if (priceDropped || wentOnSale || salePriceDropped) {
      notifyWishlistPriceDrop(
        product.id,
        product.slug,
        { nameBg: product.nameBg, nameEn: product.nameEn, nameEs: product.nameEs },
        oldPriceNum,
        newPriceNum,
        product.onSale,
        newSalePriceNum,
        product.currency
      ).catch((err) => console.error("Failed to send wishlist price drop notifications:", err))
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Bulk operations (reorder, delete, publish, unpublish)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action || "reorder"

    if (action === "reorder") {
      const { session, error } = await requirePermissionApi("products", "edit")
      if (error) return error

      const { items } = body
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: "Items array required" }, { status: 400 })
      }

      for (const item of items) {
        await prisma.product.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      }

      return NextResponse.json({ success: true })
    }

    if (action === "delete") {
      const { session, error } = await requirePermissionApi("products", "delete")
      if (error) return error

      const { ids } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "IDs array required" }, { status: 400 })
      }

      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, image: true, gallery: true, fileUrl: true },
      })

      for (const product of products) {
        await prisma.product.delete({ where: { id: product.id } })
      }

      // Clean up blob files (non-blocking)
      const urlsToDelete = products.flatMap((p) => [p.image, p.fileUrl, ...(p.gallery || [])])
      deleteBlobsBatch(urlsToDelete).catch((err) => {
        console.error("Failed to delete product file blobs:", err)
      })

      for (const p of products) {
        logAuditAction({ userId: session.user.id, action: "delete", resource: "products", recordId: p.id }).catch(() => {})
      }

      return NextResponse.json({ success: true, count: products.length })
    }

    if (action === "publish" || action === "unpublish") {
      const { session, error } = await requirePermissionApi("products", "edit")
      if (error) return error

      const { ids } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "IDs array required" }, { status: 400 })
      }

      for (const id of ids) {
        await prisma.product.update({
          where: { id },
          data: { published: action === "publish" },
        })
      }

      const published = action === "publish"
      for (const id of ids) {
        logAuditAction({ userId: session.user.id, action: "edit", resource: "products", recordId: id, details: JSON.stringify({ published: { from: !published, to: published } }) }).catch(() => {})
      }

      return NextResponse.json({ success: true, count: ids.length })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Error in bulk product operation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("products", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    // Fetch the product to get all associated file URLs before deletion
    const product = await prisma.product.findUnique({
      where: { id },
      select: { image: true, gallery: true, fileUrl: true }
    })

    // Delete the database record
    await prisma.product.delete({
      where: { id },
    })

    // Delete all associated blob files (non-blocking)
    if (product) {
      const urlsToDelete = [
        product.image,
        product.fileUrl,
        ...(product.gallery || [])
      ]

      deleteBlobsBatch(urlsToDelete).catch(err => {
        console.error("Failed to delete product file blobs:", err)
      })
    }

    logAuditAction({ userId: session.user.id, action: "delete", resource: "products", recordId: id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}