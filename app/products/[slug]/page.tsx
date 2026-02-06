import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import { ProductActions } from "../../components/ProductActions"
import prisma from "@/lib/prisma"
import type { Product } from "@prisma/client"
import type { Metadata } from "next"

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const locale = await getLocale()

    const product = await prisma.product.findFirst({
        where: { slug, published: true }
    })

    if (!product) {
        return { title: "Product Not Found" }
    }

    const name = locale === "bg" ? product.nameBg : locale === "es" ? product.nameEs : product.nameEn
    const desc = locale === "bg" ? product.descBg : locale === "es" ? product.descEs : product.descEn
    const description = desc ? desc.slice(0, 160).replace(/<[^>]*>/g, "") : `${name} - digital4d`

    return {
        title: name,
        description,
        openGraph: {
            title: `${name} | digital4d`,
            description,
            type: "website",
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
            images: product.image ? [
                {
                    url: product.image,
                    width: 800,
                    height: 600,
                    alt: name,
                }
            ] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title: name,
            description,
            images: product.image ? [product.image] : undefined,
        },
    }
}

const COLOR_CLASSES: Record<string, string> = {
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

export default async function ProductDetailPage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the product by slug
    const product = await prisma.product.findFirst({
        where: {
            slug: slug,
            published: true,
        }
    })

    if (!product) {
        notFound()
    }

    // Fetch the category
    const category = await prisma.productCategory.findFirst({
        where: { slug: product.category }
    })

    // Fetch related products (same category, excluding current)
    const relatedProducts = await prisma.product.findMany({
        where: {
            category: product.category,
            published: true,
            NOT: { id: product.id }
        },
        take: 3,
        orderBy: [{ featured: "desc" }, { order: "asc" }]
    })

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg":
                return item.nameBg
            case "es":
                return item.nameEs
            default:
                return item.nameEn
        }
    }

    const getLocalizedDesc = (item: { descBg: string | null; descEn: string | null; descEs: string | null }) => {
        switch (locale) {
            case "bg":
                return item.descBg
            case "es":
                return item.descEs
            default:
                return item.descEn
        }
    }

    const productName = getLocalizedName(product)
    const productDesc = getLocalizedDesc(product)
    const categoryName = category ? getLocalizedName(category) : product.category
    const categoryColor = category?.color || "gray"

    const formatPrice = () => {
        if (product.priceType === "quote") return t("products.requestQuote")
        if (!product.price) return null
        const price = parseFloat(product.price.toString())
        const prefix = product.priceType === "from" ? t("products.from") + " " : ""
        return `${prefix}${price.toFixed(2)} ${product.currency}`
    }

    const price = formatPrice()

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
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link href="/" className="hover:text-emerald-400 transition-colors">
                            {t("news.backHome")}
                        </Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-emerald-400 transition-colors">
                            {t("products.title")}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-300">{productName}</span>
                    </div>
                </div>
            </section>

            {/* Product Content */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 gap-3 md:gap-12">
                        {/* Image */}
                        <div className="glass rounded-xl md:rounded-2xl border border-white/10 overflow-hidden">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={productName}
                                    className="w-full h-full object-cover min-h-[180px] md:min-h-[400px]"
                                />
                            ) : (
                                <div className="w-full h-full min-h-[180px] md:min-h-[400px] flex items-center justify-center bg-white/5">
                                    <svg className="w-12 h-12 md:w-24 md:h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="space-y-2 md:space-y-6">
                            {/* Category Badge */}
                            <Link
                                href={`/products?category=${product.category}`}
                                className={`inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium hover:opacity-80 transition-opacity ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"
                                    }`}
                            >
                                {categoryName}
                            </Link>

                            {/* Name */}
                            <h1 className="text-base md:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
                                {productName}
                            </h1>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1 md:gap-2">
                                {product.onSale && (
                                    <>
                                        <Link
                                            href="/products?sale=true"
                                            className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                                        >
                                            {t("products.onSale")}
                                        </Link>
                                        {product.price && product.salePrice && (
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-red-500 text-white">
                                                -{Math.round((1 - parseFloat(product.salePrice.toString()) / parseFloat(product.price.toString())) * 100)}%
                                            </span>
                                        )}
                                    </>
                                )}
                                {product.inStock ? (
                                    <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-emerald-500/20 text-emerald-400">
                                        {t("products.inStock")}
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-gray-500/20 text-gray-400">
                                        {t("products.outOfStock")}
                                    </span>
                                )}
                            </div>

                            {/* Price */}
                            <div className="p-2 md:p-6 rounded-lg md:rounded-xl bg-white/5 border border-white/10">
                                {product.onSale && product.salePrice ? (
                                    <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                                        <span className="text-lg md:text-4xl font-bold text-emerald-400">
                                            {parseFloat(product.salePrice.toString()).toFixed(2)} {product.currency}
                                        </span>
                                        <span className="text-xs md:text-xl text-gray-500 line-through">
                                            {price}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-lg md:text-4xl font-bold text-white">
                                        {price || "-"}
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <ProductActions
                                product={JSON.parse(JSON.stringify(product))}
                            />

                        </div>
                    </div>

                    {/* Description - full width below the grid */}
                    {productDesc && (
                        <div className="mt-6 md:mt-10">
                            <h2 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3">
                                {t("products.description")}
                            </h2>
                            <div className="prose prose-invert prose-slate max-w-none text-sm md:text-base text-slate-300 leading-relaxed whitespace-pre-line break-words overflow-hidden">
                                {productDesc}
                            </div>
                        </div>
                    )}

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-8 md:mt-16">
                            <h2 className="text-lg md:text-2xl font-bold text-white mb-4 md:mb-8">
                                {t("products.relatedProducts")}
                            </h2>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
                                {relatedProducts.map((related: Product) => {
                                    const relatedName = getLocalizedName(related)
                                    const relatedPrice = related.price
                                        ? `${parseFloat(related.price.toString()).toFixed(2)} ${related.currency}`
                                        : "-"

                                    // Calculate discount percentage for related products
                                    const relatedDiscountPercent = related.onSale && related.price && related.salePrice
                                        ? Math.round((1 - parseFloat(related.salePrice.toString()) / parseFloat(related.price.toString())) * 100)
                                        : 0

                                    return (
                                        <Link
                                            key={related.id}
                                            href={`/products/${related.slug}`}
                                            className="group glass rounded-xl md:rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="relative h-28 md:h-40 overflow-hidden bg-white/5">
                                                {related.image ? (
                                                    <img
                                                        src={related.image}
                                                        alt={relatedName}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {/* Sale badges for related products */}
                                                {related.onSale && (
                                                    <div className="absolute top-2 right-2 flex gap-1">
                                                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-500 text-white">
                                                            {t("products.onSale")}
                                                        </span>
                                                        {relatedDiscountPercent > 0 && (
                                                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-500 text-white">
                                                                -{relatedDiscountPercent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 md:p-4">
                                                <h3 className="font-semibold text-xs md:text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                    {relatedName}
                                                </h3>
                                                {/* Price */}
                                                <div className="mt-1 md:mt-2">
                                                    {related.priceType === "quote" ? (
                                                        <span className="text-[10px] md:text-sm text-amber-400 font-medium">
                                                            {t("products.requestQuote")}
                                                        </span>
                                                    ) : related.onSale && related.salePrice ? (
                                                        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                                                            <span className="text-xs md:text-base font-bold text-emerald-400">
                                                                {parseFloat(related.salePrice.toString()).toFixed(2)} {related.currency}
                                                            </span>
                                                            <span className="text-[10px] md:text-xs text-gray-500 line-through">
                                                                {relatedPrice}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs md:text-base font-bold text-white">
                                                            {relatedPrice}
                                                        </span>
                                                    )}
                                                </div>
                                                {related.fileType === "digital" ? (
                                                    <span className="inline-flex items-center gap-1 md:gap-1.5 mt-1 md:mt-2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        {t("products.buyNow")}
                                                    </span>
                                                ) : related.fileType === "service" || related.priceType === "quote" ? (
                                                    <span className="inline-flex items-center gap-1 md:gap-1.5 mt-1 md:mt-2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-amber-500/20 text-amber-400 text-[10px] md:text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                        {t("products.getQuote")}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 md:gap-1.5 mt-1 md:mt-2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-purple-500/20 text-purple-400 text-[10px] md:text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        {t("products.orderNow")}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Back Link */}
                    <div className="mt-12">
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t("products.backToProducts")}
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
    const products = await prisma.product.findMany({
        where: {
            published: true,
        },
        select: { slug: true }
    })

    return products.map((product: { slug: string }) => ({
        slug: product.slug,
    }))
}
