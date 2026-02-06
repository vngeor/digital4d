import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import prisma from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

const RESERVED_SLUGS = ['news', 'admin', 'login', 'api', 'register', 'services']

interface PageProps {
    params: Promise<{ menuSlug: string; contentSlug: string }>
}

export default async function ContentDetailPage({ params }: PageProps) {
    const { menuSlug, contentSlug } = await params

    // Skip if this is a reserved slug
    if (RESERVED_SLUGS.includes(menuSlug)) {
        notFound()
    }

    const t = await getTranslations()
    const locale = await getLocale()

    // First, try to find a menu item with this slug
    const menuItem = await prisma.menuItem.findUnique({
        where: { slug: menuSlug, published: true },
    })

    // Try to find content type if no menu item
    let contentType = null
    if (!menuItem) {
        contentType = await prisma.contentType.findUnique({
            where: { slug: menuSlug }
        })
    }

    // If neither exists, 404
    if (!menuItem && !contentType) {
        notFound()
    }

    // Fetch the content - either by menuItemId or by type
    const content = await prisma.content.findFirst({
        where: menuItem
            ? {
                slug: contentSlug,
                menuItemId: menuItem.id,
                published: true,
            }
            : {
                slug: contentSlug,
                type: menuSlug,
                published: true,
            }
    })

    if (!content) {
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

    // Get section title from menu item or content type
    const sectionTitle = menuItem
        ? getLocalizedTitle(menuItem)
        : contentType
            ? (locale === "bg" ? contentType.nameBg : locale === "es" ? contentType.nameEs : contentType.nameEn)
            : menuSlug

    const contentTitle = getLocalizedTitle(content)
    const contentBody = getLocalizedBody(content)

    // Color classes for badge (all 16 colors)
    const colorClasses: Record<string, string> = {
        cyan: "bg-cyan-500/20 text-cyan-400",
        purple: "bg-purple-500/20 text-purple-400",
        emerald: "bg-emerald-500/20 text-emerald-400",
        amber: "bg-amber-500/20 text-amber-400",
        red: "bg-red-500/20 text-red-400",
        blue: "bg-blue-500/20 text-blue-400",
        pink: "bg-pink-500/20 text-pink-400",
        orange: "bg-orange-500/20 text-orange-400",
        teal: "bg-teal-500/20 text-teal-400",
        indigo: "bg-indigo-500/20 text-indigo-400",
        rose: "bg-rose-500/20 text-rose-400",
        lime: "bg-lime-500/20 text-lime-400",
        sky: "bg-sky-500/20 text-sky-400",
        violet: "bg-violet-500/20 text-violet-400",
        fuchsia: "bg-fuchsia-500/20 text-fuchsia-400",
        yellow: "bg-yellow-500/20 text-yellow-400",
    }
    const badgeColor = contentType?.color || (menuItem?.type === "news" ? "cyan" : "purple")

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
                <div className="mx-auto max-w-4xl">
                    {/* Mobile: Simple back arrow */}
                    <Link
                        href={`/${menuSlug}`}
                        className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    {/* Desktop: Full breadcrumb */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link href="/" className="hover:text-emerald-400 transition-colors">
                            {t("news.backHome")}
                        </Link>
                        <span>/</span>
                        <Link href={`/${menuSlug}`} className="hover:text-emerald-400 transition-colors">
                            {sectionTitle}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-300">{contentTitle}</span>
                    </div>

                    {/* Type Badge - Clickable */}
                    <Link
                        href={`/${menuSlug}`}
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 hover:opacity-80 transition-opacity ${colorClasses[badgeColor] || colorClasses.purple}`}
                    >
                        {sectionTitle}
                    </Link>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words">
                        {contentTitle}
                    </h1>

                    <p className="text-slate-400 mt-4">
                        {new Date(content.createdAt).toLocaleDateString(
                            locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-US",
                            { year: "numeric", month: "long", day: "numeric" }
                        )}
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-4xl">
                    <article className="glass rounded-2xl border border-white/10 overflow-hidden">
                        {content.image && (
                            <div className="relative h-64 md:h-96 overflow-hidden">
                                <img
                                    src={content.image}
                                    alt={contentTitle}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                            </div>
                        )}
                        <div className="p-8 md:p-12">
                            {contentBody ? (
                                <div
                                    className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-emerald-400 prose-strong:text-white"
                                    dangerouslySetInnerHTML={{ __html: contentBody }}
                                />
                            ) : (
                                <p className="text-slate-400 italic">{t("menu.noContent")}</p>
                            )}
                        </div>
                    </article>

                    {/* Back Link */}
                    <div className="mt-8">
                        <Link
                            href={`/${menuSlug}`}
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t("menu.backToMenu", { menu: sectionTitle })}
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
    // Get content linked to menu items
    const menuContents = await prisma.content.findMany({
        where: {
            published: true,
            slug: { not: null },
            menuItemId: { not: null }
        },
        include: {
            menuItem: {
                select: { slug: true }
            }
        }
    })

    // Get content linked to types (no menu item)
    const typeContents = await prisma.content.findMany({
        where: {
            published: true,
            slug: { not: null },
            menuItemId: null
        },
        select: { type: true, slug: true }
    })

    // Combine both
    const allParams = [
        ...menuContents
            .filter(content => content.menuItem !== null)
            .map((content) => ({
                menuSlug: content.menuItem!.slug,
                contentSlug: content.slug!,
            })),
        ...typeContents.map((content) => ({
            menuSlug: content.type,
            contentSlug: content.slug!,
        }))
    ]

    return allParams
}
