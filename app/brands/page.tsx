import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../components/Header"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import Footer from "@/app/components/Footer"
import prisma from "@/lib/prisma"
import { BadgeCheck } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("brandsPage")
    const locale = await getLocale()

    return {
        title: `${t("title")} | digital4d`,
        description: t("subtitle"),
        openGraph: {
            title: `${t("title")} | digital4d`,
            description: t("subtitle"),
            type: "website",
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
        },
    }
}

export default async function BrandsPage() {
    const t = await getTranslations("brandsPage")
    const locale = await getLocale()

    const brands = await prisma.brand.findMany({
        orderBy: [{ order: "asc" }, { nameEn: "asc" }],
        include: { _count: { select: { products: true } } },
    })

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg
            case "es": return item.nameEs
            default: return item.nameEn
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            <BackgroundOrbs />
            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {t("title")}
                    </h1>
                    <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-2xl mx-auto">
                        {t("subtitle")}
                    </p>
                </div>
            </section>

            {/* Brands Grid */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {brands.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <BadgeCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>{t("noBrands")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {brands.map((brand) => {
                                const brandName = getLocalizedName(brand)
                                return (
                                    <Link
                                        key={brand.id}
                                        href={`/brands/${brand.slug}`}
                                        className="group glass rounded-xl p-4 sm:p-6 border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10 text-center"
                                    >
                                        {brand.image ? (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mx-auto mb-3 sm:mb-4 bg-white/5">
                                                <img
                                                    src={brand.image}
                                                    alt={brandName}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                                <BadgeCheck className="w-8 h-8 text-gray-500" />
                                            </div>
                                        )}
                                        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors text-sm sm:text-base">
                                            {brandName}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                                            {t("productCount", { count: brand._count.products })}
                                        </p>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    )
}
