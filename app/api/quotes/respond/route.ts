import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    const { quoteId, action, message } = data

    if (!quoteId || !action) {
      return NextResponse.json({ error: "Quote ID and action required" }, { status: 400 })
    }

    // Verify the quote belongs to this user
    const quote = await prisma.quoteRequest.findFirst({
      where: {
        id: quoteId,
        email: session.user.email,
        status: "quoted", // Can only respond to quoted status
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found or cannot be responded to" }, { status: 404 })
    }

    let newStatus: string
    let userResponse: string | null = null

    switch (action) {
      case "accept":
        newStatus = "accepted"
        break
      case "decline":
        newStatus = "user_declined"
        userResponse = message || null
        break
      case "counter_offer":
        if (!message) {
          return NextResponse.json({ error: "Counter offer requires a message" }, { status: 400 })
        }
        newStatus = "pending" // Goes back to pending so admin sees it in queue
        userResponse = message
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const updatedQuote = await prisma.quoteRequest.update({
      where: { id: quoteId },
      data: {
        status: newStatus,
        userResponse,
      },
    })

    // Create a message in the history for user responses (stored as JSON for i18n)
    if (action === "accept") {
      // Look up coupon from notification
      let couponCode: string | null = null
      let couponDiscount: string | null = null
      try {
        const couponNotification = await prisma.notification.findFirst({
          where: { quoteId, couponId: { not: null } },
          select: { coupon: { select: { code: true, type: true, value: true, currency: true } } },
        })
        if (couponNotification?.coupon) {
          const c = couponNotification.coupon
          couponCode = c.code
          couponDiscount = c.type === "percentage"
            ? `${c.value}%`
            : `${c.value} ${c.currency || "EUR"}`
        }
      } catch {
        // Non-critical — coupon info is supplementary
      }

      await prisma.quoteMessage.create({
        data: {
          quoteId,
          senderType: "user",
          message: JSON.stringify({
            key: "accepted",
            price: quote.quotedPrice ? Number(quote.quotedPrice).toFixed(2) : null,
            couponCode,
            couponDiscount,
          }),
          quotedPrice: quote.quotedPrice ? Number(quote.quotedPrice) : null,
        },
      })
    } else if (action === "decline") {
      await prisma.quoteMessage.create({
        data: {
          quoteId,
          senderType: "user",
          message: JSON.stringify({
            key: "declined",
            text: message || null,
          }),
        },
      })
    } else if (action === "counter_offer" && message) {
      await prisma.quoteMessage.create({
        data: {
          quoteId,
          senderType: "user",
          message: JSON.stringify({
            key: "counter_offer",
            text: message,
          }),
        },
      })
    }

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error("Error responding to quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}