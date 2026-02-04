"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

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
    green: "bg-green-500/20 text-green-400",
    gray: "bg-gray-500/20 text-gray-400",
}

interface Product {
    id: string
    slug: string
    name: string
    description: string
    price: string
    salePrice: string | null
    onSale: boolean
    currency: string
    priceType: string
    fileType: string | null
    category: string
    categoryColor: string
    categoryName: string
    image: string | null
    featured: boolean
}

interface HomeProductsSectionProps {
    products: Product[]
}

export function HomeProductsSection({ products }: HomeProductsSectionProps) {
    const t = useTranslations("homeProducts")
    const tProducts = useTranslations("products")

    if (products.length === 0) return null

    return (
        <section id="products" className="relative py-10 sm:py-12 px-4">
            <div className="mx-auto max-w-4xl">
                <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {t("title")}
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">{t("subtitle")}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-5 lg:grid-cols-4">
                    {products.map((product) => {
                        const discountPercent = product.onSale && product.price && product.salePrice
                            ? Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.price)) * 100)
                            : 0

                        return (
                            <Link
                                key={product.id}
                                href={`/products/${product.slug}`}
                                className="group glass rounded-xl overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
                            >
                                {/* Image */}
                                <div className="relative h-32 sm:h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                                    {product.image ? (
                                        <>
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sale Badge */}
                                    {product.onSale && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">
                                                {tProducts("onSale")}
                                            </span>
                                            {discountPercent > 0 && (
                                                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">
                                                    -{discountPercent}%
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Featured Star */}
                                    {product.featured && (
                                        <div className="absolute top-2 left-2 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500/90 rounded-full flex items-center justify-center shadow-lg">
                                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Category Badge */}
                                <div className="px-3 sm:px-4 pt-2 -mt-4 relative z-10">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${COLOR_CLASSES[product.categoryColor] || COLOR_CLASSES.gray}`}
                                    >
                                        {product.categoryName}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-3 sm:p-4 pt-1">
                                    <h3 className="text-base sm:text-lg font-bold mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                        {product.name}
                                    </h3>
                                    {product.description && (
                                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                                            {product.description.length > 100
                                                ? product.description.substring(0, 100) + '...'
                                                : product.description}
                                        </p>
                                    )}

                                    {/* Price Row */}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1.5">
                                            {product.fileType === "digital" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-medium">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    {tProducts("buyNow")}
                                                </span>
                                            ) : product.fileType === "service" || product.priceType === "quote" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-medium">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    {tProducts("getQuote")}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] sm:text-xs font-medium">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    {tProducts("orderNow")}
                                                </span>
                                            )}
                                        </div>
                                        {/* Price display - show for all except pure quote products */}
                                        {product.priceType !== "quote" && (
                                            <div className="text-right">
                                                {product.onSale && product.salePrice ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm sm:text-base font-bold text-emerald-400">
                                                            {product.salePrice} {product.currency}
                                                        </span>
                                                        <span className="text-[10px] sm:text-xs text-slate-500 line-through">
                                                            {product.price} {product.currency}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm sm:text-base font-bold text-white">
                                                        {product.priceType === "from" ? `${tProducts("from")} ` : ""}{product.price} {product.currency}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* View All Button */}
                <div className="mt-4 sm:mt-6 text-center">
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-all"
                    >
                        {t("viewAll")}
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    )
}
