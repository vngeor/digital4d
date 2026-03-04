import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get("q")?.trim()
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20)

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      )
    }

    const searchCondition = (fields: string[]) =>
      fields.map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } }))

    const [productsResult, contentResult, menuResult] = await Promise.allSettled([
      prisma.product.findMany({
        where: {
          published: true,
          OR: searchCondition(["nameEn", "nameBg", "nameEs", "sku"]),
        },
        select: {
          id: true,
          slug: true,
          nameBg: true,
          nameEn: true,
          nameEs: true,
          image: true,
          price: true,
          salePrice: true,
          onSale: true,
          currency: true,
          priceType: true,
          category: true,
          fileType: true,
        },
        orderBy: [{ featured: "desc" }, { order: "asc" }],
        take: limit,
      }),
      prisma.content.findMany({
        where: {
          published: true,
          OR: searchCondition(["titleEn", "titleBg", "titleEs"]),
        },
        select: {
          id: true,
          slug: true,
          titleBg: true,
          titleEn: true,
          titleEs: true,
          type: true,
          image: true,
          menuItem: { select: { slug: true } },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        take: limit,
      }),
      prisma.menuItem.findMany({
        where: {
          published: true,
          OR: searchCondition(["titleEn", "titleBg", "titleEs"]),
        },
        select: {
          id: true,
          slug: true,
          titleBg: true,
          titleEn: true,
          titleEs: true,
          type: true,
        },
        orderBy: [{ order: "asc" }],
        take: limit,
      }),
    ])

    const products = productsResult.status === "fulfilled" ? productsResult.value : []
    const rawContent = contentResult.status === "fulfilled" ? contentResult.value : []
    const menu = menuResult.status === "fulfilled" ? menuResult.value : []

    // Flatten menuItem relation to menuItemSlug
    const content = rawContent.map(({ menuItem, ...rest }) => ({
      ...rest,
      menuItemSlug: menuItem?.slug || null,
    }))

    // Serialize Decimal fields (price, salePrice)
    return NextResponse.json(
      JSON.parse(JSON.stringify({ products, content, menu }))
    )
  } catch (error) {
    console.error("Error in search:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
