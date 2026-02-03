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
    const category = searchParams.get("category")

    const products = await prisma.product.findMany({
      where: category ? { category } : undefined,
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
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Check for existing slug
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: `A product with slug "${data.slug}" already exists.` },
        { status: 400 }
      )
    }

    // Check for existing SKU if provided
    if (data.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } })
      if (existingSku) {
        return NextResponse.json(
          { error: `A product with SKU "${data.sku}" already exists.` },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.create({
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
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
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

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error updating product:", error)
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
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}