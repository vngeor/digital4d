import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { NotificationsClient } from "./NotificationsClient"

export async function generateMetadata() {
  const t = await getTranslations("nav")
  return {
    title: t("allNotificationsTitle"),
    robots: "noindex",
  }
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/notifications")

  const t = await getTranslations("nav")

  const translations = {
    title: t("allNotificationsTitle"),
    markAllRead: t("markAllRead"),
    noNotifications: t("noNotifications"),
    noOlderNotifications: t("noOlderNotifications"),
    notifications: t("notifications"),
    newQuoteReceived: t("newQuoteReceived"),
    justNow: t("justNow"),
    minutesAgo: t.raw("minutesAgo"),
    hoursAgo: t.raw("hoursAgo"),
    daysAgo: t.raw("daysAgo"),
    wishlistPriceDrop: t.raw("wishlistPriceDrop"),
    wishlistPriceDropMessage: t.raw("wishlistPriceDropMessage"),
    wishlistOnSale: t.raw("wishlistOnSale"),
    wishlistCoupon: t.raw("wishlistCoupon"),
    wishlistCouponPercentage: t.raw("wishlistCouponPercentage"),
    wishlistCouponFixed: t.raw("wishlistCouponFixed"),
    quoteOfferTitle: t("quoteOfferTitle"),
    quoteOfferWithCouponTitle: t("quoteOfferWithCouponTitle"),
    quoteOfferMessage: t.raw("quoteOfferMessage"),
    quoteOfferMessageWithCoupon: t.raw("quoteOfferMessageWithCoupon"),
    quoteOfferMessageGeneric: t("quoteOfferMessageGeneric"),
    quotePriceMessage: t.raw("quotePriceMessage"),
    autoBirthday: t("autoBirthday"),
    autoHoliday: t("autoHoliday"),
    autoCustom: t("autoCustom"),
    notificationDetails: t("notificationDetails"),
    visitLink: t("visitLink"),
    couponExpires: t.raw("couponExpires"),
    couponTimeLeft: t("couponTimeLeft"),
    couponExpired: t("couponExpired"),
    couponReminder: t("couponReminder"),
    stockAvailable: t.raw("stockAvailable"),
    couponMinPurchase: t("couponMinPurchase"),
    closeModal: t("closeModal"),
  }

  return <NotificationsClient translations={translations} />
}
