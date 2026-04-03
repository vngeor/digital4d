import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: [{ order: "asc" }, { nameEn: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { nameEn: "asc" }],
    })

    // Count published products per category slug (single query instead of N+1)
    const allSlugs: string[] = []
    for (const cat of categories) {
      allSlugs.push(cat.slug)
      for (const child of cat.children) {
        allSlugs.push(child.slug)
      }
    }

    const countMap: Record<string, number> = {}
    if (allSlugs.length > 0) {
      const counts = await prisma.product.groupBy({
        by: ["category"],
        where: { category: { in: allSlugs }, published: true },
        _count: true,
      })
      for (const c of counts) {
        countMap[c.category] = c._count
      }
    }

    // Map counts to categories
    const result = categories.map(cat => {
      const childrenWithCounts = cat.children.map(child => ({
        ...child,
        productCount: countMap[child.slug] || 0,
      }))
      const ownCount = countMap[cat.slug] || 0
      const childrenTotal = childrenWithCounts.reduce((sum, c) => sum + c.productCount, 0)
      return {
        ...cat,
        // Parents with children: show total product count across all subcategories. Parents without children: show own count
        productCount: cat.children.length > 0 ? childrenTotal : ownCount,
        children: childrenWithCounts,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching categories:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json([], { status: 500 })
  }
}
