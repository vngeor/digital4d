"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Search, Star, Package, ShoppingCart, MessageSquare } from "lucide-react"

interface Product {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    descBg: string | null
    descEn: string | null
    descEs: string | null
    price: string | null
    salePrice: string | null
    onSale: boolean
    currency: string
    priceType: string
    category: string
    image: string | null
    fileType: string | null
    featured: boolean
    inStock: boolean
}

interface ProductCategory {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
}

interface ProductCatalogProps {
    products: Product[]
    categories: ProductCategory[]
    locale: string
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

export function ProductCatalog({ products, categories, locale }: ProductCatalogProps) {
    const t = useTranslations("products")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

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

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesCategory = !selectedCategory || product.category === selectedCategory
            const matchesSearch = !searchQuery ||
                getLocalizedName(product).toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.slug.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [products, selectedCategory, searchQuery])

    const getCategoryColor = (categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        return category?.color || "gray"
    }

    const getCategoryName = (categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        if (!category) return categorySlug
        return getLocalizedName(category)
    }

    const formatPrice = (product: Product) => {
        if (product.priceType === "quote") return t("requestQuote")
        if (!product.price) return null
        const price = parseFloat(product.price)
        const prefix = product.priceType === "from" ? t("from") + " " : ""
        return `${prefix}${price.toFixed(2)} ${product.currency}`
    }

    return (
        <section className="relative py-8 px-4">
            <div className="mx-auto max-w-6xl">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder={t("search")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
                        <div className="flex gap-2 sm:flex-wrap min-w-max sm:min-w-0">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === null
                                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                                    }`}
                            >
                                {t("allProducts")}
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.slug)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === category.slug
                                            ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                                        }`}
                                >
                                    {getLocalizedName(category)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t("noProducts")}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProducts.map((product) => {
                            const name = getLocalizedName(product)
                            const desc = getLocalizedDesc(product)
                            const categoryColor = getCategoryColor(product.category)
                            const categoryName = getCategoryName(product.category)
                            const price = formatPrice(product)

                            // Calculate discount percentage
                            const discountPercent = product.onSale && product.price && product.salePrice
                                ? Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.price)) * 100)
                                : 0

                            return (
                                <Link
                                    key={product.id}
                                    href={`/products/${product.slug}`}
                                    className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                >
                                    {/* Image */}
                                    <div className="relative h-48 overflow-hidden bg-white/5">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-16 h-16 text-gray-600" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                            {product.featured && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                    <Star className="w-3 h-3 fill-amber-400" />
                                                    {t("featured")}
                                                </span>
                                            )}
                                            {product.onSale && (
                                                <>
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                                                        {t("onSale")}
                                                    </span>
                                                    {discountPercent > 0 && (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                                                            -{discountPercent}%
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Stock Status */}
                                        {!product.inStock && (
                                            <div className="absolute top-3 right-3">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                                                    {t("outOfStock")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        {/* Category Badge */}
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"
                                                }`}
                                        >
                                            {categoryName}
                                        </span>

                                        {/* Name */}
                                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                                            {name}
                                        </h3>

                                        {/* Description */}
                                        {desc && (
                                            <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                                                {desc}
                                            </p>
                                        )}

                                        {/* Price */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {product.priceType === "quote" ? (
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {t("getQuote")}
                                                    </span>
                                                ) : product.onSale && product.salePrice ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-emerald-400">
                                                            {parseFloat(product.salePrice).toFixed(2)} {product.currency}
                                                        </span>
                                                        <span className="text-sm text-gray-500 line-through">
                                                            {price}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xl font-bold text-white">
                                                        {price || "-"}
                                                    </span>
                                                )}
                                            </div>
                                            {product.priceType !== "quote" && (
                                                product.fileType === "digital" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium group-hover:bg-emerald-500/30 transition-all">
                                                        <ShoppingCart className="w-3.5 h-3.5" />
                                                        {t("buyNow")}
                                                    </span>
                                                ) : product.fileType === "service" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium group-hover:bg-amber-500/30 transition-all">
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        {t("getQuote")}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium group-hover:bg-purple-500/30 transition-all">
                                                        <Package className="w-3.5 h-3.5" />
                                                        {t("orderNow")}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
