import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { ProfileClient } from "./ProfileClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "My Profile",
    robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const t = await getTranslations("profile")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      city: true,
      address: true,
      birthDate: true,
      image: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Fetch ALL personal coupon notifications (active + expired + used) for Secret Deals
  const now = new Date()
  const notificationsWithCoupons = await prisma.notification.findMany({
    where: {
      userId: user.id,
      couponId: { not: null },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    include: {
      coupon: {
        select: {
          id: true, code: true, type: true, value: true,
          currency: true, minPurchase: true, expiresAt: true,
          maxUses: true, usedCount: true, perUserLimit: true,
          productIds: true, active: true, startsAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Deduplicate by couponId (original + reminder both reference same coupon)
  const seenCouponIds = new Set<string>()
  const uniqueCoupons = notificationsWithCoupons.filter(n => {
    if (!n.coupon) return false                          // deleted coupon — skip entirely
    if (seenCouponIds.has(n.couponId!)) return false
    seenCouponIds.add(n.couponId!)
    return true
  })

  // Skip coupons that haven't started yet (no point showing them)
  const deliveredCoupons = uniqueCoupons.filter(n => {
    const c = n.coupon!
    if (c.startsAt && c.startsAt > now) return false
    return true
  })

  // Check per-user usage for ALL coupons via CouponUsage.email
  const allCouponIds = deliveredCoupons.map(n => n.couponId!)
  const userUsages = allCouponIds.length > 0
    ? await prisma.couponUsage.findMany({
        where: { email: user.email!, couponId: { in: allCouponIds } },
        select: { couponId: true },
      })
    : []
  const usageMap: Record<string, number> = {}
  for (const u of userUsages) usageMap[u.couponId] = (usageMap[u.couponId] || 0) + 1

  // Compute status: "active" | "used" — expired coupons are excluded entirely
  const secretDeals = deliveredCoupons.flatMap(n => {
    const c = n.coupon!
    const usedByUser = usageMap[n.couponId!] || 0
    const globalExhausted = c.maxUses !== null && c.usedCount >= c.maxUses
    const isExpired = !c.active || (c.expiresAt && c.expiresAt <= now) || globalExhausted

    // Drop expired coupons entirely
    if (isExpired) return []

    const status: "active" | "used" =
      (c.perUserLimit !== null && usedByUser >= c.perUserLimit) ? "used" : "active"

    return [{
      code: c.code,
      type: c.type,
      value: c.value.toString(),
      minPurchase: c.minPurchase?.toString() || null,
      expiresAt: c.expiresAt?.toISOString() || null,
      productIds: c.productIds,
      notificationType: n.type,
      status,
    }]
  }).sort((a, b) => {
    // Active first, then used
    if (a.status === "active" && b.status !== "active") return -1
    if (b.status === "active" && a.status !== "active") return 1
    return 0
  })

  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    personalInfo: t("personalInfo"),
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    country: t("country"),
    city: t("city"),
    address: t("address"),
    birthDate: t("birthDate"),
    noPhone: t("noPhone"),
    noCountry: t("noCountry"),
    noCity: t("noCity"),
    noAddress: t("noAddress"),
    noBirthDate: t("noBirthDate"),
    memberSince: t("memberSince"),
    editProfile: t("editProfile"),
    editProfileTitle: t("editProfileTitle"),
    phonePlaceholder: t("phonePlaceholder"),
    countryPlaceholder: t("countryPlaceholder"),
    cityPlaceholder: t("cityPlaceholder"),
    addressPlaceholder: t("addressPlaceholder"),
    phoneRequired: t("phoneRequired"),
    birthDateRequired: t("birthDateRequired"),
    save: t("save"),
    saving: t("saving"),
    cancel: t("cancel"),
    updateSuccess: t("updateSuccess"),
    updateError: t("updateError"),
    backToHome: t("backToHome"),
    addBirthday: t("addBirthday"),
    addBirthdayButton: t("addBirthdayButton"),
    secretDealsTitle: t("secretDealsTitle"),
    secretDealsSubtitle: t("secretDealsSubtitle"),
    secretDealsExpires: t("secretDealsExpires"),
    secretDealsNoExpiry: t("secretDealsNoExpiry"),
    secretDealsExpiresSoon: t("secretDealsExpiresSoon"),
    secretDealsActive: t("secretDealsActive"),
    secretDealsMinPurchase: t("secretDealsMinPurchase"),
    secretDealsCopy: t("secretDealsCopy"),
    secretDealsCopied: t("secretDealsCopied"),
    secretDealsShopNow: t("secretDealsShopNow"),
    secretDealsUsed: t("secretDealsUsed"),
    secretDealsExpired: t("secretDealsExpired"),
    sourceBirthday: t("sourceBirthday"),
    sourceChristmas: t("sourceChristmas"),
    sourceNewYear: t("sourceNewYear"),
    sourceEaster: t("sourceEaster"),
    sourceCustom: t("sourceCustom"),
    sourceSpecial: t("sourceSpecial"),
  }

  return (
    <ProfileClient
      user={JSON.parse(JSON.stringify(user))}
      translations={translations}
      secretDeals={secretDeals}
    />
  )
}