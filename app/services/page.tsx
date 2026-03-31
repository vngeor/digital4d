import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import prisma from "@/lib/prisma"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("services")
    const locale = await getLocale()

    const title = t("title")
    const description = t("badge")

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

export default async function ServicesPage() {
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch only published services (type: "service")
    const services = await prisma.content.findMany({
        where: {
            type: "service",
            published: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })

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
                        {t("services.title")}
                    </h1>
                    <p className="text-slate-400 text-lg mt-4">{t("services.subtitle")}</p>
                </div>
            </section>

            {/* Services Grid */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {services.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>{t("menu.noContent")}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {services.map((service) => {
                                const title = getLocalizedTitle(service)
                                const body = getLocalizedBody(service)
                                const serviceUrl = service.slug
                                    ? `/services/${service.slug}`
                                    : "/services"

                                return (
                                    <Link
                                        key={service.id}
                                        href={serviceUrl}
                                        className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                    >
                                        {service.image && (
                                            <div className="relative h-48 overflow-hidden">
                                                <img
                                                    src={service.image}
                                                    alt={title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                            </div>
                                        )}
                                        <div className="p-6">
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-500/20 text-purple-400">
                                                {t("services.badge")}
                                            </span>
                                            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors mb-3">
                                                {title}
                                            </h3>
                                            {body && (
                                                <p className="text-slate-400 line-clamp-3">
                                                    {body}
                                                </p>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium group-hover:bg-emerald-500/30 transition-colors">
                                                {t("news.readMore")}
                                                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
