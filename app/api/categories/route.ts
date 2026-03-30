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

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json([], { status: 500 })
  }
}
