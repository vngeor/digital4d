"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Ticket, Eye } from "lucide-react"
import { QuickViewModal } from "./QuickViewModal"
import { parseTiers } from "@/lib/bulkDiscount"

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
    status: string
    featured: boolean
    isNew?: boolean
    brand: { name: string; slug: string } | null
    productUrl: string
}

interface CouponBadge {
    type: string
    value: string
    currency: string | null
}

// Types for QuickViewModal compatibility
interface QVColor { nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null }
interface QVVariant { id: string; image: string | null; status: string; colorId: string; color: QVColor }
interface QVPackage { id: string; price: string; salePrice: string | null; status: string; weight: { label: string }; packageVariants: { variantId: string; status: string }[] }
interface QVProduct {
    id: string; slug: string; category: string
    nameBg: string; nameEn: string; nameEs: string
    descBg?: string | null; descEn?: string | null; descEs?: string | null
    price: string | null; salePrice: string | null; onSale: boolean; currency: string
    priceType: string; fileType: string | null; status: string
    image: string | null; gallery: string[]
    featured: boolean; bestSeller: boolean; createdAt: string
    brand: { slug: string; nameBg: string; nameEn: string; nameEs: string } | null
    variants: QVVariant[]
    packages: QVPackage[]
    bulkDiscountTiers?: string | null
}
interface QVCategory {
    id: string; slug: string; parentId?: string | null
    nameBg: string; nameEn: string; nameEs: string
    children?: { id: string; slug: string }[]
    parent?: { slug: string } | null
}

interface HomeProductsSectionProps {
    products: Product[]
    couponMap?: Record<string, CouponBadge>
    bestSellerIds?: string[]
    locale?: string
    quickViewProducts?: Record<string, QVProduct>
    categories?: QVCategory[]
}

export function HomeProductsSection({ products, couponMap, bestSellerIds = [], locale = "bg", quickViewProducts, categories }: HomeProductsSectionProps) {
    const t = useTranslations("homeProducts")
    const tProducts = useTranslations("products")
    const router = useRouter()

    const [quickViewQVProduct, setQuickViewQVProduct] = useState<QVProduct | null>(null)

    const [isMobile, setIsMobile] = useState(false)
    const [itemsPerView, setItemsPerView] = useState(2)
    useEffect(() => {
        const update = () => {
            const isNarrow = window.innerWidth < 1024
            setIsMobile(isNarrow)
            setItemsPerView(isNarrow ? 2 : 4)
        }
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])
    const useCarousel = products.length > 4 && isMobile
    const scrollRef = useRef<HTMLDivElement>(null)
    const [activeSlide, setActiveSlide] = useState(0)

    // Reset slide position when switching between carousel and grid on resize
    useEffect(() => { setActiveSlide(0) }, [useCarousel])

    const totalPages = useCarousel ? Math.ceil(products.length / (itemsPerView || 1)) : 0

    const scrollToPage = useCallback((page: number) => {
        if (!scrollRef.current) return
        const firstCard = scrollRef.current.children[0] as HTMLElement
        if (!firstCard) return
        const gap = window.innerWidth >= 768 ? 20 : window.innerWidth >= 640 ? 12 : 8
        const cardWidth = firstCard.offsetWidth + gap
        scrollRef.current.scrollTo({ left: page * cardWidth * itemsPerView, behavior: "smooth" })
    }, [itemsPerView])

    // Auto-scroll every 5 seconds
    useEffect(() => {
        if (!useCarousel || totalPages <= 1) return
        const interval = setInterval(() => {
            setActiveSlide(prev => {
                const next = (prev + 1) % totalPages
                scrollToPage(next)
                return next
            })
        }, 5000)
        return () => clearInterval(interval)
    }, [useCarousel, totalPages, scrollToPage])

    // Track scroll position for dot indicators
    useEffect(() => {
        if (!useCarousel || !scrollRef.current) return
        const container = scrollRef.current
        const handleScroll = () => {
            const firstCard = container.children[0] as HTMLElement
            if (!firstCard) return
            const gap = window.innerWidth >= 768 ? 20 : window.innerWidth >= 640 ? 12 : 8
            const cardWidth = firstCard.offsetWidth + gap
            const page = Math.round(container.scrollLeft / (cardWidth * itemsPerView))
            setActiveSlide(Math.min(page, totalPages - 1))
        }
        container.addEventListener("scroll", handleScroll, { passive: true })
        return () => container.removeEventListener("scroll", handleScroll)
    }, [useCarousel, itemsPerView, totalPages])

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

                <div
                    ref={scrollRef}
                    className={useCarousel
                        ? "flex gap-2 sm:gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
                        : "grid grid-cols-2 gap-2 sm:gap-3 md:gap-5 lg:grid-cols-4 contain-content"
                    }
                >
                    {products.map((product) => {
                        const discountPercent = product.onSale && product.price && product.salePrice
                            ? Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.price)) * 100)
                            : 0

                        return (
                            <div
                                key={product.id}
                                onClick={() => router.push(product.productUrl)}
                                className={`group glass rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col h-full cursor-pointer ${useCarousel ? "snap-start shrink-0 w-[calc(50%-4px)] sm:w-[calc(50%-6px)] lg:w-[calc(25%-15px)]" : ""}`}
                            >
                                {/* Image */}
                                <div className="relative h-32 sm:h-40 overflow-hidden bg-white/5">
                                    {product.image ? (
                                        <>
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                loading="lazy"
                                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
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

                                    {/* Status overlay */}
                                    {(product.status === "sold_out" || product.status === "out_of_stock" || product.status === "coming_soon") && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                            <div className={`px-3 py-1 -rotate-12 shadow-lg ${
                                                product.status === "sold_out" ? "bg-red-600/80"
                                                : product.status === "coming_soon" ? "bg-blue-600/80"
                                                : "bg-gray-600/80"
                                            }`}>
                                                <span className="text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase">
                                                    {product.status === "sold_out" ? tProducts("soldOut")
                                                    : product.status === "coming_soon" ? tProducts("comingSoon")
                                                    : tProducts("outOfStock")}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Top-right badge: Sale (for onSale products or products with bulk tiers) */}
                                    {(product.onSale || parseTiers(product.bulkDiscountTiers || "").length > 0) && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">
                                                {tProducts("onSale")}
                                            </span>
                                            {product.onSale && discountPercent > 0 && (
                                                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">
                                                    -{discountPercent}%
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Top-left badges: Featured + New */}
                                    {(product.featured || product.isNew) && (
                                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                            {product.featured && (
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/products?featured=true") }} className="w-5 h-5 sm:w-6 sm:h-6 bg-violet-500/90 rounded-full flex items-center justify-center shadow-lg hover:bg-violet-500 transition-colors touch-manipulation">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                </button>
                                            )}
                                            {product.isNew && (
                                                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-cyan-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Bottom-right: Best Seller */}
                                    {bestSellerIds.includes(product.id) && (
                                        <div className="absolute bottom-2 right-2 z-20">
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/products?bestSeller=true") }} className="flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold bg-amber-500 text-white shadow-lg hover:bg-amber-400 transition-colors touch-manipulation">
                                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                {tProducts("bestSeller")}
                                            </button>
                                        </div>
                                    )}

                                    {/* Coupon Badge */}
                                    {couponMap?.[product.id] && (
                                        <div className="absolute bottom-2 left-2 z-20">
                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold bg-orange-500 text-white shadow-lg">
                                                <Ticket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                -{couponMap[product.id].type === "percentage"
                                                    ? `${couponMap[product.id].value}%`
                                                    : `${couponMap[product.id].value} ${couponMap[product.id].currency || "EUR"}`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Quick View — desktop hover bar */}
                                    {quickViewProducts?.[product.id] && (
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewQVProduct(quickViewProducts[product.id]) }}
                                            className="hidden sm:block absolute bottom-0 inset-x-0 py-1.5 bg-slate-900/85 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium text-center z-30 touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        >
                                            {tProducts("quickView")}
                                        </button>
                                    )}
                                </div>

                                {/* Category Badge + mobile Quick View */}
                                <div className="px-3 sm:px-4 pt-2 -mt-4 relative z-10 flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${COLOR_CLASSES[product.categoryColor] || COLOR_CLASSES.gray}`}
                                    >
                                        {product.categoryName}
                                    </span>
                                    {quickViewProducts?.[product.id] && (
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewQVProduct(quickViewProducts[product.id]) }}
                                            aria-label={tProducts("quickView")}
                                            className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-[10px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all touch-manipulation shrink-0"
                                        >
                                            <Eye className="w-3 h-3" />
                                            {tProducts("quickView")}
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-3 sm:p-4 pt-1 flex flex-col flex-1">
                                    <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] md:min-h-[3.5rem]">
                                        {product.name}
                                    </h3>
                                    {product.brand && (
                                        <span
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/brands/${product.brand!.slug}`) }}
                                            className="block text-[10px] sm:text-xs text-slate-500 font-medium mb-1 hover:text-emerald-400 transition-colors cursor-pointer"
                                        >
                                            {product.brand.name}
                                        </span>
                                    )}
                                    {/* Description */}
                                    {product.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-1">
                                            {(() => { const t = product.description.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); return t.length > 100 ? t.substring(0, 100) + "..." : t })()}
                                        </p>
                                    )}

                                    {/* Price */}
                                    <div className="mt-auto pt-2">
                                        {product.priceType !== "quote" ? (
                                            <div className="mb-2">
                                                {product.onSale && product.salePrice ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-base font-bold text-red-400">
                                                            {parseFloat(product.salePrice || "0").toFixed(2)} {product.currency}
                                                        </span>
                                                        <span className="text-[10px] sm:text-xs text-slate-500 line-through">
                                                            {parseFloat(product.price || "0").toFixed(2)} {product.currency}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm sm:text-base font-bold text-white">
                                                        {product.priceType === "from" ? `${tProducts("from")} ` : ""}{parseFloat(product.price || "0").toFixed(2)} {product.currency}
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Action Button — full width */}
                                        {!["in_stock", "pre_order"].includes(product.status) ? (
                                            <span className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs font-medium">
                                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                                {tProducts("notifyMeShort")}
                                            </span>
                                        ) : product.priceType === "fixed" && product.fileType !== "service" ? (
                                            <span className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-medium">
                                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                {tProducts("buyNow")}
                                            </span>
                                        ) : (
                                            <span className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-medium">
                                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                {tProducts("getQuote")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Quick View Modal */}
                {quickViewQVProduct && (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <QuickViewModal
                        key={quickViewQVProduct.id}
                        product={quickViewQVProduct as any}
                        locale={locale}
                        isWishlisted={false}
                        categories={(categories ?? []) as any}
                        onClose={() => setQuickViewQVProduct(null)}
                    />
                )}

                {/* Carousel Dots */}
                {useCarousel && totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setActiveSlide(i); scrollToPage(i) }}
                                aria-label={`Go to slide ${i + 1}`}
                                aria-current={activeSlide === i ? "page" : undefined}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    activeSlide === i ? "bg-emerald-400 w-6" : "bg-white/20 hover:bg-white/40"
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* View All Button */}
                <div className="mt-4 sm:mt-6 text-center">
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-[transform,background-color] duration-200"
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
