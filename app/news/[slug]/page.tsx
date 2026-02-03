import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import prisma from "@/lib/prisma"

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function NewsDetailPage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the news content by slug
    const news = await prisma.content.findFirst({
        where: {
            slug: slug,
            type: "news",
            published: true,
        }
    })

    if (!news) {
        notFound()
    }

    const getLocalizedTitle = (item: { titleBg: string; titleEn: string; titleEs: string }) => {
        switch (locale) {
            case "bg":
                return item.titleBg
            case "es":
                return item.titleEs
            default:
                return item.titleEn
        }
    }

    const getLocalizedBody = (item: { bodyBg: string | null; bodyEn: string | null; bodyEs: string | null }) => {
        switch (locale) {
            case "bg":
                return item.bodyBg
            case "es":
                return item.bodyEs
            default:
                return item.bodyEn
        }
    }

    const newsTitle = getLocalizedTitle(news)
    const newsBody = getLocalizedBody(news)

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
            <section className="relative pt-24 sm:pt-32 pb-6 sm:pb-8 px-4">
                <div className="mx-auto max-w-4xl">
                    {/* Breadcrumb - simplified on mobile */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-4 sm:mb-6 overflow-hidden">
                        <Link href="/" className="hover:text-emerald-400 transition-colors shrink-0">
                            {t("news.backHome")}
                        </Link>
                        <span className="shrink-0">/</span>
                        <Link href="/news" className="hover:text-emerald-400 transition-colors shrink-0">
                            {t("news.title")}
                        </Link>
                        <span className="hidden sm:inline shrink-0">/</span>
                        <span className="hidden sm:inline text-slate-300 truncate">{newsTitle}</span>
                    </div>

                    {/* News Badge - Clickable */}
                    <Link
                        href="/news"
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 sm:mb-4 bg-cyan-500/20 text-cyan-400 hover:opacity-80 transition-opacity"
                    >
                        {t("news.title")}
                    </Link>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {newsTitle}
                    </h1>

                    <p className="text-slate-400 mt-3 sm:mt-4 text-sm sm:text-base">
                        {new Date(news.createdAt).toLocaleDateString(
                            locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-US",
                            { year: "numeric", month: "long", day: "numeric" }
                        )}
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="relative py-4 sm:py-8 px-4">
                <div className="mx-auto max-w-4xl">
                    <article className="glass rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">
                        {news.image && (
                            <div className="relative h-48 sm:h-64 md:h-96 overflow-hidden">
                                <img
                                    src={news.image}
                                    alt={newsTitle}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                            </div>
                        )}
                        <div className="p-4 sm:p-8 md:p-12">
                            {newsBody ? (
                                <div className="prose prose-invert prose-sm sm:prose-lg max-w-none text-slate-300 leading-relaxed whitespace-pre-line break-words">
                                    {newsBody}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">{t("menu.noContent")}</p>
                            )}
                        </div>
                    </article>

                    {/* Back Link */}
                    <div className="mt-8">
                        <Link
                            href="/news"
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t("news.seeAll")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {t("footer.rights")}</p>
                </div>
            </footer>
        </div>
    )
}

export async function generateStaticParams() {
    const newsItems = await prisma.content.findMany({
        where: {
            type: "news",
            published: true,
            slug: { not: null },
        },
        select: { slug: true }
    })

    return newsItems
        .filter(item => item.slug !== null)
        .map((item) => ({
            slug: item.slug!,
        }))
}
