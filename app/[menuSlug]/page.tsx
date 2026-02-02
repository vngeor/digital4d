import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import prisma from "@/lib/prisma"

const RESERVED_SLUGS = ['news', 'admin', 'login', 'api', 'register']

interface PageProps {
    params: Promise<{ menuSlug: string }>
}

export default async function MenuLandingPage({ params }: PageProps) {
    const { menuSlug } = await params

    // Skip if this is a reserved slug (handled by other routes)
    if (RESERVED_SLUGS.includes(menuSlug)) {
        notFound()
    }

    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the menu item with its content
    const menuItem = await prisma.menuItem.findUnique({
        where: { slug: menuSlug, published: true },
        include: {
            contents: {
                where: { published: true },
                orderBy: [{ order: "asc" }, { createdAt: "desc" }],
            }
        }
    })

    if (!menuItem) {
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

    const menuTitle = getLocalizedTitle(menuItem)

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
                        {menuTitle}
                    </h1>
                </div>
            </section>

            {/* Content Grid */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {menuItem.contents.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>{t("menu.noContent")}</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {menuItem.contents.map((content) => {
                                const title = getLocalizedTitle(content)
                                const body = getLocalizedBody(content)
                                const contentUrl = content.slug
                                    ? `/${menuSlug}/${content.slug}`
                                    : `/${menuSlug}`

                                return (
                                    <Link
                                        key={content.id}
                                        href={contentUrl}
                                        className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                    >
                                        {content.image && (
                                            <div className="relative h-48 overflow-hidden">
                                                <img
                                                    src={content.image}
                                                    alt={title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                            </div>
                                        )}
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors mb-3">
                                                {title}
                                            </h3>
                                            {body && (
                                                <p className="text-slate-400 line-clamp-3">
                                                    {body}
                                                </p>
                                            )}
                                            <span className="inline-flex items-center gap-2 mt-4 text-emerald-400 font-medium">
                                                {t("news.readMore")}
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
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
    const menuItems = await prisma.menuItem.findMany({
        where: { published: true },
        select: { slug: true }
    })

    return menuItems.map((item) => ({
        menuSlug: item.slug,
    }))
}
