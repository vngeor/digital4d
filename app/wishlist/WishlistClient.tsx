"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Heart, ArrowLeft, ShoppingCart, MessageSquare, Package, Bell } from "lucide-react"
import { ProductImageBadges } from "../components/ProductBadges"
import { computeDiscountPercent, computeIsNew } from "@/lib/badgeHelpers"
import { toast } from "sonner"
import { Header } from "../components/Header"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"

interface WishlistProduct {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    price: string | null
    salePrice: string | null
    onSale: boolean
    currency: string
    priceType: string
    category: string
    image: string | null
    fileType: string | null
    featured: boolean
    bestSeller?: boolean
    status: string
    createdAt?: string
    bulkDiscountTiers?: string | null
}

interface WishlistItem {
    id: string
    productId: string
    product: WishlistProduct
    createdAt: string
}

interface ProductCategory {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
}

interface CouponBadge {
    type: string
    value: string
    currency: string | null
}

interface WishlistClientProps {
    items: WishlistItem[]
    categories: ProductCategory[]
    locale: string
    translations: {
        title: string
        subtitle: string
        empty: string
        emptyDescription: string
        browseProducts: string
        addToWishlist: string
        removeFromWishlist: string
        loginToWishlist: string
        priceDropAlert: string
        backToHome: string
        outOfStock: string
        comingSoon: string
        preOrder: string
        soldOut: string
    }
    couponMap?: Record<string, CouponBadge>
    productUrlMap?: Record<string, string>
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

export function WishlistClient({ items: initialItems, categories, locale, translations: t, couponMap, productUrlMap }: WishlistClientProps) {
    const tw = useTranslations("wishlist")
    const [items, setItems] = useState(initialItems)

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg
            case "es": return item.nameEs
            default: return item.nameEn
        }
    }

    const getCategoryColor = (categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        return category?.color || "gray"
    }

    const getCategoryName = (categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        if (!category) return categorySlug
        return getLocalizedName(category)
    }

    const handleRemove = async (productId: string) => {
        try {
            const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" })
            if (res.ok) {
                setItems((prev) => prev.filter((item) => item.productId !== productId))
                toast.success(t.removeFromWishlist)
            }
        } catch {
            toast.error(tw("error"))
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
                        className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6 touch-manipulation"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-red-400 fill-red-400" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            {t.title}
                        </h1>
                    </div>
                    <p className="text-slate-400 text-lg mt-4">{t.subtitle}</p>
                </div>
            </section>

            {/* Price Drop Alert Banner */}
            {items.length > 0 && (
                <section className="relative px-4">
                    <div className="mx-auto max-w-6xl">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-emerald-400 shrink-0" />
                                <p className="text-sm text-emerald-300">{t.priceDropAlert}</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Wishlist Content */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {items.length === 0 ? (
                        <div className="text-center py-16">
                            <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white mb-2">{t.empty}</h2>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">{t.emptyDescription}</p>
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105 transition-all"
                            >
                                <Package className="w-4 h-4" />
                                {t.browseProducts}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                            {items.map((item) => {
                                const product = item.product
                                const name = getLocalizedName(product)
                                const categoryColor = getCategoryColor(product.category)
                                const categoryName = getCategoryName(product.category)
                                const formatPrice = () => {
                                    if (product.priceType === "quote") return null
                                    if (!product.price) return null
                                    const price = parseFloat(product.price)
                                    return `${price.toFixed(2)} ${product.currency}`
                                }
                                const price = formatPrice()

                                return (
                                    <div key={item.id} className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                                        {/* Image */}
                                        <Link href={productUrlMap?.[product.id] || `/products/${product.slug}`}>
                                            <div className="relative h-32 sm:h-48 overflow-hidden bg-white/5">
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={name}
                                                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-16 h-16 text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

                                                <ProductImageBadges
                                                    size="sm"
                                                    hideTopRight
                                                    isNew={computeIsNew(product.createdAt)}
                                                    featured={product.featured}
                                                    bestSeller={product.bestSeller}
                                                    onSale={product.onSale}
                                                    discountPercent={computeDiscountPercent(product.price, product.salePrice)}
                                                    hasBulkDiscount={false}
                                                    coupon={couponMap?.[product.id] ?? null}
                                                />

                                                {/* Remove Button */}
                                                <div className="absolute top-3 right-3 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleRemove(product.id)
                                                        }}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all touch-manipulation"
                                                        title={t.removeFromWishlist}
                                                    >
                                                        <Heart className="w-4 h-4 fill-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Content */}
                                        <Link href={productUrlMap?.[product.id] || `/products/${product.slug}`}>
                                            <div className="p-3 sm:p-5">
                                                {/* Category Badge */}
                                                <span
                                                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"}`}
                                                >
                                                    {categoryName}
                                                </span>

                                                {/* Name */}
                                                <h3 className="text-sm sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                                                    {name}
                                                </h3>

                                                {/* Price */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        {product.priceType === "quote" ? (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium">
                                                                <MessageSquare className="w-4 h-4" />
                                                            </span>
                                                        ) : product.onSale && product.salePrice ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base sm:text-xl font-bold text-red-400">
                                                                    {parseFloat(product.salePrice).toFixed(2)} {product.currency}
                                                                </span>
                                                                <span className="text-xs sm:text-sm text-gray-500 line-through">
                                                                    {price}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-base sm:text-xl font-bold text-white">
                                                                {price || "-"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {product.priceType !== "quote" && (
                                                        product.priceType === "fixed" && product.fileType !== "service" ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            </span>
                                                        )
                                                    )}
                                                </div>

                                                {/* Stock Status */}
                                                {product.status !== "in_stock" && (
                                                    <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                                                        product.status === "sold_out" ? "bg-red-500/20 text-red-400"
                                                        : product.status === "coming_soon" ? "bg-blue-500/20 text-blue-400"
                                                        : product.status === "pre_order" ? "bg-purple-500/20 text-purple-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                    }`}>
                                                        {product.status === "out_of_stock" ? t.outOfStock
                                                        : product.status === "sold_out" ? t.soldOut
                                                        : product.status === "coming_soon" ? t.comingSoon
                                                        : product.status === "pre_order" ? t.preOrder
                                                        : t.outOfStock}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d.</p>
                </div>
            </footer>
        </div>
    )
}
