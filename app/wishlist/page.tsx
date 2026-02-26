import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { WishlistClient } from "./WishlistClient"
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
            product: true,
        },
        orderBy: { createdAt: "desc" },
    })

    // Filter out unpublished products
    const items = wishlistItems.filter((w) => w.product.published)

    // Fetch categories for display
    const categoryIds = [...new Set(items.map((w) => w.product.category))]
    const categories = categoryIds.length > 0
        ? await prisma.productCategory.findMany({
            where: { slug: { in: categoryIds } },
        })
        : []

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
    }

    return (
        <WishlistClient
            items={JSON.parse(JSON.stringify(items))}
            categories={JSON.parse(JSON.stringify(categories))}
            locale={locale}
            translations={translations}
        />
    )
}
