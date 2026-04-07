import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import { ProductCatalog } from "../../components/ProductCatalog"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import Footer from "@/app/components/Footer"
import { sanitizeHtml } from "@/lib/sanitize"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { ArrowLeft, BadgeCheck } from "lucide-react"
import type { Metadata } from "next"

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const locale = await getLocale()

    const brand = await prisma.brand.findFirst({ where: { slug } })
    if (!brand) return { title: "Brand Not Found" }

    const name = locale === "bg" ? brand.nameBg : locale === "es" ? brand.nameEs : brand.nameEn
    const desc = locale === "bg" ? brand.descBg : locale === "es" ? brand.descEs : brand.descEn
    const description = desc ? desc.slice(0, 160).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ") : `${name} - digital4d`

    return {
        title: `${name} | digital4d`,
        description,
        openGraph: {
            title: `${name} | digital4d`,
            description,
            type: "website",
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
            images: brand.image ? [{ url: brand.image, width: 400, height: 400, alt: name }] : undefined,
        },
    }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default async function BrandDetailPage({ params }: PageProps) {
    const { slug } = await params
    if (!SLUG_PATTERN.test(slug)) notFound()

    const t = await getTranslations()
    const locale = await getLocale()

    const brand = await prisma.brand.findFirst({ where: { slug } })
    if (!brand) notFound()

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg
            case "es": return item.nameEs
            default: return item.nameEn
        }
    }

    const getLocalizedDesc = (item: { descBg?: string | null; descEn?: string | null; descEs?: string | null }) => {
        switch (locale) {
            case "bg": return item.descBg
            case "es": return item.descEs
            default: return item.descEn
        }
    }

    const brandName = getLocalizedName(brand)
    const brandDesc = getLocalizedDesc(brand)

    // Fetch products for this brand
    const products = await prisma.product.findMany({
        where: { brandId: brand.id, published: true },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
        include: {
            brand: true,
            variants: { include: { color: true }, orderBy: { order: "asc" } },
            packages: { include: { weight: { select: { label: true } }, packageVariants: { select: { variantId: true, status: true } } }, orderBy: { order: "asc" } },
        },
    })

    // Fetch categories for ProductCatalog
    const categories = await prisma.productCategory.findMany({
        include: { children: true, parent: true },
        orderBy: [{ order: "asc" }],
    })

    // Fetch coupons for product badges
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

    // Wishlist
    let wishlistedProductIds: string[] = []
    const session = await auth()
    if (session?.user?.id) {
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId: session.user.id },
            select: { productId: true },
        })
        wishlistedProductIds = wishlistItems.map(w => w.productId)
    }

    // Title alignment
    const alignClass = brand.titleAlign === "center" ? "text-center" : brand.titleAlign === "right" ? "text-right" : "text-left"

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            <BackgroundOrbs />
            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-20 md:pt-24 pb-6 px-4">
                <div className="mx-auto max-w-6xl">
                    {/* Back button + Breadcrumb inline */}
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <Link
                            href="/brands"
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    <nav className="flex items-center gap-2 text-sm text-slate-400">
                        <Link href="/brands" className="hover:text-emerald-400 transition-colors">
                            {t("brandsPage.title")}
                        </Link>
                        <span>→</span>
                        <span className="text-emerald-400">{brandName}</span>
                    </nav>
                    </div>

                    {/* Brand Header: Logo left + Title & Description right */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                        {/* Logo */}
                        {brand.image && (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                <img
                                    src={brand.image}
                                    alt={brandName}
                                    className="w-full h-full object-contain p-2"
                                />
                            </div>
                        )}

                        {/* Title + Description */}
                        <div className="flex-1 min-w-0">
                            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words ${alignClass}`}>
                                {brandName}
                            </h1>

                            {brandDesc && (
                                <div
                                    className="prose prose-invert prose-emerald max-w-none mt-3 sm:mt-4 text-slate-300 text-sm sm:text-base"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(brandDesc) }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Products */}
            {products.length > 0 ? (
                <ProductCatalog
                    products={JSON.parse(JSON.stringify(products))}
                    categories={JSON.parse(JSON.stringify(categories))}
                    locale={locale}
                    wishlistedProductIds={wishlistedProductIds}
                    couponMap={couponMap}
                />
            ) : (
                <section className="relative py-8 px-4">
                    <div className="mx-auto max-w-6xl text-center py-12 text-slate-400">
                        <BadgeCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t("brandsPage.noProducts")}</p>
                    </div>
                </section>
            )}

            <Footer />
        </div>
    )
}

export async function generateStaticParams() {
    const brands = await prisma.brand.findMany({
        select: { slug: true },
    })
    return brands.map((brand: { slug: string }) => ({
        slug: brand.slug,
    }))
}
