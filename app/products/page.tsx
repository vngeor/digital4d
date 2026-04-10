import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { ProductCatalog } from "../components/ProductCatalog"
import { isCategoryMatch } from "@/lib/couponHelpers"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("products")
    const locale = await getLocale()

    const title = t("title")
    const description = t("subtitle")

    return {
        title,
        description,
        openGraph: {
            title: `${title} | digital4d`,
            description,
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
        },
    }
}

export default async function ProductsPage() {
    const t = await getTranslations()
    const locale = await getLocale()

    // Parallel data fetching (all independent queries)
    const now = new Date()
    const [products, categories, promotedCouponsRaw, session] = await Promise.all([
        prisma.product.findMany({
            where: { published: true },
            orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
            include: {
                brand: true,
                variants: { include: { color: true }, orderBy: { order: "asc" } },
                packages: { include: { weight: { select: { label: true } }, packageVariants: { select: { variantId: true, status: true } } }, orderBy: { order: "asc" } },
            },
        }),
        prisma.productCategory.findMany({
            include: { children: true, parent: true },
            orderBy: [{ order: "asc" }],
        }),
        prisma.coupon.findMany({
            where: {
                showOnProduct: true,
                active: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                ],
            },
            select: { code: true, type: true, value: true, currency: true, productIds: true, categoryIds: true, brandIds: true, allowOnSale: true, expiresAt: true },
        }),
        auth(),
    ])

    // Build coupon map: productId → best coupon badge info
    const allCategories = await prisma.productCategory.findMany({ select: { id: true, slug: true, parentId: true } })
    const couponMap: Record<string, { code: string; type: string; value: string; currency: string | null; expiresAt: string | null }> = {}

    const toCouponBadge = (c: typeof promotedCouponsRaw[0]) => ({
        code: c.code, type: c.type, value: c.value.toString(), currency: c.currency, expiresAt: c.expiresAt?.toISOString() ?? null
    })

    for (const product of products) {
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
            isCategoryMatch(product.category, c.categoryIds ?? [], allCategories)
        )
        if (byCategory) { couponMap[product.id] = toCouponBadge(byCategory); continue }
        // 3. Brand match
        const byBrand = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) > 0 && product.brand?.id &&
            (c.brandIds ?? []).includes(product.brand.id) && !(isOnSale && !c.allowOnSale)
        )
        if (byBrand) { couponMap[product.id] = toCouponBadge(byBrand); continue }
        // 4. Global
        const global = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) === 0 && !(isOnSale && !c.allowOnSale)
        )
        if (global) { couponMap[product.id] = toCouponBadge(global) }
    }

    // Compute display image: first available (in_stock/pre_order) variant image, or main product image
    const productsForDisplay = products.map(p => ({
        ...p,
        image: p.variants.find(v => ["in_stock", "pre_order"].includes(v.status))?.image || p.image,
    }))

    // Wishlist depends on session
    let wishlistedProductIds: string[] = []
    if (session?.user?.id) {
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId: session.user.id },
            select: { productId: true },
        })
        wishlistedProductIds = wishlistItems.map((w) => w.productId)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            <BackgroundOrbs />

            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words">
                        {t("products.title")}
                    </h1>
                    <p className="text-slate-400 text-lg mt-4">{t("products.subtitle")}</p>
                </div>
            </section>

            {/* Products Grid with Client-Side Filtering */}
            <ProductCatalog
                products={JSON.parse(JSON.stringify(productsForDisplay))}
                categories={JSON.parse(JSON.stringify(categories))}
                locale={locale}
                wishlistedProductIds={wishlistedProductIds}
                couponMap={couponMap}
            />

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {t("footer.rights")}</p>
                </div>
            </footer>
        </div>
    )
}
