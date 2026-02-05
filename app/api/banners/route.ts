import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })

    const hero = banners.filter(b => b.type === "hero")
    const promo = banners.filter(b => b.type === "promo")
    const cards = banners.filter(b => b.type === "card")

    return NextResponse.json({ hero, promo, cards })
  } catch (error) {
    console.error("Error fetching banners:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
