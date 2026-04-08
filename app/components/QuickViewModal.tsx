"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { X, ExternalLink } from "lucide-react"
import { ProductImageGallery } from "./ProductImageGallery"
import { ProductActions } from "./ProductActions"

interface Color { nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null }
interface ProductVariant { id: string; image: string | null; status: string; colorId: string; color: Color }
interface PackageVariant { variantId: string; status: string }
interface ProductPackage {
    id: string
    price: string
    salePrice: string | null
    status: string
    weight: { label: string }
    packageVariants?: PackageVariant[]
}
interface Product {
    id: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    descBg?: string | null
    descEn?: string | null
    descEs?: string | null
    price: string | null
    salePrice: string | null
    onSale: boolean
    currency: string
    priceType: string
    fileType: string | null
    status: string
    image: string | null
    gallery?: string[]
    featured: boolean
    bestSeller: boolean
    createdAt: string | Date
    brand: { slug: string; nameBg: string; nameEn: string; nameEs: string } | null
    variants?: ProductVariant[]
    packages?: ProductPackage[]
    category: string
}
interface ProductCategory {
    id: string
    slug: string
    parentId?: string | null
    nameBg: string
    nameEn: string
    nameEs: string
    children?: { id: string; slug: string }[]
    parent?: { slug: string } | null
}
interface QuickViewModalProps {
    product: Product
    locale: string
    isWishlisted: boolean
    categories: ProductCategory[]
    initialPackageLabel?: string
    onClose: () => void
}

export function QuickViewModal({ product, locale, isWishlisted, categories, initialPackageLabel, onClose }: QuickViewModalProps) {
    const t = useTranslations("products")
    const [descExpanded, setDescExpanded] = useState(false)
    const backdropRef = useRef<HTMLDivElement>(null)

    // Scroll modal box to top on mount so the modal header is always visible
    useEffect(() => { backdropRef.current?.scrollTo(0, 0) }, [])

    const packages = product.packages ?? []
    const variants = product.variants ?? []

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg
            case "es": return item.nameEs
            default: return item.nameEn
        }
    }

    const name = getLocalizedName(product)
    const brandName = product.brand ? getLocalizedName(product.brand) : null

    // Default package — prefer initialPackageLabel match, then first in_stock
    const getDefaultPackageIndex = () => {
        if (packages.length === 0) return -1
        if (initialPackageLabel) {
            const idx = packages.findIndex(p => p.weight.label === initialPackageLabel)
            if (idx >= 0) return idx
        }
        const firstAvailable = packages.findIndex(p => ["in_stock", "pre_order"].includes(p.status))
        return firstAvailable >= 0 ? firstAvailable : 0
    }

    const [selectedPackageIndex, setSelectedPackageIndex] = useState(getDefaultPackageIndex)
    const selectedPackage = selectedPackageIndex >= 0 && packages.length > 0 ? packages[selectedPackageIndex] : null

    // Available variant IDs for selected package
    const availableVariantIds = useMemo<Set<string> | null>(() => {
        if (!selectedPackage?.packageVariants?.length) return null
        return new Set(selectedPackage.packageVariants.map(pv => pv.variantId))
    }, [selectedPackage])

    const getDefaultVariantIndex = (pkgIdx: number) => {
        if (variants.length === 0) return -1
        const pkg = pkgIdx >= 0 ? packages[pkgIdx] : null
        if (!pkg?.packageVariants?.length) {
            const first = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
            return first >= 0 ? first : 0
        }
        const pvMap = new Map(pkg.packageVariants.map(pv => [pv.variantId, pv.status]))
        const firstAvailable = variants.findIndex(
            v => pvMap.has(v.id) && ["in_stock", "pre_order"].includes(pvMap.get(v.id) || "")
        )
        if (firstAvailable >= 0) return firstAvailable
        const first = variants.findIndex(v => pvMap.has(v.id))
        return first >= 0 ? first : 0
    }

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(() => getDefaultVariantIndex(getDefaultPackageIndex()))

    // Indices of variants visible for selected package
    const availableVariantIndices = useMemo<number[] | null>(() => {
        if (!availableVariantIds) return null
        const indices = variants.map((v, i) => (availableVariantIds.has(v.id) ? i : -1)).filter(i => i >= 0)
        return indices.length > 0 ? indices : null
    }, [availableVariantIds, variants])

    // Package change handler — NO router.replace (Bug 2 fix)
    const handlePackageChange = (index: number) => {
        setSelectedPackageIndex(index)
        const pkg = packages[index]
        if (!pkg) return
        if (pkg.packageVariants?.length) {
            const pvMap = new Map(pkg.packageVariants.map(pv => [pv.variantId, pv.status]))
            const firstAvailableIdx = variants.findIndex(
                v => pvMap.has(v.id) && ["in_stock", "pre_order"].includes(pvMap.get(v.id) || "")
            )
            const firstIdx = firstAvailableIdx >= 0 ? firstAvailableIdx : variants.findIndex(v => pvMap.has(v.id))
            setSelectedVariantIndex(firstIdx >= 0 ? firstIdx : -1)
        } else {
            const firstAvailableIdx = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
            setSelectedVariantIndex(firstAvailableIdx >= 0 ? firstAvailableIdx : 0)
        }
    }

    // Variant status from variant itself
    const selectedVariantStatus = selectedVariantIndex >= 0
        ? variants[selectedVariantIndex]?.status || "in_stock"
        : undefined

    // Junction-level status override
    const packageVariantStatus = useMemo<string | undefined>(() => {
        if (!selectedPackage?.packageVariants?.length || selectedVariantIndex < 0) return undefined
        const variantId = variants[selectedVariantIndex]?.id
        if (!variantId) return undefined
        return selectedPackage.packageVariants.find(pv => pv.variantId === variantId)?.status
    }, [selectedPackage, selectedVariantIndex, variants])

    const effectiveVariantStatus = packageVariantStatus ?? selectedVariantStatus

    // packageVariantStatusMap for gallery (colorId → status)
    const packageVariantStatusMap = useMemo<Map<string, string> | null>(() => {
        if (!selectedPackage?.packageVariants?.length) return null
        const map = new Map<string, string>()
        for (const pv of selectedPackage.packageVariants) {
            const variant = variants.find(v => v.id === pv.variantId)
            if (variant) map.set(variant.colorId, pv.status)
        }
        return map
    }, [selectedPackage, variants])

    const selectedVariantId = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.id : undefined
    const selectedVariantImage = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.image : null
    const selectedVariantColor = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.color ?? null : null

    // Price computation
    const displayPrice = selectedPackage
        ? parseFloat(selectedPackage.price)
        : product.price ? parseFloat(product.price) : null

    const displaySalePrice = selectedPackage
        ? (selectedPackage.salePrice ? parseFloat(selectedPackage.salePrice) : null)
        : (product.onSale && product.salePrice ? parseFloat(product.salePrice) : null)

    const isOnSale = selectedPackage ? !!selectedPackage.salePrice : !!product.onSale

    const lowestPackagePrice = packages.length > 0
        ? Math.min(...packages.map(p => parseFloat(p.price)))
        : null

    const discountPercent = isOnSale && displaySalePrice && displayPrice
        ? Math.round((1 - displaySalePrice / displayPrice) * 100)
        : null

    const isNew = !!product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000

    // Description excerpt — strip HTML tags, truncate at 220 chars
    const rawDesc = locale === "bg" ? product.descBg : locale === "es" ? product.descEs : product.descEn
    const rawDescStripped = rawDesc
        ? rawDesc
            .replace(/<\/(p|li|h[1-6]|div|blockquote|tr|th|td)>/gi, " ")  // block-end → space
            .replace(/<br\s*\/?>/gi, " ")                                    // line breaks → space
            .replace(/<[^>]*>/g, "")                                         // strip remaining tags
            .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
            .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\s+/g, " ").trim()
        : null
    const DESC_LIMIT = 220
    const descExcerpt = rawDescStripped ? rawDescStripped.slice(0, DESC_LIMIT) : null
    const descIsTruncated = rawDescStripped ? rawDescStripped.length > DESC_LIMIT : false

    // Build canonical product URL (Bug 6+7 fix)
    const productUrl = (() => {
        const cat = categories.find(c => c.slug === product.category)
        const parent = cat?.parentId ? categories.find(c => c.id === cat.parentId) : null
        const b = product.brand?.slug
        if (parent && b) return `/products/${parent.slug}/${product.category}/${b}/${product.slug}`
        if (parent)      return `/products/${parent.slug}/${product.category}/${product.slug}`
        if (b)           return `/products/${product.category}/${b}/${product.slug}`
        return `/products/${product.category}/${product.slug}`
    })()

    const viewFullUrl = selectedPackage
        ? `${productUrl}?weight=${encodeURIComponent(selectedPackage.weight.label)}`
        : productUrl

    // Status badge
    const statusBadge = (() => {
        const status = effectiveVariantStatus ?? product.status
        const badgeClass = status === "in_stock" ? "bg-emerald-500/20 text-emerald-400"
            : status === "pre_order" ? "bg-purple-500/20 text-purple-400"
            : status === "coming_soon" ? "bg-blue-500/20 text-blue-400"
            : status === "sold_out" ? "bg-red-500/20 text-red-400"
            : "bg-gray-500/20 text-gray-400"
        const label = status === "in_stock" ? t("inStock")
            : status === "pre_order" ? t("preOrder")
            : status === "coming_soon" ? t("comingSoon")
            : status === "sold_out" ? t("soldOut")
            : t("outOfStock")
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{label}</span>
    })()

    // Bug 1+5 fix: modal at z-40, lightbox (z-50) and QuoteForm (z-50) render above
    // Bug 2 fix: NO Escape key listener (conflicts with lightbox)
    // Bug 3 fix: NO body scroll lock (conflicts with lightbox scroll restoration)
    return (
        /* Backdrop — z-[55] sits above header (z-50); lightbox + QuoteForm use z-[65] */
        <div
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm overflow-hidden flex items-start justify-center px-4 py-6"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[88svh] flex flex-col bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button row — always visible, never scrolls away */}
                <div className="shrink-0 flex justify-end p-3 pb-0">
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div ref={backdropRef} className="overflow-y-auto overscroll-y-contain flex-1 p-4 pt-2 sm:p-6 sm:pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-start">
                        {/* LEFT: Image gallery */}
                        <ProductImageGallery
                            mainImage={product.image}
                            productName={name}
                            variants={variants}
                            locale={locale}
                            gallery={product.gallery ?? []}
                            productStatus={product.status}
                            onVariantChange={setSelectedVariantIndex}
                            selectedVariantIndex={selectedVariantIndex}
                            availableVariantIndices={availableVariantIndices}
                            packageVariantStatusMap={packageVariantStatusMap}
                            isNew={isNew}
                            discountPercent={discountPercent}
                        />

                        {/* RIGHT: Details */}
                        <div className="flex flex-col gap-4 pb-2">
                            {/* Brand — plain text matching product detail page */}
                            {brandName && (
                                <p className="text-sm text-slate-400 font-medium">{brandName}</p>
                            )}

                            {/* Name */}
                            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight pr-8">
                                {name}
                            </h2>

                            {/* Status badge + badges row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {statusBadge}
                                {isNew && (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-cyan-500 text-white shadow-lg tracking-wider uppercase">
                                        NEW
                                    </span>
                                )}
                                {product.bestSeller && (
                                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500 text-white shadow-lg">
                                        ✓ {t("bestSeller")}
                                    </span>
                                )}
                            </div>

                            {/* Description — expandable inline */}
                            {rawDescStripped && (
                                <div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {descExpanded ? rawDescStripped : descExcerpt}
                                        {!descExpanded && descIsTruncated && "…"}
                                    </p>
                                    {descIsTruncated && (
                                        <button
                                            onClick={() => setDescExpanded(v => !v)}
                                            className="mt-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors touch-manipulation"
                                        >
                                            {descExpanded ? `↑ ${t("showLess")}` : `↓ ${t("readMore")}`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Divider */}
                            <div className="border-t border-white/8" />

                            {/* Package selector */}
                            {packages.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        {t("size")}{selectedPackage ? `: ${selectedPackage.weight.label}` : ""}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {packages.map((pkg, index) => {
                                            const isUnavailable = !["in_stock", "pre_order"].includes(pkg.status)
                                            const isSelected = selectedPackageIndex === index
                                            return (
                                                <button
                                                    key={pkg.id}
                                                    onClick={() => !isUnavailable && handlePackageChange(index)}
                                                    disabled={isUnavailable}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all touch-manipulation ${
                                                        isSelected
                                                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                                                            : isUnavailable
                                                                ? "bg-transparent border-white/10 text-gray-600 line-through cursor-not-allowed opacity-40"
                                                                : "bg-transparent border-white/20 text-gray-300 hover:border-emerald-500/50 hover:text-white hover:bg-white/5"
                                                    }`}
                                                >
                                                    {pkg.weight.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Price box */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                                {packages.length > 0 && !selectedPackage ? (
                                    <div>
                                        <span className="text-2xl sm:text-3xl font-bold text-white">
                                            {t("from")} {lowestPackagePrice?.toFixed(2)} {product.currency}
                                        </span>
                                        <p className="text-sm text-slate-500 mt-1">{t("selectSize")}</p>
                                    </div>
                                ) : isOnSale && displaySalePrice ? (
                                    <div className="flex flex-wrap items-baseline gap-3">
                                        <span className="text-3xl font-bold text-red-400">
                                            {displaySalePrice.toFixed(2)} {product.currency}
                                        </span>
                                        <span className="text-base text-slate-500 line-through">
                                            {displayPrice?.toFixed(2)} {product.currency}
                                        </span>
                                        {discountPercent && discountPercent > 0 && (
                                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                                                -{discountPercent}%
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {displayPrice ? `${displayPrice.toFixed(2)} ${product.currency}` : "-"}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <ProductActions
                                product={product}
                                selectedVariantStatus={effectiveVariantStatus}
                                selectedVariantId={selectedVariantId}
                                selectedVariantImage={selectedVariantImage}
                                selectedVariantColor={selectedVariantColor}
                                selectedPackage={selectedPackage ? { ...selectedPackage, sku: null, weightId: "" } : null}
                                packages={packages}
                                isWishlisted={isWishlisted}
                            />

                            {/* View full details link */}
                            <Link
                                href={viewFullUrl}
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                {t("viewFullDetails")} <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>{/* end scrollable content */}
            </div>
        </div>
    )
}
