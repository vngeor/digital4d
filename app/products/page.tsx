import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import prisma from "@/lib/prisma"
import { ProductCatalog } from "../components/ProductCatalog"

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
            <section className="relative pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-6"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t("news.backHome")}
                    </Link>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
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
