import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { buildProductUrl } from "@/lib/productUrl"
import { WishlistClient } from "./WishlistClient"
import { isCategoryMatch } from "@/lib/couponHelpers"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("wishlist")
    return {
        title: t("title"),
        description: t("subtitle"),
    }
}

export default async function WishlistPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/login")
    }

    const t = await getTranslations("wishlist")
    const locale = await getLocale()

    const wishlistItems = await prisma.wishlistItem.findMany({
        where: { userId: session.user.id },
        include: {
            product: { include: { brand: { select: { slug: true } } } },
        },
        orderBy: { createdAt: "desc" },
    })

    // Filter out unpublished products
    const items = wishlistItems.filter((w) => w.product.published)

    // Fetch promoted coupons for product card badges
    const now = new Date()
    const promotedCouponsRaw = await prisma.coupon.findMany({
        where: {
            showOnProduct: true,
            active: true,
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
        },
        select: { type: true, value: true, currency: true, productIds: true, categoryIds: true, brandIds: true, allowOnSale: true },
    })

    // Fetch categories for display and coupon resolution
    const categoryIds = [...new Set(items.map((w) => w.product.category))]
    const categories = categoryIds.length > 0
        ? await prisma.productCategory.findMany({
            where: { slug: { in: categoryIds } },
            include: { parent: { select: { slug: true } } },
        })
        : []

    // Fetch all categories for coupon category matching
    const allCats = await prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } })

    // Build coupon map: productId → best coupon badge info
    const couponMap: Record<string, { type: string; value: string; currency: string | null }> = {}

    const toCouponBadge = (c: typeof promotedCouponsRaw[0]) => ({ type: c.type, value: c.value.toString(), currency: c.currency })

    for (const item of items) {
        const product = item.product
        const isOnSale = product.onSale && product.salePrice
        // 1. Product match
        const direct = promotedCouponsRaw.find(c =>
            c.productIds.length > 0 && c.productIds.includes(product.id) && !(isOnSale && !c.allowOnSale)
        )
        if (direct) { couponMap[product.id] = toCouponBadge(direct); continue }
        // 2. Category match
        const byCategory = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) > 0 &&
            !(isOnSale && !c.allowOnSale) &&
            isCategoryMatch(product.category, c.categoryIds ?? [], allCats)
        )
        if (byCategory) { couponMap[product.id] = toCouponBadge(byCategory); continue }
        // 3. Brand match
        const byBrand = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) > 0 && product.brandId &&
            (c.brandIds ?? []).includes(product.brandId) && !(isOnSale && !c.allowOnSale)
        )
        if (byBrand) { couponMap[product.id] = toCouponBadge(byBrand); continue }
        // 4. Global
        const global = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) === 0 && !(isOnSale && !c.allowOnSale)
        )
        if (global) { couponMap[product.id] = toCouponBadge(global) }
    }

    // Build product URL map
    const categoryParentMap = new Map<string, string | null>()
    for (const cat of categories) {
        categoryParentMap.set(cat.slug, cat.parent?.slug || null)
    }
    const productUrlMap: Record<string, string> = {}
    for (const item of items) {
        productUrlMap[item.product.id] = buildProductUrl(
            item.product.slug,
            item.product.category,
            item.product.brand?.slug,
            categoryParentMap.get(item.product.category)
        )
    }

    const translations = {
        title: t("title"),
        subtitle: t("subtitle"),
        empty: t("empty"),
        emptyDescription: t("emptyDescription"),
        browseProducts: t("browseProducts"),
        addToWishlist: t("addToWishlist"),
        removeFromWishlist: t("removeFromWishlist"),
        loginToWishlist: t("loginToWishlist"),
        priceDropAlert: t("priceDropAlert"),
        backToHome: t("backToHome"),
        outOfStock: t("outOfStock"),
        comingSoon: t("comingSoon"),
        preOrder: t("preOrder"),
        soldOut: t("soldOut"),
    }

    return (
        <WishlistClient
            items={JSON.parse(JSON.stringify(items))}
            categories={JSON.parse(JSON.stringify(categories))}
            locale={locale}
            translations={translations}
            couponMap={couponMap}
            productUrlMap={productUrlMap}
        />
    )
}
