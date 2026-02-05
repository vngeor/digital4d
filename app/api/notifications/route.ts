import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ count: 0, notifications: [] })
    }

    // Get all quoted quotes — counter persists until user acts (accept/decline/counter)
    const notifications = await prisma.quoteRequest.findMany({
      where: {
        email: session.user.email,
        status: "quoted",
      },
      orderBy: { quotedAt: "desc" },
      select: {
        id: true,
        quotedPrice: true,
        quotedAt: true,
        viewedAt: true,
        product: {
          select: {
            nameEn: true,
            nameBg: true,
            nameEs: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({
      count: notifications.length,
      notifications: notifications.map(n => ({
        id: n.id,
        quotedPrice: n.quotedPrice?.toString() || null,
        quotedAt: n.quotedAt?.toISOString() || null,
        viewedAt: n.viewedAt?.toISOString() || null,
        productName: n.product?.nameEn || "Quote Request",
        productSlug: n.product?.slug || null,
      })),
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ count: 0, notifications: [] })
  }
}