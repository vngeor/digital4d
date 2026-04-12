"use client"

import { useState, useMemo, useEffect, useRef, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Check, Package, ShoppingCart, MessageSquare, Tag, X, ChevronDown, Bell, SlidersHorizontal, Eye } from "lucide-react"
import { WishlistButton } from "./WishlistButton"
import { QuickViewModal } from "./QuickViewModal"
import { parseTiers } from "@/lib/bulkDiscount"
import { ProductImageBadges } from "./ProductBadges"
import { computeDiscountPercent, computeHasBulkDiscount, computeIsNew } from "@/lib/badgeHelpers"

interface ProductVariant {
    id: string
    image: string | null
    status: string
    colorId: string
    color: { nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null }
}

interface ProductPackage {
    id: string
    price: string
    salePrice: string | null
    status: string
    weight: { label: string }
    packageVariants?: { variantId: string; status: string }[]
    bulkDiscountTiers?: string | null
}

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
    bestSeller: boolean
    status: string
    createdAt: string | Date
    brand: { slug: string; nameBg: string; nameEn: string; nameEs: string } | null
    variants?: ProductVariant[]
    packages?: ProductPackage[]
    gallery?: string[]
    bulkDiscountTiers?: string | null
    bulkDiscountExpiresAt?: string | null
}

interface ProductCategory {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
    parentId?: string | null
    children?: { id: string; slug: string }[]
    parent?: { slug: string } | null
}

interface CouponBadge {
    code: string
    type: string
    value: string
    currency: string | null
    expiresAt: string | null
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

function FilterSection({ title, isOpen, onToggle, children }: {
    title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
    return (
        <div className="border-b border-white/10">
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full py-3 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
            >
                {title}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="pb-4">{children}</div>}
        </div>
    )
}

export function ProductCatalog({ products, categories, locale, wishlistedProductIds = [], couponMap, subcategories, initialCategory, activeSubcategory }: ProductCatalogProps) {
    const t = useTranslations("products")
    const searchParams = useSearchParams()
    const router = useRouter()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null)
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [saleFilter, setSaleFilter] = useState(false)
    const [featuredFilter, setFeaturedFilter] = useState(false)
    const [bestSellerFilter, setBestSellerFilter] = useState(false)
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [sortBy, setSortBy] = useState<SortOption>("default")
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [categoryDropdownSearch, setCategoryDropdownSearch] = useState("")
    const [categoryActiveIndex, setCategoryActiveIndex] = useState(-1)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const categoryDropdownRef = useRef<HTMLDivElement>(null)
    const categoryListRef = useRef<HTMLDivElement>(null)
    const sidebarCategoryRef = useRef<HTMLDivElement>(null)
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [brandDropdownOpen, setBrandDropdownOpen] = useState(false)
    const brandDropdownRef = useRef<HTMLDivElement>(null)
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [priceMin, setPriceMin] = useState<string>("")
    const [priceMax, setPriceMax] = useState<string>("")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
    const [openSections, setOpenSections] = useState<Set<string>>(
        new Set(["category", "subcategory", "color", "size", "price", "brand", "quickFilters"])
    )
    // Multi-select subcategory filter (desktop instant, mobile staged)
    const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([])
    const toggleSubcategory = (slug: string) =>
        setSelectedSubcategories(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])

    // Mobile pending state — selections staged here, committed only when "Apply" is tapped
    const [pendingSubcategories, setPendingSubcategories] = useState<string[]>([])
    const [pendingColors, setPendingColors] = useState<string[]>([])
    const [pendingSizes, setPendingSizes] = useState<string[]>([])
    const [pendingPriceMin, setPendingPriceMin] = useState<string>("")
    const [pendingPriceMax, setPendingPriceMax] = useState<string>("")
    const [pendingBrand, setPendingBrand] = useState<string | null>(null)
    const [pendingSale, setPendingSale] = useState(false)
    const [pendingFeatured, setPendingFeatured] = useState(false)
    const [pendingBestSeller, setPendingBestSeller] = useState(false)

    // Clear selected brand when locale changes to avoid stale localized-name mismatch
    const prevLocale = useRef(locale)
    useEffect(() => {
        if (prevLocale.current !== locale) {
            prevLocale.current = locale
            setSelectedBrand(null)
        }
    }, [locale])

    useEffect(() => {
        if (searchParams.get("sale") === "true") {
            setSaleFilter(true)
        }
        if (searchParams.get("featured") === "true") {
            setFeaturedFilter(true)
        }
        if (searchParams.get("bestSeller") === "true") {
            setBestSellerFilter(true)
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
                // On a child page — expand the parent in sidebar
                setExpandedCategories(new Set([cat.parentId]))
            }
            // On a parent category page: no need to reset expansion here —
            // the sidebar suppresses children for the active parent when subcategory chips exist
        }
    }, [searchParams, categories, initialCategory])

    // Close mobile sidebar on Escape key
    useEffect(() => {
        if (!sidebarOpen) return
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false) }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [sidebarOpen])

    // iOS-safe body scroll lock when mobile filter drawer is open
    useEffect(() => {
        if (!sidebarOpen) return
        const y = window.scrollY
        document.body.style.position = "fixed"
        document.body.style.top = `-${y}px`
        document.body.style.width = "100%"
        return () => {
            document.body.style.position = ""
            document.body.style.top = ""
            document.body.style.width = ""
            window.scrollTo(0, y)
        }
    }, [sidebarOpen])

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

    // Close brand dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
                setBrandDropdownOpen(false)
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

    // O(1) category lookup — replaces O(n) .find() per product render
    const categoryMap = useMemo(
        () => new Map(categories.map(c => [c.slug, c])),
        [categories]
    )

    const [isPending, startTransition] = useTransition()

    const uniqueBrands = useMemo(() => {
        const brandNames = products
            .map(p => p.brand ? getLocalizedName(p.brand) : null)
            .filter((b): b is string => !!b)
        return [...new Set(brandNames)].sort()
    }, [products, locale])

    const uniqueColors = useMemo(() => {
        const colorMap = new Map<string, { hex: string; hex2?: string | null }>()
        const colorNames = new Map<string, string>()
        for (const product of products) {
            for (const variant of product.variants || []) {
                if (!variant.colorId || colorMap.has(variant.colorId)) continue
                const name = locale === "bg" ? variant.color.nameBg
                    : locale === "es" ? variant.color.nameEs
                    : variant.color.nameEn
                colorMap.set(variant.colorId, { hex: variant.color.hex, hex2: variant.color.hex2 ?? null })
                colorNames.set(variant.colorId, name)
            }
        }
        return Array.from(colorMap.entries())
            .map(([id, { hex, hex2 }]) => ({ id, hex, hex2, name: colorNames.get(id) || "" }))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [products, locale])

    const toggleColor = (colorId: string) => {
        setSelectedColors(prev =>
            prev.includes(colorId) ? prev.filter(c => c !== colorId) : [...prev, colorId]
        )
    }

    const toggleSize = (label: string) =>
        setSelectedSizes(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label])

    const toggleSection = (key: string) =>
        setOpenSections(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })

    const uniqueSizes = useMemo(() => {
        const labels = new Set<string>()
        products.forEach(p => p.packages?.forEach(pkg => labels.add(pkg.weight.label)))
        return [...labels].sort((a, b) => {
            const parse = (s: string) => parseFloat(s.replace(",", ".")) * (s.toLowerCase().includes("kg") ? 1000 : 1)
            return parse(a) - parse(b)
        })
    }, [products])

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesCategory = !selectedCategory || (() => {
                // Multi-select subcategory checkboxes take priority (OR logic)
                if (selectedSubcategories.length > 0) {
                    return selectedSubcategories.includes(product.category)
                }
                if (product.category === selectedCategory) return true
                // If selected is a parent category, also match its children using O(1) map
                const selectedCat = categoryMap.get(selectedCategory)
                if (selectedCat && !selectedCat.parentId) {
                    return categories.some(c => c.parentId === selectedCat.id && c.slug === product.category)
                }
                return false
            })()
            const matchesSearch = !searchQuery ||
                getLocalizedName(product).toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.brand && getLocalizedName(product.brand).toLowerCase().includes(searchQuery.toLowerCase()))
            const hasBulkTiers = computeHasBulkDiscount(product.bulkDiscountTiers, product.packages, product.bulkDiscountExpiresAt)
            const matchesSale = !saleFilter || product.onSale || hasBulkTiers
            const matchesFeatured = !featuredFilter || product.featured
            const matchesBestSeller = !bestSellerFilter || product.bestSeller
            const matchesBrand = !selectedBrand || (product.brand && getLocalizedName(product.brand) === selectedBrand)
            const matchesColor = selectedColors.length === 0 ||
                (product.variants || []).some(v => v.colorId && selectedColors.includes(v.colorId))
            const matchesSize = selectedSizes.length === 0 ||
                (product.packages?.some(pkg => selectedSizes.includes(pkg.weight.label)) ?? false)
            const effectivePrice = product.onSale && product.salePrice
                ? parseFloat(product.salePrice) : product.price ? parseFloat(product.price) : null
            const minVal = priceMin !== "" ? parseFloat(priceMin) : null
            const maxVal = priceMax !== "" ? parseFloat(priceMax) : null
            const matchesPrice =
                (minVal === null || (effectivePrice !== null && effectivePrice >= minVal)) &&
                (maxVal === null || (effectivePrice !== null && effectivePrice <= maxVal))
            return matchesCategory && matchesSearch && matchesSale && matchesFeatured && matchesBestSeller && matchesBrand && matchesColor && matchesSize && matchesPrice
        })
    }, [products, selectedCategory, selectedSubcategories, selectedBrand, searchQuery, saleFilter, featuredFilter, bestSellerFilter, selectedColors, selectedSizes, priceMin, priceMax, categoryMap, categories, locale])

    const getEffectivePrice = (product: Product): number | null => {
        if (product.onSale && product.salePrice) return parseFloat(product.salePrice)
        if (product.price) return parseFloat(product.price)
        return null
    }

    const getDiscountPercent = (product: Product): number => {
        if (!product.onSale) return 0
        // Use best discount across packages (for sort accuracy)
        if (product.packages?.length) {
            let best = 0
            for (const pkg of product.packages) {
                if (pkg.salePrice) {
                    const d = Math.round((1 - parseFloat(pkg.salePrice) / parseFloat(pkg.price)) * 100)
                    if (d > best) best = d
                }
            }
            if (best > 0) return best
        }
        if (!product.price || !product.salePrice) return 0
        return Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.price)) * 100)
    }

    // Card badge shows the best (max) discount across all packages — same as sort logic
    const getCardDiscountPercent = (product: Product): number => getDiscountPercent(product)

    const { absoluteMin, absoluteMax } = useMemo(() => {
        const prices = products.map(p => getEffectivePrice(p)).filter((v): v is number => v !== null)
        return {
            absoluteMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
            absoluteMax: prices.length ? Math.ceil(Math.max(...prices)) : 1000,
        }
    }, [products])

    const activeFilterCount = selectedSubcategories.length + selectedColors.length + selectedSizes.length +
        (priceMin !== "" ? 1 : 0) + (priceMax !== "" ? 1 : 0) +
        // Don't count selectedCategory as a user filter when it's just the page's own category
        (selectedCategory && selectedCategory !== initialCategory ? 1 : 0) + (selectedBrand ? 1 : 0) +
        (saleFilter ? 1 : 0) + (featuredFilter ? 1 : 0) + (bestSellerFilter ? 1 : 0)

    const clearAllFilters = () => {
        // On a category page, restore the page's own category instead of clearing to null
        setSelectedCategory(initialCategory || null)
        setSelectedSubcategories([])
        setSelectedBrand(null)
        setSelectedColors([])
        setSelectedSizes([])
        setPriceMin("")
        setPriceMax("")
        setSaleFilter(false)
        setFeaturedFilter(false)
        setBestSellerFilter(false)
        startTransition(() => setSearchQuery(""))
    }

    // Open mobile sidebar and pre-populate pending state with current active filters
    const openMobileSidebar = () => {
        setPendingSubcategories(selectedSubcategories)
        setPendingColors(selectedColors)
        setPendingSizes(selectedSizes)
        setPendingPriceMin(priceMin)
        setPendingPriceMax(priceMax)
        setPendingBrand(selectedBrand)
        setPendingSale(saleFilter)
        setPendingFeatured(featuredFilter)
        setPendingBestSeller(bestSellerFilter)
        setSidebarOpen(true)
    }

    // Commit pending mobile filters to active state and close drawer
    const applyMobileFilters = () => {
        setSelectedSubcategories(pendingSubcategories)
        setSelectedColors(pendingColors)
        setSelectedSizes(pendingSizes)
        setPriceMin(pendingPriceMin)
        setPriceMax(pendingPriceMax)
        setSelectedBrand(pendingBrand)
        setSaleFilter(pendingSale)
        setFeaturedFilter(pendingFeatured)
        setBestSellerFilter(pendingBestSeller)
        setSidebarOpen(false)
    }

    // Live product count based on pending selections (shown in Apply button)
    const pendingFilteredCount = useMemo(() => {
        if (!sidebarOpen) return 0
        return products.filter(product => {
            const matchesCategory = !selectedCategory || (() => {
                if (pendingSubcategories.length > 0) return pendingSubcategories.includes(product.category)
                if (product.category === selectedCategory) return true
                const selectedCat = categoryMap.get(selectedCategory)
                if (selectedCat && !selectedCat.parentId) {
                    return categories.some(c => c.parentId === selectedCat.id && c.slug === product.category)
                }
                return false
            })()
            const matchesSearch = !searchQuery ||
                getLocalizedName(product).toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.brand && getLocalizedName(product.brand).toLowerCase().includes(searchQuery.toLowerCase()))
            const hasBulkTiers = computeHasBulkDiscount(product.bulkDiscountTiers, product.packages, product.bulkDiscountExpiresAt)
            const matchesSale = !pendingSale || product.onSale || hasBulkTiers
            const matchesFeatured = !pendingFeatured || product.featured
            const matchesBestSeller = !pendingBestSeller || product.bestSeller
            const matchesBrand = !pendingBrand || (product.brand && getLocalizedName(product.brand) === pendingBrand)
            const matchesColor = pendingColors.length === 0 ||
                (product.variants || []).some(v => v.colorId && pendingColors.includes(v.colorId))
            const matchesSize = pendingSizes.length === 0 ||
                (product.packages?.some(pkg => pendingSizes.includes(pkg.weight.label)) ?? false)
            const effectivePrice = product.onSale && product.salePrice
                ? parseFloat(product.salePrice) : product.price ? parseFloat(product.price) : null
            const minVal = pendingPriceMin !== "" ? parseFloat(pendingPriceMin) : null
            const maxVal = pendingPriceMax !== "" ? parseFloat(pendingPriceMax) : null
            const matchesPrice =
                (minVal === null || (effectivePrice !== null && effectivePrice >= minVal)) &&
                (maxVal === null || (effectivePrice !== null && effectivePrice <= maxVal))
            return matchesCategory && matchesSearch && matchesSale && matchesFeatured &&
                matchesBestSeller && matchesBrand && matchesColor && matchesSize && matchesPrice
        }).length
    }, [sidebarOpen, products, selectedCategory, searchQuery, pendingSubcategories, pendingColors, pendingSizes,
        pendingPriceMin, pendingPriceMax, pendingBrand, pendingSale, pendingFeatured, pendingBestSeller,
        categoryMap, categories, locale])

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
                    const available = (p: Product) => p.status === "in_stock" || p.status === "pre_order" ? 0 : 1
                    const avDiff = available(a) - available(b)
                    if (avDiff !== 0) return avDiff
                    return getDiscountPercent(b) - getDiscountPercent(a)
                }
                case "name-az":
                    return getLocalizedName(a).localeCompare(getLocalizedName(b), locale)
                default:
                    return 0
            }
        })
    }, [filteredProducts, sortBy, locale])

    // Expensive memo — rebuilds only when categories/products/expansion state changes (NOT on search keystrokes)
    const allCategoryNavItems = useMemo(() => {
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

            const isParentActive = selectedCategory === parent.slug || initialCategory === parent.slug
            // When subcategory chips exist for the active parent, don't duplicate them in sidebar
            const hasSubcategoryChips = isParentActive && !!subcategories?.length
            const parentProductCount = children.length > 0
                ? children.reduce((sum, c) => sum + (countBySlug[c.slug] || 0), 0) + (countBySlug[parent.slug] || 0)
                : countBySlug[parent.slug] || 0
            items.push({ id: parent.id, label: parentName, href: `/products/category/${parent.slug}`, isChild: false, isActive: isParentActive, childCount: children.length > 0 && !hasSubcategoryChips ? children.length : undefined, productCount: parentProductCount })

            const isExpanded = expandedCategories.has(parent.id)
            // Don't render children in sidebar when chips already handle subcategory navigation
            if (children.length > 0 && isExpanded && !hasSubcategoryChips) {
                for (const child of children) {
                    const childName = getLocalizedName(child)
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
            items.push({ id: orphan.id, label: orphanName, href: `/products/category/${orphan.slug}`, isChild: false, isActive: selectedCategory === orphan.slug, productCount: countBySlug[orphan.slug] || 0 })
        }

        return items
    }, [categories, expandedCategories, selectedCategory, initialCategory, t, locale, products, subcategories])

    // Cheap memo — just filters pre-built items on search keystrokes
    const categoryNavItems = useMemo(() => {
        if (!categoryDropdownSearch) return allCategoryNavItems
        const searchTerm = categoryDropdownSearch.toLowerCase()
        // When searching, also expand children so they appear in results
        return allCategoryNavItems.filter(item => {
            if (item.id === "_all") return true
            return item.label.toLowerCase().includes(searchTerm)
        })
    }, [allCategoryNavItems, categoryDropdownSearch])

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

    const getCategoryColor = (categorySlug: string) => categoryMap.get(categorySlug)?.color || "gray"

    const getCategoryName = (categorySlug: string) => {
        const cat = categoryMap.get(categorySlug)
        return cat ? getLocalizedName(cat) : categorySlug
    }

    const formatPrice = (product: Product) => {
        if (product.priceType === "quote") return t("requestQuote")
        if (!product.price) return null
        const price = parseFloat(product.price)
        const prefix = product.priceType === "from" ? t("from") + " " : ""
        return `${prefix}${price.toFixed(2)} ${product.currency}`
    }

    // Product count per category slug (for subcategory checkbox labels)
    const countBySlug = useMemo(() => {
        const map: Record<string, number> = {}
        for (const p of products) { map[p.category] = (map[p.category] || 0) + 1 }
        return map
    }, [products])

    // Product count per brand name (for brand filter labels)
    const countByBrand = useMemo(() => {
        const map: Record<string, number> = {}
        for (const p of products) {
            if (p.brand) {
                const name = getLocalizedName(p.brand)
                map[name] = (map[name] || 0) + 1
            }
        }
        return map
    }, [products, locale])

    // Whether to show subcategory checkboxes: only on the parent page (not on a child page)
    const showSubcategoryCheckboxes = !!subcategories?.length && !activeSubcategory

    // Sidebar content — shared between desktop aside and mobile drawer
    const sidebarContent = (
        <div>
            {activeFilterCount > 0 && (
                <button onClick={clearAllFilters}
                    className="text-xs text-emerald-400 hover:text-emerald-300 mb-4 transition-colors block">
                    ✕ {t("clearAll")} ({activeFilterCount})
                </button>
            )}

            {/* Category */}
            <FilterSection title={t("category")} isOpen={openSections.has("category")} onToggle={() => toggleSection("category")}>
                <div ref={sidebarCategoryRef} className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                    {allCategoryNavItems.map((item, idx, arr) => {
                        const isExpanded = !!item.childCount && expandedCategories.has(item.id)
                        const isLastChild = item.isChild && (idx === arr.length - 1 || !arr[idx + 1]?.isChild)
                        const isFirstChild = item.isChild && (idx === 0 || !arr[idx - 1]?.isChild)
                        if (item.isChild) return (
                            <div key={item.id}
                                {...(isFirstChild ? { "data-first-child": arr[idx - 1]?.id } : {})}
                                className={[
                                "flex items-center pl-3 border-l-2 border-emerald-500/40 bg-emerald-500/[0.04] animate-category-slide-in",
                                isLastChild ? "pb-1.5 rounded-b-md mb-0.5" : "",
                            ].join(" ")}>
                                <button
                                    onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                                    className={`flex-1 text-left py-1 text-sm transition-colors flex items-center gap-1.5
                                        ${item.isActive ? "text-emerald-400 font-medium" : "text-gray-400 hover:text-white"}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isActive ? "bg-emerald-400" : "bg-gray-600"}`} />
                                    <span className="truncate">{item.label}</span>
                                    {item.productCount !== undefined && (
                                        <span className="text-[10px] ml-auto shrink-0 text-gray-500">({item.productCount})</span>
                                    )}
                                </button>
                            </div>
                        )
                        return (
                        <div key={item.id} className={[
                            "flex items-center rounded-md transition-colors",
                            isExpanded
                                ? "bg-emerald-500/[0.12] border-l-[3px] border-emerald-400/80 pl-1.5 rounded-b-none"
                                : "hover:bg-white/[0.03]",
                        ].join(" ")}>
                            <button
                                onClick={() => {
                                    if (item.id === "_all") { setSelectedCategory(null); router.push("/products") }
                                    else router.push(item.href)
                                    setSidebarOpen(false)
                                }}
                                className={`flex-1 text-left py-1.5 text-sm transition-colors flex items-center gap-1.5
                                    ${item.isActive ? "text-emerald-400 font-medium" : isExpanded ? "text-white/90" : "text-gray-400 hover:text-white"}`}
                            >
                                <span className="truncate">{item.label}</span>
                                {item.productCount !== undefined && (
                                    <span className={`text-[10px] ml-auto shrink-0 ${isExpanded ? "text-emerald-400 font-medium" : "text-gray-600"}`}>
                                        ({item.productCount})
                                    </span>
                                )}
                            </button>
                            {item.childCount && (
                                <button
                                    onClick={() => {
                                        const willExpand = !expandedCategories.has(item.id)
                                        setExpandedCategories(prev => {
                                            const n = new Set(prev)
                                            n.has(item.id) ? n.delete(item.id) : n.add(item.id)
                                            return n
                                        })
                                        if (willExpand) {
                                            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
                                            scrollTimeoutRef.current = setTimeout(() => {
                                                const firstChild = sidebarCategoryRef.current?.querySelector(`[data-first-child="${item.id}"]`)
                                                firstChild?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                            }, 60)
                                        }
                                    }}
                                    className={`p-1 rounded transition-colors shrink-0 ${isExpanded ? "text-emerald-400 hover:bg-emerald-500/20" : "text-gray-500 hover:bg-white/10"}`}
                                >
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                            )}
                        </div>
                        )
                    })}
                </div>
            </FilterSection>

            {/* Subcategory checkboxes — multi-select, shown on parent category pages only */}
            {showSubcategoryCheckboxes && (
                <FilterSection title={t("categoryPage.subcategories")} isOpen={openSections.has("subcategory")} onToggle={() => toggleSection("subcategory")}>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                        {subcategories!.map(sub => {
                            const subName = getLocalizedName(sub)
                            const checked = selectedSubcategories.includes(sub.slug)
                            return (
                                <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer py-2 group">
                                    <input type="checkbox" checked={checked} onChange={() => toggleSubcategory(sub.slug)}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                    <span className={`text-sm transition-colors flex-1 ${checked ? "text-emerald-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                                        {subName}
                                    </span>
                                    <span className="text-[10px] text-gray-600 shrink-0">({countBySlug[sub.slug] || 0})</span>
                                </label>
                            )
                        })}
                    </div>
                    {selectedSubcategories.length > 0 && (
                        <button onClick={() => setSelectedSubcategories([])}
                            className="mt-1 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearSizes")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Color */}
            {uniqueColors.length > 0 && (
                <FilterSection title={t("color")} isOpen={openSections.has("color")} onToggle={() => toggleSection("color")}>
                    <div className="flex flex-wrap gap-2">
                        {uniqueColors.map(({ id, name, hex, hex2 }) => (
                            <button key={id}
                                onClick={() => toggleColor(id)}
                                title={name.charAt(0).toUpperCase() + name.slice(1)}
                                className={`w-9 h-9 rounded-full overflow-hidden transition-all touch-manipulation hover:scale-110 ${selectedColors.includes(id) ? "scale-110" : ""}`}
                                style={{
                                    ...(hex2 ? { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` } : { backgroundColor: hex }),
                                    boxShadow: selectedColors.includes(id)
                                        ? "0 0 0 2px #34d399, 0 0 0 4px rgba(52,211,153,0.25)"
                                        : "0 0 0 2px rgba(15,23,42,0.7)"
                                }}
                            />
                        ))}
                    </div>
                    {selectedColors.length > 0 && (
                        <button onClick={() => setSelectedColors([])}
                            className="mt-2 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearColors")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Size */}
            {uniqueSizes.length > 0 && (
                <FilterSection title={t("size")} isOpen={openSections.has("size")} onToggle={() => toggleSection("size")}>
                    <div className="space-y-0.5">
                        {uniqueSizes.map(label => (
                            <label key={label} className="flex items-center gap-2.5 cursor-pointer py-2 group">
                                <input type="checkbox" checked={selectedSizes.includes(label)}
                                    onChange={() => toggleSize(label)}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                <span className={`text-sm transition-colors ${
                                    selectedSizes.includes(label)
                                        ? "text-emerald-400 font-medium"
                                        : "text-gray-400 group-hover:text-white"}`}>
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                    {selectedSizes.length > 0 && (
                        <button onClick={() => setSelectedSizes([])}
                            className="mt-1 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearSizes")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Price */}
            <FilterSection title={`${t("price")} (€)`} isOpen={openSections.has("price")} onToggle={() => toggleSection("price")}>
                <div className="flex items-center gap-2">
                    <input type="number" min={0} step="0.01" placeholder={String(absoluteMin)}
                        value={priceMin}
                        onChange={e => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) startTransition(() => setPriceMin(v)) }}
                        onKeyDown={e => { if (e.key === "-") e.preventDefault() }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                    <span className="text-gray-500 shrink-0 text-sm">–</span>
                    <input type="number" min={0} step="0.01" placeholder={String(absoluteMax)}
                        value={priceMax}
                        onChange={e => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) startTransition(() => setPriceMax(v)) }}
                        onKeyDown={e => { if (e.key === "-") e.preventDefault() }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                {priceMin !== "" && priceMax !== "" && parseFloat(priceMin) > parseFloat(priceMax) && (
                    <p className="mt-1 text-xs text-red-400">{t("priceMinMaxError")}</p>
                )}
                {(priceMin !== "" || priceMax !== "") && (
                    <button onClick={() => { setPriceMin(""); setPriceMax("") }}
                        className="mt-2 text-xs text-gray-500 hover:text-white transition-colors">
                        ✕ {t("clearPrice")}
                    </button>
                )}
            </FilterSection>
        </div>
    )

    // Mobile-only sidebar: uses pending state so selections are staged until "Apply" is tapped
    const pendingActiveFilterCount = pendingSubcategories.length + pendingColors.length + pendingSizes.length +
        (pendingPriceMin !== "" ? 1 : 0) + (pendingPriceMax !== "" ? 1 : 0) +
        (pendingBrand ? 1 : 0) +
        (pendingSale ? 1 : 0) + (pendingFeatured ? 1 : 0) + (pendingBestSeller ? 1 : 0)

    const mobileSidebarContent = (
        <div>
            {pendingActiveFilterCount > 0 && (
                <button onClick={() => {
                    setPendingSubcategories([])
                    setPendingColors([])
                    setPendingSizes([])
                    setPendingPriceMin("")
                    setPendingPriceMax("")
                    setPendingBrand(null)
                    setPendingSale(false)
                    setPendingFeatured(false)
                    setPendingBestSeller(false)
                }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 mb-4 transition-colors block">
                    ✕ {t("clearAll")} ({pendingActiveFilterCount})
                </button>
            )}

            {/* Category — parent items navigate, child items are multi-select checkboxes */}
            <FilterSection title={t("category")} isOpen={openSections.has("category")} onToggle={() => toggleSection("category")}>
                <div className="space-y-0.5">
                    {allCategoryNavItems.map((item, idx, arr) => {
                        if (item.isChild) {
                            const childSlug = item.href.split("/").pop() || ""
                            const checked = pendingSubcategories.includes(childSlug)
                            const isLastChild = idx === arr.length - 1 || !arr[idx + 1]?.isChild
                            const isFirstChild = idx === 0 || !arr[idx - 1]?.isChild
                            return (
                                <label key={item.id}
                                    {...(isFirstChild ? { "data-mobile-first-child": arr[idx - 1]?.id } : {})}
                                    className={[
                                    "flex items-center gap-2 cursor-pointer py-2 pl-3 border-l-2 border-emerald-500/40 bg-emerald-500/[0.04] group animate-category-slide-in",
                                    isLastChild ? "pb-2 rounded-b-md mb-0.5" : "",
                                ].join(" ")}>
                                    <input type="checkbox" checked={checked}
                                        onChange={() => setPendingSubcategories(prev =>
                                            prev.includes(childSlug) ? prev.filter(s => s !== childSlug) : [...prev, childSlug]
                                        )}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                    <span className={`text-sm transition-colors flex-1 ${checked ? "text-emerald-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                                        {item.label}
                                    </span>
                                    {item.productCount !== undefined && (
                                        <span className="text-[10px] text-gray-500 shrink-0">({item.productCount})</span>
                                    )}
                                </label>
                            )
                        }
                        const isExpanded = !!item.childCount && expandedCategories.has(item.id)
                        return (
                            <div key={item.id} className={[
                                "flex items-center rounded-md transition-colors",
                                isExpanded
                                    ? "bg-emerald-500/[0.12] border-l-[3px] border-emerald-400/80 pl-1.5 rounded-b-none"
                                    : "hover:bg-white/[0.03]",
                            ].join(" ")}>
                                <button
                                    onClick={() => {
                                        if (item.id === "_all") { setSelectedCategory(null); router.push("/products") }
                                        else router.push(item.href)
                                        setSidebarOpen(false)
                                    }}
                                    className={`flex-1 text-left py-1.5 text-sm transition-colors flex items-center gap-1.5
                                        ${item.isActive ? "text-emerald-400 font-medium" : isExpanded ? "text-white/90" : "text-gray-400 hover:text-white"}`}
                                >
                                    <span className="truncate">{item.label}</span>
                                    {item.productCount !== undefined && (
                                        <span className={`text-[10px] ml-auto shrink-0 ${isExpanded ? "text-emerald-400 font-medium" : "text-gray-600"}`}>({item.productCount})</span>
                                    )}
                                </button>
                                {item.childCount && (
                                    <button
                                        onClick={() => {
                                            const willExpand = !expandedCategories.has(item.id)
                                            setExpandedCategories(prev => {
                                                const n = new Set(prev)
                                                n.has(item.id) ? n.delete(item.id) : n.add(item.id)
                                                return n
                                            })
                                            if (willExpand) {
                                                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
                                                scrollTimeoutRef.current = setTimeout(() => {
                                                    document.querySelector(`[data-mobile-first-child="${item.id}"]`)
                                                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                                }, 60)
                                            }
                                        }}
                                        className={`p-1 rounded transition-colors shrink-0 ${isExpanded ? "text-emerald-400 hover:bg-emerald-500/20" : "text-gray-500 hover:bg-white/10"}`}
                                    >
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </FilterSection>

            {/* Subcategory checkboxes — pending (mobile) */}
            {showSubcategoryCheckboxes && (
                <FilterSection title={t("categoryPage.subcategories")} isOpen={openSections.has("subcategory")} onToggle={() => toggleSection("subcategory")}>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                        {subcategories!.map(sub => {
                            const subName = getLocalizedName(sub)
                            const checked = pendingSubcategories.includes(sub.slug)
                            return (
                                <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer py-2 group">
                                    <input type="checkbox" checked={checked}
                                        onChange={() => setPendingSubcategories(prev => prev.includes(sub.slug) ? prev.filter(s => s !== sub.slug) : [...prev, sub.slug])}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                    <span className={`text-sm transition-colors flex-1 ${checked ? "text-emerald-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                                        {subName}
                                    </span>
                                    <span className="text-[10px] text-gray-600 shrink-0">({countBySlug[sub.slug] || 0})</span>
                                </label>
                            )
                        })}
                    </div>
                    {pendingSubcategories.length > 0 && (
                        <button onClick={() => setPendingSubcategories([])}
                            className="mt-1 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearSizes")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Brand — pending, custom dropdown */}
            {uniqueBrands.length > 0 && (
                <FilterSection title={t("brand")} isOpen={openSections.has("brand")} onToggle={() => toggleSection("brand")}>
                    <div className="space-y-0.5">
                        <label className="flex items-center gap-2.5 cursor-pointer py-2 group">
                            <input type="radio" name="pendingBrand" checked={pendingBrand === null}
                                onChange={() => setPendingBrand(null)}
                                className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                            <span className={`text-sm transition-colors ${pendingBrand === null ? "text-emerald-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                                {t("allBrands")}
                            </span>
                        </label>
                        {uniqueBrands.map(brand => (
                            <label key={brand} className="flex items-center gap-2.5 cursor-pointer py-2 group">
                                <input type="radio" name="pendingBrand" checked={pendingBrand === brand}
                                    onChange={() => setPendingBrand(brand)}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                <span className={`text-sm transition-colors flex-1 ${pendingBrand === brand ? "text-emerald-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                                    {brand}
                                </span>
                                <span className="text-[10px] text-gray-600 shrink-0">({countByBrand[brand] || 0})</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>
            )}

            {/* Quick filters — pending */}
            <FilterSection title={t("filters")} isOpen={openSections.has("quickFilters")} onToggle={() => toggleSection("quickFilters")}>
                <div className="space-y-1">
                    <label className="flex items-center gap-2.5 cursor-pointer py-2 group">
                        <input type="checkbox" checked={pendingSale} onChange={() => setPendingSale(p => !p)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                        <span className={`text-sm transition-colors ${pendingSale ? "text-red-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                            <Tag className="w-3 h-3 inline mr-1" />{t("onSale")}
                        </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer py-2 group">
                        <input type="checkbox" checked={pendingFeatured} onChange={() => setPendingFeatured(p => !p)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                        <span className={`text-sm transition-colors ${pendingFeatured ? "text-violet-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                            ⭐ {t("featured")}
                        </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer py-2 group">
                        <input type="checkbox" checked={pendingBestSeller} onChange={() => setPendingBestSeller(p => !p)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                        <span className={`text-sm transition-colors ${pendingBestSeller ? "text-amber-400 font-medium" : "text-gray-400 group-hover:text-white"}`}>
                            <Check className="w-3 h-3 inline mr-1" />{t("bestSeller")}
                        </span>
                    </label>
                </div>
            </FilterSection>

            {/* Color — pending */}
            {uniqueColors.length > 0 && (
                <FilterSection title={t("color")} isOpen={openSections.has("color")} onToggle={() => toggleSection("color")}>
                    <div className="flex flex-wrap gap-2">
                        {uniqueColors.map(({ id, name, hex, hex2 }) => (
                            <button key={id}
                                onClick={() => setPendingColors(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])}
                                title={name.charAt(0).toUpperCase() + name.slice(1)}
                                className={`w-9 h-9 rounded-full overflow-hidden transition-all touch-manipulation hover:scale-110 ${pendingColors.includes(id) ? "scale-110" : ""}`}
                                style={{
                                    ...(hex2 ? { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` } : { backgroundColor: hex }),
                                    boxShadow: pendingColors.includes(id)
                                        ? "0 0 0 2px #34d399, 0 0 0 4px rgba(52,211,153,0.25)"
                                        : "0 0 0 2px rgba(15,23,42,0.7)"
                                }}
                            />
                        ))}
                    </div>
                    {pendingColors.length > 0 && (
                        <button onClick={() => setPendingColors([])}
                            className="mt-2 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearColors")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Size — pending */}
            {uniqueSizes.length > 0 && (
                <FilterSection title={t("size")} isOpen={openSections.has("size")} onToggle={() => toggleSection("size")}>
                    <div className="space-y-0.5">
                        {uniqueSizes.map(label => (
                            <label key={label} className="flex items-center gap-2.5 cursor-pointer py-2 group">
                                <input type="checkbox" checked={pendingSizes.includes(label)}
                                    onChange={() => setPendingSizes(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label])}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0" />
                                <span className={`text-sm transition-colors ${
                                    pendingSizes.includes(label)
                                        ? "text-emerald-400 font-medium"
                                        : "text-gray-400 group-hover:text-white"}`}>
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                    {pendingSizes.length > 0 && (
                        <button onClick={() => setPendingSizes([])}
                            className="mt-1 text-xs text-gray-500 hover:text-white transition-colors">
                            ✕ {t("clearSizes")}
                        </button>
                    )}
                </FilterSection>
            )}

            {/* Price — pending */}
            <FilterSection title={`${t("price")} (€)`} isOpen={openSections.has("price")} onToggle={() => toggleSection("price")}>
                <div className="flex items-center gap-2">
                    <input type="number" min={0} step="0.01" placeholder={String(absoluteMin)}
                        value={pendingPriceMin}
                        onChange={e => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setPendingPriceMin(v) }}
                        onKeyDown={e => { if (e.key === "-") e.preventDefault() }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                    <span className="text-gray-500 shrink-0 text-sm">–</span>
                    <input type="number" min={0} step="0.01" placeholder={String(absoluteMax)}
                        value={pendingPriceMax}
                        onChange={e => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setPendingPriceMax(v) }}
                        onKeyDown={e => { if (e.key === "-") e.preventDefault() }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                {pendingPriceMin !== "" && pendingPriceMax !== "" && parseFloat(pendingPriceMin) > parseFloat(pendingPriceMax) && (
                    <p className="mt-1 text-xs text-red-400">{t("priceMinMaxError")}</p>
                )}
                {(pendingPriceMin !== "" || pendingPriceMax !== "") && (
                    <button onClick={() => { setPendingPriceMin(""); setPendingPriceMax("") }}
                        className="mt-2 text-xs text-gray-500 hover:text-white transition-colors">
                        ✕ {t("clearPrice")}
                    </button>
                )}
            </FilterSection>
        </div>
    )

    return (
        <>
        <section className="relative py-8 px-4">
            <div className="mx-auto max-w-7xl">
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

                {/* Featured Banner */}
                {featuredFilter && (
                    <div className="mb-6 p-4 md:p-6 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 border border-violet-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-violet-400 flex items-center gap-2">
                                    ⭐ {t("featuredTitle")}
                                </h2>
                                <p className="text-sm md:text-base text-slate-400 mt-1">{t("featuredSubtitle")}</p>
                            </div>
                            <button
                                onClick={() => setFeaturedFilter(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Best Seller Banner */}
                {bestSellerFilter && (
                    <div className="mb-6 p-4 md:p-6 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-amber-400 flex items-center gap-2">
                                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                                    {t("bestSellerTitle")}
                                </h2>
                                <p className="text-sm md:text-base text-slate-400 mt-1">{t("bestSellerSubtitle")}</p>
                            </div>
                            <button
                                onClick={() => setBestSellerFilter(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile top bar: Filters button + Sort */}
                <div className="flex items-center gap-3 mb-4 lg:hidden">
                    <button onClick={openMobileSidebar}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-gray-300 hover:text-white transition-colors touch-manipulation shrink-0">
                        <SlidersHorizontal className="w-4 h-4" />
                        {t("filters")}
                        {activeFilterCount > 0 && (
                            <span className="ml-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <div className="flex-1" />
                    <div className="relative">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="appearance-none pl-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none transition-colors cursor-pointer">
                            <option value="default">{t("sortDefault")}</option>
                            <option value="price-asc">{t("sortPriceLow")}</option>
                            <option value="price-desc">{t("sortPriceHigh")}</option>
                            <option value="discount">{t("sortDiscount")}</option>
                            <option value="name-az">{t("sortNameAZ")}</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Mobile: Search + Brand */}
                <div className="lg:hidden space-y-3 mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="text" placeholder={t("search")} value={searchQuery}
                            onChange={(e) => { const val = e.target.value; startTransition(() => setSearchQuery(val)) }}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                    </div>
                    {uniqueBrands.length > 0 && (
                        <div className="relative" ref={brandDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setBrandDropdownOpen(p => !p)}
                                className="w-full flex items-center justify-between pl-4 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base focus:outline-none transition-colors touch-manipulation"
                            >
                                <span className={selectedBrand ? "text-white" : "text-gray-400"}>
                                    {selectedBrand || t("allBrands")}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${brandDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {brandDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0d0d1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    <button type="button"
                                        onClick={() => { setSelectedBrand(null); setBrandDropdownOpen(false) }}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${!selectedBrand ? "bg-emerald-500/20 text-emerald-400" : "text-gray-300 hover:bg-white/5"}`}>
                                        {!selectedBrand && <Check className="w-3.5 h-3.5 shrink-0" />}
                                        <span className={!selectedBrand ? "" : "pl-5"}>{t("allBrands")}</span>
                                    </button>
                                    {uniqueBrands.map(brand => (
                                        <button type="button" key={brand}
                                            onClick={() => { setSelectedBrand(brand); setBrandDropdownOpen(false) }}
                                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${selectedBrand === brand ? "bg-emerald-500/20 text-emerald-400" : "text-gray-300 hover:bg-white/5"}`}>
                                            {selectedBrand === brand && <Check className="w-3.5 h-3.5 shrink-0" />}
                                            <span className={selectedBrand === brand ? "" : "pl-5"}>{brand}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Two-column layout */}
                <div className="flex gap-8 items-start">

                    {/* Desktop sidebar */}
                    <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-24">
                        {sidebarContent}
                    </aside>

                    {/* Mobile drawer backdrop */}
                    {sidebarOpen && (
                        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)} />
                    )}

                    {/* Mobile drawer */}
                    <div className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0d0d1a] border-r border-white/10
                        overflow-y-auto transition-transform duration-300 ease-in-out lg:hidden
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 sticky top-0 bg-[#0d0d1a] z-10">
                            <span className="font-semibold text-white">{t("filters")}</span>
                            <button onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:text-white text-gray-400 touch-manipulation -mr-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 pb-24">{mobileSidebarContent}</div>
                        <div className="sticky bottom-0 p-4 bg-[#0d0d1a] border-t border-white/10">
                            <button onClick={applyMobileFilters}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all touch-manipulation">
                                {t("applyFilters")} ({pendingFilteredCount})
                            </button>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">

                        {/* Desktop top bar: Search + Brand + Sort */}
                        <div className="hidden lg:flex items-center gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input type="text" placeholder={t("search")} value={searchQuery}
                                    onChange={(e) => { const val = e.target.value; startTransition(() => setSearchQuery(val)) }}
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                            {uniqueBrands.length > 0 && (
                                <div className="relative">
                                    <select value={selectedBrand || ""} onChange={e => setSelectedBrand(e.target.value || null)}
                                        className="appearance-none pl-4 pr-9 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none transition-colors cursor-pointer">
                                        <option value="">{t("allBrands")}</option>
                                        {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                </div>
                            )}
                            <div className="relative">
                                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                                    className="appearance-none pl-4 pr-9 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none transition-colors cursor-pointer">
                                    <option value="default">{t("sortDefault")}</option>
                                    <option value="price-asc">{t("sortPriceLow")}</option>
                                    <option value="price-desc">{t("sortPriceHigh")}</option>
                                    <option value="discount">{t("sortDiscount")}</option>
                                    <option value="name-az">{t("sortNameAZ")}</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Sale / Featured / BestSeller quick-filter buttons */}
                        <div className="flex gap-2 flex-wrap mb-6">
                            <button
                                onClick={() => {
                                    setSaleFilter(false)
                                    setFeaturedFilter(false)
                                    setBestSellerFilter(false)
                                    setSelectedSubcategories([])
                                    if (!subcategories && !initialCategory) router.push('/products')
                                }}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${!saleFilter && !featuredFilter && !bestSellerFilter && !selectedSubcategories.length && !selectedCategory
                                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"}`}
                            >
                                {t("allProducts")}
                            </button>
                            <button
                                onClick={() => setSaleFilter(s => !s)}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${saleFilter
                                    ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30"
                                    : "text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"}`}
                            >
                                <Tag className="w-3.5 h-3.5" />
                                {t("onSale")}
                            </button>
                            <button
                                onClick={() => setFeaturedFilter(f => !f)}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${featuredFilter
                                    ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border border-violet-500/30"
                                    : "text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/20"}`}
                            >
                                ⭐ {t("featured")}
                            </button>
                            <button
                                onClick={() => setBestSellerFilter(b => !b)}
                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${bestSellerFilter
                                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30"
                                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"}`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                {t("bestSeller")}
                            </button>
                        </div>

                        {/* Product count */}
                        <p className="text-xs text-gray-600 mb-4">{t("productCount", { count: sortedProducts.length })}</p>

                        {/* Products Grid */}
                        {sortedProducts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>{t("noProducts")}</p>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAllFilters} className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4">
                                        {t("clearAll")} ({activeFilterCount})
                                    </button>
                                )}
                            </div>
                        ) : (
                        <div className={`grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 ${isPending ? "opacity-60 transition-opacity" : ""}`}>
                        {sortedProducts.map((product, productIndex) => {
                            const name = getLocalizedName(product)
                            const desc = getLocalizedDesc(product)
                            const categoryColor = getCategoryColor(product.category)
                            const categoryName = getCategoryName(product.category)
                            const price = formatPrice(product)

                            // Calculate discount % using first available package (matches detail page default)
                            const discountPercent = getCardDiscountPercent(product)
                            // Find the package with the highest discount (for price + image)
                            const bestDiscountPkg = product.onSale && product.packages?.length
                                ? product.packages.reduce((best, pkg) => {
                                    if (!pkg.salePrice) return best
                                    const d = Math.round((1 - parseFloat(pkg.salePrice) / parseFloat(pkg.price)) * 100)
                                    if (!best || d > best.d) return { pkg, d }
                                    return best
                                }, null as { pkg: ProductPackage; d: number } | null)?.pkg ?? null
                                : null
                            // Show the first in_stock variant image for the best-discount package,
                            // falling back to product.image
                            let cardImage = product.image
                            if (bestDiscountPkg?.packageVariants?.length && product.variants?.length) {
                                const inStockIds = new Set(
                                    bestDiscountPkg.packageVariants
                                        .filter(pv => pv.status === "in_stock" || pv.status === "pre_order")
                                        .map(pv => pv.variantId)
                                )
                                const matchedVariant = product.variants.find(v => inStockIds.has(v.id) && v.image)
                                if (matchedVariant?.image) cardImage = matchedVariant.image
                            }

                            // Build card URL — pre-select best-discount package so detail page opens correctly
                            const cardUrl = bestDiscountPkg
                                ? `${getProductUrl(product, categories)}?weight=${encodeURIComponent(bestDiscountPkg.weight.label)}`
                                : getProductUrl(product, categories)

                            return (
                                <Link
                                    key={product.id}
                                    href={cardUrl}
                                    className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                >
                                    {/* Image */}
                                    <div className="relative h-32 sm:h-48 overflow-hidden bg-white/5">
                                        {cardImage ? (
                                            <img
                                                src={cardImage}
                                                alt={name}
                                                loading={productIndex < 6 ? "eager" : "lazy"}
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
                                            discountPercent={computeDiscountPercent(
                                                bestDiscountPkg?.price ?? product.price,
                                                bestDiscountPkg?.salePrice ?? product.salePrice,
                                            )}
                                            hasBulkDiscount={computeHasBulkDiscount(product.bulkDiscountTiers, product.packages, product.bulkDiscountExpiresAt)}
                                            status={product.status}
                                            showStatusOverlay
                                            coupon={couponMap?.[product.id] ?? null}
                                        />

                                        {/* Top-right: Sale + Wishlist */}
                                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                                            {(product.onSale || computeHasBulkDiscount(product.bulkDiscountTiers, product.packages, product.bulkDiscountExpiresAt)) && (
                                                <div onClick={e => { e.preventDefault(); e.stopPropagation(); router.push("/products?sale=true") }} className="flex gap-1 cursor-pointer">
                                                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold bg-red-500 text-white shadow-lg">
                                                        {t("onSale")}
                                                    </span>
                                                    {product.onSale && discountPercent > 0 && (
                                                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold bg-red-500 text-white shadow-lg">
                                                            -{discountPercent}%
                                                        </span>
                                                    )}
                                                </div>
                                            )}
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
                                            {product.status === "pre_order" && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                                    {t("preOrder")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick View — Desktop: slide-up bar on hover */}
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewProduct(product) }}
                                            className="hidden sm:flex absolute bottom-0 inset-x-0 py-1.5 bg-slate-900/85 backdrop-blur-sm items-center justify-center gap-1.5 text-white text-xs font-medium z-10 touch-manipulation opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {t("quickView")}
                                        </button>
                                        {/* Quick View — Mobile: always-visible pill */}
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewProduct(product) }}
                                            className="sm:hidden absolute bottom-2 inset-x-2 py-1.5 bg-slate-900/75 backdrop-blur-sm rounded-lg flex items-center justify-center gap-1.5 text-white text-xs font-medium z-10 touch-manipulation"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {t("quickView")}
                                        </button>
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
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/brands/${product.brand!.slug}`) }}
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
                                            <p className="text-slate-400 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-4">
                                                {(() => { const t = desc.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim(); return t.length > 50 ? t.substring(0, 50) + "..." : t })()}
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
                                                ) : product.onSale && (bestDiscountPkg?.salePrice || product.salePrice) ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-xl font-bold text-red-400 whitespace-nowrap">
                                                            {parseFloat(bestDiscountPkg?.salePrice || product.salePrice || "0").toFixed(2)} {product.currency}
                                                        </span>
                                                        <span className="text-[10px] sm:text-sm text-gray-500 line-through whitespace-nowrap">
                                                            {bestDiscountPkg
                                                                ? `${parseFloat(bestDiscountPkg.price).toFixed(2)} ${product.currency}`
                                                                : price}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm sm:text-xl font-bold text-white whitespace-nowrap">
                                                        {price || "-"}
                                                    </span>
                                                )}
                                            </div>
                                            {!["in_stock", "pre_order"].includes(product.status) ? (
                                                <span className="w-full sm:w-auto flex sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 text-xs font-medium group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all whitespace-nowrap">
                                                    <Bell className="w-3.5 h-3.5 shrink-0" />
                                                    {t("notifyMeShort")}
                                                </span>
                                            ) : product.priceType === "fixed" && product.fileType !== "service" ? (
                                                <span className="w-full sm:w-auto flex sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium group-hover:bg-emerald-500/30 transition-all whitespace-nowrap">
                                                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                                    {t("buyNow")}
                                                </span>
                                            ) : (
                                                <span className="w-full sm:w-auto flex sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium group-hover:bg-amber-500/30 transition-all whitespace-nowrap">
                                                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                                    {t("getQuote")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                        </div>
                        )}
                    </div>{/* end main content */}
                </div>{/* end two-column flex */}
            </div>
        </section>

        {/* Quick View Modal */}
        {quickViewProduct && (
            <QuickViewModal
                key={quickViewProduct.id}
                product={quickViewProduct}
                locale={locale}
                isWishlisted={wishlistedProductIds.includes(quickViewProduct.id)}
                categories={categories}
                initialPackageLabel={
                    (() => {
                        const bestPkg = quickViewProduct.onSale && quickViewProduct.packages?.length
                            ? quickViewProduct.packages.reduce((best, pkg) => {
                                if (!pkg.salePrice) return best
                                const d = Math.round((1 - parseFloat(pkg.salePrice) / parseFloat(pkg.price)) * 100)
                                if (!best || d > best.d) return { pkg, d }
                                return best
                            }, null as { pkg: typeof quickViewProduct.packages[0]; d: number } | null)?.pkg
                            : null
                        return bestPkg?.weight.label
                    })()
                }
                promotedCoupon={couponMap?.[quickViewProduct.id] ?? null}
                onClose={() => setQuickViewProduct(null)}
            />
        )}
        </>
    )
}
