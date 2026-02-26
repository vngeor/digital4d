import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ wishlisted: [] })
    }

    const { searchParams } = new URL(request.url)
    const productIdsParam = searchParams.get("productIds")

    if (!productIdsParam) {
      return NextResponse.json({ wishlisted: [] })
    }

    const productIds = productIdsParam.split(",").filter(Boolean)
    if (productIds.length === 0) {
      return NextResponse.json({ wishlisted: [] })
    }

    const items = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
        productId: { in: productIds },
      },
      select: { productId: true },
    })

    return NextResponse.json({
      wishlisted: items.map((i) => i.productId),
    })
  } catch (error) {
    console.error("Error checking wishlist:", error)
    return NextResponse.json({ wishlisted: [] })
  }
}
