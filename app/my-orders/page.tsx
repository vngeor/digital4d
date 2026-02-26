import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { MyOrdersClient } from "./MyOrdersClient"

export default async function MyOrdersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const t = await getTranslations("profile")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  if (!user) {
    redirect("/login")
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      description: true,
      status: true,
      createdAt: true,
    },
  })

  const quotes = await prisma.quoteRequest.findMany({
    where: { email: user.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      quotedPrice: true,
      message: true,
      adminNotes: true,
      userResponse: true,
      viewedAt: true,
      createdAt: true,
      product: {
        select: {
          nameEn: true,
          nameBg: true,
          nameEs: true,
          slug: true,
          image: true,
          fileType: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderType: true,
          message: true,
          quotedPrice: true,
          createdAt: true,
        },
      },
    },
  })

  // Fetch coupons attached to quotes via Notification records
  const quoteIds = quotes.map(q => q.id)
  const quoteCouponNotifications = quoteIds.length > 0
    ? await prisma.notification.findMany({
        where: {
          quoteId: { in: quoteIds },
          couponId: { not: null },
        },
        select: {
          quoteId: true,
          coupon: {
            select: {
              code: true,
              type: true,
              value: true,
              currency: true,
            },
          },
        },
      })
    : []

  const quoteCouponMap: Record<string, { code: string; type: string; value: string; currency: string | null }> = {}
  for (const n of quoteCouponNotifications) {
    if (n.quoteId && n.coupon) {
      quoteCouponMap[n.quoteId] = {
        code: n.coupon.code,
        type: n.coupon.type,
        value: n.coupon.value.toString(),
        currency: n.coupon.currency,
      }
    }
  }

  const quotesWithCoupons = quotes.map(q => ({
    ...q,
    coupon: quoteCouponMap[q.id] || null,
  }))

  const translations = {
    myOrdersTitle: t("myOrdersTitle"),
    myOrdersSubtitle: t("myOrdersSubtitle"),
    orderHistory: t("orderHistory"),
    noOrders: t("noOrders"),
    noOrdersDescription: t("noOrdersDescription"),
    statusPending: t("statusPending"),
    statusInProgress: t("statusInProgress"),
    statusCompleted: t("statusCompleted"),
    statusCancelled: t("statusCancelled"),
    quoteRequests: t("quoteRequests"),
    noQuotes: t("noQuotes"),
    noQuotesDescription: t("noQuotesDescription"),
    quotePending: t("quotePending"),
    quoteQuoted: t("quoteQuoted"),
    quoteAccepted: t("quoteAccepted"),
    quoteRejected: t("quoteRejected"),
    quotedPrice: t("quotedPrice"),
    viewProduct: t("viewProduct"),
    rejectionReason: t("rejectionReason"),
    acceptOffer: t("acceptOffer"),
    declineOffer: t("declineOffer"),
    counterOffer: t("counterOffer"),
    yourMessage: t("yourMessage"),
    sendCounterOffer: t("sendCounterOffer"),
    quoteCounterOffer: t("quoteCounterOffer"),
    quoteUserDeclined: t("quoteUserDeclined"),
    respondToOffer: t("respondToOffer"),
    counterOfferSent: t("counterOfferSent"),
    newBadge: t("newBadge"),
    conversationHistory: t("conversationHistory"),
    you: t("you"),
    admin: t("admin"),
    cancel: t("cancel"),
    backToHome: t("backToHome"),
    seeMore: t("seeMore"),
    showLess: t("showLess"),
    couponIncluded: t("couponIncluded"),
    copyCouponCode: t("copyCouponCode"),
    couponCopied: t("couponCopied"),
    couponOff: t("couponOff"),
    msgAccepted: t("msgAccepted"),
    msgDeclined: t("msgDeclined"),
    msgCounterOffer: t("msgCounterOffer"),
    msgPrice: t.raw("msgPrice"),
    msgCoupon: t.raw("msgCoupon"),
  }

  return (
    <Suspense>
      <MyOrdersClient
        orders={JSON.parse(JSON.stringify(orders))}
        quotes={JSON.parse(JSON.stringify(quotesWithCoupons))}
        translations={translations}
      />
    </Suspense>
  )
}