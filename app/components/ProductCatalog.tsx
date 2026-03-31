"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Star, Package, ShoppingCart, MessageSquare, Tag, X, Ticket, ChevronDown } from "lucide-react"
import { WishlistButton } from "./WishlistButton"

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
    status: string
    brand: { slug: string; nameBg: string; nameEn: string; nameEs: string } | null
}

interface ProductCategory {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
    parentId?: string | null
}

interface CouponBadge {
    type: string
    value: string
    currency: string | null
}

type SortOption = "default" | "price-asc" | "price-desc" | "discount" | "name-az"

interface ProductCatalogProps {
    products: Product[]
    categories: ProductCategory[]
    locale: string
    wishlistedProductIds?: string[]
    couponMap?: Record<string, CouponBadge>
    subcategories?: ProductCategory[]
    initialCategory?: string
    activeSubcategory?: string
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

function getProductUrl(
    product: { slug: string; category: string; brand: { slug: string } | null },
    categories: ProductCategory[]
): string {
    const segments = ["/products"]
    const cat = categories.find(c => c.slug === product.category)
    if (cat?.parentId) {
        const parent = categories.find(c => c.id === cat.parentId)
        if (parent) segments.push(parent.slug)
    }
    segments.push(product.category)
    if (product.brand?.slug) segments.push(product.brand.slug)
    segments.push(product.slug)
    return segments.join("/")
}

export function ProductCatalog({ products, categories, locale, wishlistedProductIds = [], couponMap, subcategories, initialCategory, activeSubcategory }: ProductCatalogProps) {
    const t = useTranslations("products")
    const searchParams = useSearchParams()
    const router = useRouter()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null)
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [saleFilter, setSaleFilter] = useState(false)
    const [sortBy, setSortBy] = useState<SortOption>("default")
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [categoryDropdownSearch, setCategoryDropdownSearch] = useState("")
    const [categoryActiveIndex, setCategoryActiveIndex] = useState(-1)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const categoryDropdownRef = useRef<HTMLDivElement>(null)
    const categoryListRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (searchParams.get("sale") === "true") {
            setSaleFilter(true)
        }
        const categoryParam = searchParams.get("category")
        if (categoryParam) {
            setSelectedCategory(categoryParam)
        }
        // Auto-expand parent for current category (from URL param or initialCategory)
        const activeCat = categoryParam || initialCategory
        if (activeCat) {
            const cat = categories.find(c => c.slug === activeCat)
            if (cat?.parentId) {
                setExpandedCategories(new Set([cat.parentId]))
            }
        }
    }, [searchParams, categories, initialCategory])

    // Close category dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
                setShowCategoryDropdown(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

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

    const uniqueBrands = useMemo(() => {
        const brandNames = products
            .map(p => p.brand ? getLocalizedName(p.brand) : null)
            .filter((b): b is string => !!b)
        return [...new Set(brandNames)].sort()
    }, [products, locale])

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesCategory = !selectedCategory || (() => {
                if (product.category === selectedCategory) return true
                // If selected is a parent category, also match its children
                const selectedCat = categories.find(c => c.slug === selectedCategory)
                if (selectedCat && !selectedCat.parentId) {
                    const childSlugs = categories
                        .filter(c => c.parentId === selectedCat.id)
                        .map(c => c.slug)
                    return childSlugs.includes(product.category)
                }
                return false
            })()
            const matchesSearch = !searchQuery ||
                getLocalizedName(product).toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.brand && getLocalizedName(product.brand).toLowerCase().includes(searchQuery.toLowerCase()))
            const matchesSale = !saleFilter || product.onSale
            const matchesBrand = !selectedBrand || (product.brand && getLocalizedName(product.brand) === selectedBrand)
            return matchesCategory && matchesSearch && matchesSale && matchesBrand
        })
    }, [products, selectedCategory, selectedBrand, searchQuery, saleFilter, categories, locale])

    const getEffectivePrice = (product: Product): number | null => {
        if (product.onSale && product.salePrice) return parseFloat(product.salePrice)
        if (product.price) return parseFloat(product.price)
        return null
    }

    const getDiscountPercent = (product: Product): number => {
        if (!product.onSale || !product.price || !product.salePrice) return 0
        return Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.price)) * 100)
    }

    const sortedProducts = useMemo(() => {
        if (sortBy === "default") return filteredProducts
        return [...filteredProducts].sort((a, b) => {
            switch (sortBy) {
                case "price-asc": {
                    const pa = getEffectivePrice(a)
                    const pb = getEffectivePrice(b)
                    if (pa === null && pb === null) return 0
                    if (pa === null) return 1
                    if (pb === null) return -1
                    return pa - pb
                }
                case "price-desc": {
                    const pa = getEffectivePrice(a)
                    const pb = getEffectivePrice(b)
                    if (pa === null && pb === null) return 0
                    if (pa === null) return 1
                    if (pb === null) return -1
                    return pb - pa
                }
                case "discount": {
                    return getDiscountPercent(b) - getDiscountPercent(a)
                }
                case "name-az":
                    return getLocalizedName(a).localeCompare(getLocalizedName(b))
                default:
                    return 0
            }
        })
    }, [filteredProducts, sortBy, locale])

    // Build flat navigable items for category dropdown (for keyboard nav)
    const categoryNavItems = useMemo(() => {
        const searchTerm = categoryDropdownSearch.toLowerCase()
        const items: Array<{ id: string; label: string; href: string; isChild: boolean; isActive: boolean; childCount?: number; productCount?: number }> = []

        // Count products per category slug
        const countBySlug: Record<string, number> = {}
        for (const p of products) {
            countBySlug[p.category] = (countBySlug[p.category] || 0) + 1
        }

        // "All Categories"
        items.push({ id: "_all", label: t("allCategories"), href: "/products", isChild: false, isActive: !selectedCategory && !initialCategory })

        const parents = categories.filter(c => !c.parentId)
        for (const parent of parents) {
            const children = categories.filter(c => c.parentId === parent.id)
            const parentName = getLocalizedName(parent)
            const matchesSearch = !searchTerm || parentName.toLowerCase().includes(searchTerm) ||
                children.some(c => getLocalizedName(c).toLowerCase().includes(searchTerm))
            if (!matchesSearch) continue

            const isParentActive = selectedCategory === parent.slug || initialCategory === parent.slug
            const parentProductCount = children.length > 0
                ? children.reduce((sum, c) => sum + (countBySlug[c.slug] || 0), 0) + (countBySlug[parent.slug] || 0)
                : countBySlug[parent.slug] || 0
            items.push({ id: parent.id, label: parentName, href: `/products/category/${parent.slug}`, isChild: false, isActive: isParentActive, childCount: children.length > 0 ? children.length : undefined, productCount: parentProductCount })

            const isExpanded = expandedCategories.has(parent.id)
            if (children.length > 0 && (isExpanded || searchTerm)) {
                for (const child of children) {
                    const childName = getLocalizedName(child)
                    if (searchTerm && !childName.toLowerCase().includes(searchTerm) && !parentName.toLowerCase().includes(searchTerm)) continue
                    const isChildActive = selectedCategory === child.slug || initialCategory === child.slug
                    items.push({ id: child.id, label: childName, href: `/products/category/${parent.slug}/${child.slug}`, isChild: true, isActive: isChildActive, productCount: countBySlug[child.slug] || 0 })
                }
            }
        }

        // Orphans
        const parentIds = new Set(parents.map(p => p.id))
        const orphans = categories.filter(c => c.parentId && !parentIds.has(c.parentId))
        for (const orphan of orphans) {
            const orphanName = getLocalizedName(orphan)
            if (searchTerm && !orphanName.toLowerCase().includes(searchTerm)) continue
            items.push({ id: orphan.id, label: orphanName, href: `/products/category/${orphan.slug}`, isChild: false, isActive: selectedCategory === orphan.slug, productCount: countBySlug[orphan.slug] || 0 })
        }

        return items
    }, [categories, categoryDropdownSearch, expandedCategories, selectedCategory, initialCategory, t, locale, products])

    // Reset active index on search change
    useEffect(() => {
        setCategoryActiveIndex(-1)
    }, [categoryDropdownSearch])

    // Scroll active item into view
    useEffect(() => {
        if (categoryActiveIndex >= 0 && categoryListRef.current) {
            const item = categoryListRef.current.querySelector(`[data-nav-index="${categoryActiveIndex}"]`)
            item?.scrollIntoView({ block: "nearest" })
        }
    }, [categoryActiveIndex])

    const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault()
                setCategoryActiveIndex(prev => Math.min(prev + 1, categoryNavItems.length - 1))
                break
            case "ArrowUp":
                e.preventDefault()
                setCategoryActiveIndex(prev => Math.max(prev - 1, 0))
                break
            case "Enter":
                e.preventDefault()
                if (categoryActiveIndex >= 0 && categoryNavItems[categoryActiveIndex]) {
                    setShowCategoryDropdown(false)
                    setCategoryDropdownSearch("")
                    setCategoryActiveIndex(-1)
                    router.push(categoryNavItems[categoryActiveIndex].href)
                }
                break
            case "Escape":
                e.preventDefault()
                setShowCategoryDropdown(false)
                setCategoryDropdownSearch("")
                setCategoryActiveIndex(-1)
                break
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
                {/* Sale Banner */}
                {saleFilter && (
                    <div className="mb-6 p-4 md:p-6 rounded-xl bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-red-400 flex items-center gap-2">
                                    <Tag className="w-5 h-5 md:w-6 md:h-6" />
                                    {t("saleTitle")}
                                </h2>
                                <p className="text-sm md:text-base text-slate-400 mt-1">{t("saleSubtitle")}</p>
                            </div>
                            <button
                                onClick={() => setSaleFilter(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

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
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base sm:text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    {/* Brand Filter */}
                    {uniqueBrands.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedBrand || ""}
                                onChange={(e) => setSelectedBrand(e.target.value || null)}
                                className="w-full appearance-none pl-4 pr-9 py-3 sm:py-2 bg-white/5 border border-white/10 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                            >
                                <option value="">{t("allBrands")}</option>
                                {uniqueBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Sort By */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="w-full appearance-none pl-4 pr-9 py-3 sm:py-2 bg-white/5 border border-white/10 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                        >
                            <option value="default">{t("sortDefault")}</option>
                            <option value="price-asc">{t("sortPriceLow")}</option>
                            <option value="price-desc">{t("sortPriceHigh")}</option>
                            <option value="discount">{t("sortDiscount")}</option>
                            <option value="name-az">{t("sortNameAZ")}</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <div className="flex gap-2 flex-wrap">
                            {/* All Products / All in Category button */}
                            <button
                                onClick={() => {
                                    if (subcategories && initialCategory) {
                                        router.push(`/products/category/${initialCategory}`)
                                    } else {
                                        router.push('/products')
                                    }
                                }}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${!activeSubcategory && !saleFilter
                                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                                    }`}
                            >
                                {t("allProducts")}
                            </button>
                            {/* Sale filter */}
                            <button
                                onClick={() => { setSaleFilter(!saleFilter); setSelectedCategory(null) }}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap inline-flex items-center justify-center sm:justify-start gap-1.5 ${saleFilter
                                        ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30"
                                        : "text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                                    }`}
                            >
                                <Tag className="w-3.5 h-3.5" />
                                {t("onSale")}
                            </button>
                            {/* Subcategory tabs (on category pages) — dropdown on mobile, tabs on desktop */}
                            {subcategories && subcategories.length > 0 ? (
                                <>
                                    {/* Mobile: dropdown */}
                                    <div className="relative sm:hidden w-full">
                                        <select
                                            value={activeSubcategory || ""}
                                            onChange={(e) => {
                                                const slug = e.target.value
                                                if (slug) {
                                                    router.push(`/products/category/${initialCategory}/${slug}`)
                                                } else {
                                                    router.push(`/products/category/${initialCategory}`)
                                                }
                                            }}
                                            className="w-full appearance-none pl-4 pr-9 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                                        >
                                            <option value="">{t("allProducts")}</option>
                                            {subcategories.map(sub => (
                                                <option key={sub.id} value={sub.slug}>{getLocalizedName(sub)}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                    </div>
                                    {/* Desktop: tabs */}
                                    {subcategories.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => router.push(`/products/category/${initialCategory}/${sub.slug}`)}
                                            className={`hidden sm:block px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeSubcategory === sub.slug
                                                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                                                }`}
                                        >
                                            {getLocalizedName(sub)}
                                        </button>
                                    ))}
                                </>
                            ) : (
                            <div ref={categoryDropdownRef} className="relative">
                                <button
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap inline-flex items-center justify-center sm:justify-start gap-1.5 ${selectedCategory
                                            ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                                        }`}
                                >
                                    {(() => {
                                        const selectedCat = selectedCategory ? categories.find(c => c.slug === selectedCategory) : null
                                        return selectedCat ? getLocalizedName(selectedCat) : t("allCategories")
                                    })()}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
                                </button>

                                {showCategoryDropdown && (
                                    <div className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-72 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                        {/* Search */}
                                        <div className="p-2 border-b border-white/10">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={categoryDropdownSearch}
                                                    onChange={(e) => setCategoryDropdownSearch(e.target.value)}
                                                    onKeyDown={handleCategoryKeyDown}
                                                    placeholder={t("searchCategory")}
                                                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div ref={categoryListRef} className="max-h-72 overflow-y-auto py-1">
                                            {categoryNavItems.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-gray-500">{t("noCategoriesFound")}</div>
                                            ) : (
                                                categoryNavItems.map((item, i) => (
                                                    <div
                                                        key={item.id}
                                                        data-nav-index={i}
                                                        className={`flex items-center text-sm transition-colors ${
                                                            item.isChild ? "pl-8 pr-4 py-2" : "px-4 py-2.5 font-medium"
                                                        } ${
                                                            categoryActiveIndex === i
                                                                ? "bg-white/10 text-white"
                                                                : item.isActive
                                                                    ? "text-emerald-400 bg-emerald-500/10"
                                                                    : item.isChild
                                                                        ? "text-gray-400 hover:bg-white/5 hover:text-white"
                                                                        : "text-gray-200 hover:bg-white/5 hover:text-white"
                                                        }`}
                                                    >
                                                        <button
                                                            className="flex-1 text-left flex items-center gap-2"
                                                            onClick={() => {
                                                                setShowCategoryDropdown(false)
                                                                setCategoryDropdownSearch("")
                                                                setCategoryActiveIndex(-1)
                                                                router.push(item.href)
                                                            }}
                                                        >
                                                            {item.isChild && <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />}
                                                            {item.label}
                                                            {!item.childCount && item.productCount !== undefined && (
                                                                <span className="text-[10px] text-gray-500 ml-1">({item.productCount})</span>
                                                            )}
                                                        </button>
                                                        {item.childCount && (
                                                            <>
                                                                <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{item.childCount}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setExpandedCategories(prev => {
                                                                            const next = new Set(prev)
                                                                            if (next.has(item.id)) next.delete(item.id)
                                                                            else next.add(item.id)
                                                                            return next
                                                                        })
                                                                    }}
                                                                    className="p-1 hover:bg-white/10 rounded transition-colors ml-1"
                                                                >
                                                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedCategories.has(item.id) ? "rotate-180" : ""}`} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {sortedProducts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t("noProducts")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sortedProducts.map((product) => {
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
                                    href={getProductUrl(product, categories)}
                                    className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                >
                                    {/* Image */}
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

                                        {/* Wishlist + Stock Status */}
                                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                                            <WishlistButton
                                                productId={product.id}
                                                initialWishlisted={wishlistedProductIds.includes(product.id)}
                                                size="sm"
                                                translations={{
                                                    addToWishlist: t("addToWishlist"),
                                                    removeFromWishlist: t("removeFromWishlist"),
                                                    loginToWishlist: t("loginToWishlist"),
                                                }}
                                            />
                                            {product.status !== "in_stock" && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    product.status === "sold_out" ? "bg-red-500/20 text-red-400"
                                                    : product.status === "coming_soon" ? "bg-blue-500/20 text-blue-400"
                                                    : product.status === "pre_order" ? "bg-purple-500/20 text-purple-400"
                                                    : "bg-gray-500/20 text-gray-400"
                                                }`}>
                                                    {product.status === "out_of_stock" ? t("outOfStock")
                                                    : product.status === "sold_out" ? t("soldOut")
                                                    : product.status === "coming_soon" ? t("comingSoon")
                                                    : product.status === "pre_order" ? t("preOrder")
                                                    : t("outOfStock")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Coupon Badge */}
                                        {couponMap?.[product.id] && (
                                            <div className="absolute bottom-3 left-3">
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-lg">
                                                    <Ticket className="w-3 h-3" />
                                                    -{couponMap[product.id].type === "percentage"
                                                        ? `${couponMap[product.id].value}%`
                                                        : `${couponMap[product.id].value} ${couponMap[product.id].currency || "EUR"}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 sm:p-5">
                                        {/* Category Badge + Brand */}
                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"
                                                    }`}
                                            >
                                                {categoryName}
                                            </span>
                                            {product.brand && (
                                                <span
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/brands/${product.brand!.slug}` }}
                                                    className="text-xs text-slate-500 font-medium hover:text-emerald-400 transition-colors cursor-pointer"
                                                >
                                                    {getLocalizedName(product.brand)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <h3 className="text-sm sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                                            {name}
                                        </h3>

                                        {/* Description */}
                                        {desc && (
                                            <p className="text-slate-400 text-sm line-clamp-2 mb-4 hidden sm:block">
                                                {desc}
                                            </p>
                                        )}

                                        {/* Price + Action */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                {product.priceType === "quote" ? (
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {t("getQuote")}
                                                    </span>
                                                ) : product.onSale && product.salePrice ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-xl font-bold text-red-400 whitespace-nowrap">
                                                            {parseFloat(product.salePrice).toFixed(2)} {product.currency}
                                                        </span>
                                                        <span className="text-[10px] sm:text-sm text-gray-500 line-through whitespace-nowrap">
                                                            {price}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm sm:text-xl font-bold text-white whitespace-nowrap">
                                                        {price || "-"}
                                                    </span>
                                                )}
                                            </div>
                                            {product.priceType !== "quote" && (
                                                product.fileType === "digital" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium group-hover:bg-emerald-500/30 transition-all whitespace-nowrap">
                                                        <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                                        {t("buyNow")}
                                                    </span>
                                                ) : product.fileType === "service" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium group-hover:bg-amber-500/30 transition-all whitespace-nowrap">
                                                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                                        {t("getQuote")}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium group-hover:bg-purple-500/30 transition-all whitespace-nowrap">
                                                        <Package className="w-3.5 h-3.5 shrink-0" />
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
