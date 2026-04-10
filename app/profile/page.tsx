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

  // Count active personal coupon deals for the teaser badge
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
          id: true, active: true, expiresAt: true, maxUses: true,
          usedCount: true, perUserLimit: true, startsAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Deduplicate by couponId
  const seenCouponIds = new Set<string>()
  const uniqueCoupons = notificationsWithCoupons.filter(n => {
    if (!n.coupon) return false
    if (seenCouponIds.has(n.couponId!)) return false
    seenCouponIds.add(n.couponId!)
    return true
  })

  // Count only non-expired, non-exhausted deals
  const allCouponIds = uniqueCoupons
    .filter(n => {
      const c = n.coupon!
      if (c.startsAt && c.startsAt > now) return false
      const globalExhausted = c.maxUses !== null && c.usedCount >= c.maxUses
      const isExpired = !c.active || (c.expiresAt && c.expiresAt <= now) || globalExhausted
      return !isExpired
    })
    .map(n => n.couponId!)

  const userUsages = allCouponIds.length > 0
    ? await prisma.couponUsage.findMany({
        where: { email: user.email!, couponId: { in: allCouponIds } },
        select: { couponId: true },
      })
    : []
  const usageMap: Record<string, number> = {}
  for (const u of userUsages) usageMap[u.couponId] = (usageMap[u.couponId] || 0) + 1

  const activeDealsCount = uniqueCoupons.filter(n => {
    if (!n.coupon) return false
    const c = n.coupon
    if (c.startsAt && c.startsAt > now) return false
    const globalExhausted = c.maxUses !== null && c.usedCount >= c.maxUses
    const isExpired = !c.active || (c.expiresAt && c.expiresAt <= now) || globalExhausted
    if (isExpired) return false
    const usedByUser = usageMap[n.couponId!] || 0
    return c.perUserLimit === null || usedByUser < c.perUserLimit
  }).length

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
    secretDealsView: t("secretDealsView"),
    secretDealsCount: t("secretDealsCount"),
  }

  return (
    <ProfileClient
      user={JSON.parse(JSON.stringify(user))}
      translations={translations}
      activeDealsCount={activeDealsCount}
    />
  )
}
