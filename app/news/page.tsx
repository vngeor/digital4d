import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import { NewsSection } from "../components/NewsSection"
import prisma from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

export default async function NewsPage() {
    const t = await getTranslations("news")
    const tFooter = await getTranslations("footer")
    const locale = await getLocale()

    // Fetch only news content from database (newest first)
    const dbNews = await prisma.content.findMany({
        where: {
            type: "news",
            published: true,
        },
        orderBy: { createdAt: "desc" },
    })

    // Fetch content types for localized category names
    const contentTypes = await prisma.contentType.findMany()
    const contentTypeMap = new Map(contentTypes.map(ct => [ct.slug, ct]))

    // Fallback translations for common types
    const typeTranslations: Record<string, Record<string, string>> = {
        news: { bg: "Новина", en: "News", es: "Noticia" },
        service: { bg: "Услуга", en: "Service", es: "Servicio" },
    }

    // Map to locale-specific fields
    const newsItems = dbNews.map((item) => {
        const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof item
        const bodyKey = `body${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof item

        // Get localized category name from ContentType or fallback
        const contentType = contentTypeMap.get(item.type)
        let categoryName = item.type.charAt(0).toUpperCase() + item.type.slice(1)
        if (contentType) {
            const nameKey = `name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof contentType
            categoryName = (contentType[nameKey] as string) || contentType.nameEn
        } else if (typeTranslations[item.type]) {
            categoryName = typeTranslations[item.type][locale] || typeTranslations[item.type].en
        }

        return {
            title: (item[titleKey] as string) || item.titleEn,
            description: (item[bodyKey] as string) || item.bodyEn || "",
            date: new Date(item.createdAt).toLocaleDateString(locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            category: categoryName,
            categoryColor: contentType?.color || "cyan",
            image: item.image,
            slug: item.slug,
        }
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            {/* Navbar */}
            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-6 sm:pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {t("allNews")}
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-lg mt-3 sm:mt-4">{t("subtitle")}</p>
                </div>
            </section>

            {/* News Section */}
            <NewsSection newsItems={newsItems} initialLimit={6} loadMoreCount={6} />

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {tFooter("rights")}</p>
                </div>
            </footer>
        </div>
    )
}
