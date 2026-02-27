import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import prisma from "@/lib/prisma"
import { ArrowLeft } from "lucide-react"

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function ServiceDetailPage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the service content by slug
    const service = await prisma.content.findFirst({
        where: {
            slug: slug,
            type: "service",
            published: true,
        }
    })

    if (!service) {
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

    const serviceTitle = getLocalizedTitle(service)
    const serviceBody = getLocalizedBody(service)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digital4d.eu"
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim()

    const serviceJsonLd = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: serviceTitle,
        description: serviceBody ? stripHtml(serviceBody).slice(0, 200) : serviceTitle,
        image: service.image || undefined,
        provider: {
            "@type": "Organization",
            name: "digital4d",
            url: siteUrl,
        },
        serviceType: "3D Printing",
        areaServed: "BG",
        url: `${siteUrl}/services/${service.slug}`,
    }

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
            { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}/services` },
            { "@type": "ListItem", position: 3, name: serviceTitle },
        ],
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* JSON-LD: Service + Breadcrumb */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([serviceJsonLd, breadcrumbJsonLd]) }}
            />

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
                        href="/services"
                        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    {/* Desktop: Full breadcrumb */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link href="/" className="hover:text-emerald-400 transition-colors">
                            {t("news.backHome")}
                        </Link>
                        <span>/</span>
                        <Link href="/services" className="hover:text-emerald-400 transition-colors">
                            {t("services.title")}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-300">{serviceTitle}</span>
                    </div>

                    {/* Service Badge - Clickable */}
                    <Link
                        href="/services"
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-purple-500/20 text-purple-400 hover:opacity-80 transition-opacity"
                    >
                        {t("services.badge")}
                    </Link>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words">
                        {serviceTitle}
                    </h1>

                    <p className="text-slate-400 mt-4">
                        {new Date(service.createdAt).toLocaleDateString(
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
                        {service.image && (
                            <div className="relative h-48 sm:h-64 md:h-96 overflow-hidden">
                                <img
                                    src={service.image}
                                    alt={serviceTitle}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                            </div>
                        )}
                        <div className="p-4 sm:p-8 md:p-12">
                            {serviceBody ? (
                                <div
                                    className="prose prose-invert prose sm:prose-lg max-w-none text-slate-300 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: serviceBody }}
                                />
                            ) : (
                                <p className="text-slate-400 italic">{t("menu.noContent")}</p>
                            )}
                        </div>
                    </article>

                    {/* Back Link */}
                    <div className="mt-8">
                        <Link
                            href="/services"
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t("services.backToServices")}
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
    const services = await prisma.content.findMany({
        where: {
            type: "service",
            published: true,
            slug: { not: null },
        },
        select: { slug: true }
    })

    return services
        .filter(service => service.slug !== null)
        .map((service) => ({
            slug: service.slug!,
        }))
}
