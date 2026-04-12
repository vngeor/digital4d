import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { SecretDealsClient } from "./SecretDealsClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Secret Deals",
  robots: { index: false, follow: false },
}

export default async function SecretDealsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const t = await getTranslations("profile")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  })

  if (!user) {
    redirect("/login")
  }

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
          productIds: true, categoryIds: true, brandIds: true,
          active: true, startsAt: true,
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

  // Skip coupons that haven't started yet
  const deliveredCoupons = uniqueCoupons.filter(n => {
    const c = n.coupon!
    if (c.startsAt && c.startsAt > now) return false
    return true
  })

  // Check per-user usage
  const allCouponIds = deliveredCoupons.map(n => n.couponId!)
  const userUsages = allCouponIds.length > 0
    ? await prisma.couponUsage.findMany({
        where: { email: user.email!, couponId: { in: allCouponIds } },
        select: { couponId: true },
      })
    : []
  const usageMap: Record<string, number> = {}
  for (const u of userUsages) usageMap[u.couponId] = (usageMap[u.couponId] || 0) + 1

  // Collect all brand/category/product IDs across all coupons for bulk fetch
  const allBrandIds = [...new Set(deliveredCoupons.flatMap(n => n.coupon?.brandIds ?? []))]
  const allCategoryIds = [...new Set(deliveredCoupons.flatMap(n => n.coupon?.categoryIds ?? []))]
  const allProductIds = [...new Set(deliveredCoupons.flatMap(n => n.coupon?.productIds ?? []))]

  const [brands, categories, products] = await Promise.all([
    allBrandIds.length > 0
      ? prisma.brand.findMany({ where: { id: { in: allBrandIds } }, select: { id: true, nameBg: true, nameEn: true, nameEs: true } })
      : [],
    allCategoryIds.length > 0
      ? prisma.productCategory.findMany({ where: { id: { in: allCategoryIds } }, select: { id: true, nameBg: true, nameEn: true, nameEs: true } })
      : [],
    allProductIds.length > 0
      ? prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, nameBg: true, nameEn: true, nameEs: true } })
      : [],
  ])

  const brandMap = Object.fromEntries(brands.map(b => [b.id, { nameBg: b.nameBg, nameEn: b.nameEn, nameEs: b.nameEs }]))
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, { nameBg: c.nameBg, nameEn: c.nameEn, nameEs: c.nameEs }]))
  const productMap = Object.fromEntries(products.map(p => [p.id, { nameBg: p.nameBg, nameEn: p.nameEn, nameEs: p.nameEs }]))

  // Compute status
  const secretDeals = deliveredCoupons.flatMap(n => {
    const c = n.coupon!
    const usedByUser = usageMap[n.couponId!] || 0
    const globalExhausted = c.maxUses !== null && c.usedCount >= c.maxUses
    const isExpired = !c.active || (c.expiresAt && c.expiresAt <= now) || globalExhausted
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
      categoryIds: c.categoryIds,
      brandIds: c.brandIds,
      brandNames: c.brandIds.map(id => brandMap[id]).filter(Boolean) as { nameBg: string; nameEn: string; nameEs: string }[],
      categoryNames: c.categoryIds.map(id => categoryMap[id]).filter(Boolean) as { nameBg: string; nameEn: string; nameEs: string }[],
      productNames: c.productIds.map(id => productMap[id]).filter(Boolean) as { nameBg: string; nameEn: string; nameEs: string }[],
      notificationType: n.type,
      status,
    }]
  }).sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1
    if (b.status === "active" && a.status !== "active") return 1
    return 0
  })

  const translations = {
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
    secretDealsEmpty: t("secretDealsEmpty"),
    secretDealsEmptySubtitle: t("secretDealsEmptySubtitle"),
    secretDealsCount: t("secretDealsCount"),
    secretDealsAllProducts: t("secretDealsAllProducts"),
    secretDealsProducts: t("secretDealsProducts"),
    backToProfile: t("backToProfile"),
    sourceBirthday: t("sourceBirthday"),
    sourceChristmas: t("sourceChristmas"),
    sourceNewYear: t("sourceNewYear"),
    sourceEaster: t("sourceEaster"),
    sourceCustom: t("sourceCustom"),
    sourceSpecial: t("sourceSpecial"),
    sourceAdminOffer: t("sourceAdminOffer"),
    sourceWishlist: t("sourceWishlist"),
    sourceReminder: t("sourceReminder"),
  }

  return (
    <SecretDealsClient
      secretDeals={secretDeals}
      translations={translations}
    />
  )
}
