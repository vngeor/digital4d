import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ count: 0, notifications: [] })
    }

    // Source 1: Legacy quote-based notifications (quoted status, not yet acted on)
    const quoteNotifications = await prisma.quoteRequest.findMany({
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
            image: true,
          },
        },
      },
    })

    // Source 2: Notification model records for this user
    // Only show notifications that are immediate (no scheduledAt) or whose scheduledAt has arrived
    const now = new Date()
    const dbNotifications = session.user.id
      ? await prisma.notification.findMany({
          where: {
            userId: session.user.id,
            OR: [
              { scheduledAt: null },
              { scheduledAt: { lte: now } },
            ],
            AND: [
              {
                OR: [
                  { read: false },
                  { readAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Also show recently read (last 7 days)
                ],
              },
            ],
          },
          include: {
            coupon: {
              select: { code: true, type: true, value: true, currency: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : []

    // Get quoteIds that are covered by Notification records to deduplicate
    const coveredQuoteIds = new Set(
      dbNotifications
        .filter(n => n.type === "quote_offer" && n.quoteId)
        .map(n => n.quoteId!)
    )

    // Build unified notifications list
    const unified: Array<{
      id: string
      type: "quote_offer" | "admin_message" | "coupon"
      title: string
      message: string
      link: string | null
      read: boolean
      quotedPrice: string | null
      quotedAt: string | null
      viewedAt: string | null
      productName: string | null
      productSlug: string | null
      productImage: string | null
      couponCode: string | null
      couponType: string | null
      couponValue: string | null
      couponCurrency: string | null
      createdAt: string
      isLegacy: boolean
    }> = []

    // Add legacy quote notifications (not covered by Notification model)
    for (const n of quoteNotifications) {
      if (!coveredQuoteIds.has(n.id)) {
        unified.push({
          id: n.id,
          type: "quote_offer",
          title: "New Quote Offer",
          message: `Quote price: ${n.quotedPrice ? `€${parseFloat(n.quotedPrice.toString()).toFixed(2)}` : "See details"}`,
          link: "/my-orders",
          read: n.viewedAt !== null,
          quotedPrice: n.quotedPrice?.toString() || null,
          quotedAt: n.quotedAt?.toISOString() || null,
          viewedAt: n.viewedAt?.toISOString() || null,
          productName: n.product?.nameEn || "Quote Request",
          productSlug: n.product?.slug || null,
          productImage: n.product?.image || null,
          couponCode: null,
          couponType: null,
          couponValue: null,
          couponCurrency: null,
          createdAt: n.quotedAt?.toISOString() || new Date().toISOString(),
          isLegacy: true,
        })
      }
    }

    // Add Notification model records
    for (const n of dbNotifications) {
      unified.push({
        id: n.id,
        type: n.type as "quote_offer" | "admin_message" | "coupon",
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        quotedPrice: null,
        quotedAt: null,
        viewedAt: n.readAt?.toISOString() || null,
        productName: null,
        productSlug: null,
        productImage: null,
        couponCode: n.coupon?.code || null,
        couponType: n.coupon?.type || null,
        couponValue: n.coupon?.value?.toString() || null,
        couponCurrency: n.coupon?.currency || null,
        createdAt: n.createdAt.toISOString(),
        isLegacy: false,
      })
    }

    // Sort by createdAt desc
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Count unread
    const unreadCount = unified.filter(n => !n.read).length

    return NextResponse.json({
      count: unreadCount,
      notifications: unified,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ count: 0, notifications: [] })
  }
}
