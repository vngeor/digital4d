import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { ProductCatalog } from "../components/ProductCatalog"
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

    // Fetch published products
    const products = await prisma.product.findMany({
        where: {
            published: true,
        },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    })

    // Fetch all categories
    const categories = await prisma.productCategory.findMany({
        orderBy: [{ order: "asc" }],
    })

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
        select: { type: true, value: true, currency: true, productIds: true, allowOnSale: true },
    })

    // Build coupon map: productId → best coupon badge info
    const couponMap: Record<string, { type: string; value: string; currency: string | null }> = {}
    const globalCoupons = promotedCouponsRaw.filter(c => c.productIds.length === 0)
    const specificCoupons = promotedCouponsRaw.filter(c => c.productIds.length > 0)

    for (const product of products) {
        const isOnSale = product.onSale && product.salePrice
        const specific = specificCoupons.find(c =>
            c.productIds.includes(product.id) && !(isOnSale && !c.allowOnSale)
        )
        if (specific) {
            couponMap[product.id] = { type: specific.type, value: specific.value.toString(), currency: specific.currency }
            continue
        }
        const global = globalCoupons.find(c => !(isOnSale && !c.allowOnSale))
        if (global) {
            couponMap[product.id] = { type: global.type, value: global.value.toString(), currency: global.currency }
        }
    }

    // Fetch wishlisted product IDs for authenticated user
    const session = await auth()
    let wishlistedProductIds: string[] = []
    if (session?.user?.id) {
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId: session.user.id },
            select: { productId: true },
        })
        wishlistedProductIds = wishlistItems.map((w) => w.productId)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6"
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
                products={JSON.parse(JSON.stringify(products))}
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
