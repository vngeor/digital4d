"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ProductImageGallery } from "./ProductImageGallery"
import { ProductActions } from "./ProductActions"

interface Variant {
    id: string
    image: string | null
    status: string
    colorId: string
    color: { nameBg: string; nameEn: string; nameEs: string; hex: string }
}

interface PackageVariantEntry {
    variantId: string
    status: string
}

interface PackageData {
    id: string
    slug: string
    price: string
    salePrice: string | null
    sku: string | null
    status: string
    order: number
    weightId: string
    weight: { label: string }
    packageVariants?: PackageVariantEntry[]
}

interface Product {
    id: string
    slug: string
    nameEn: string
    nameBg: string
    nameEs: string
    price: string | null
    salePrice?: string | null
    onSale?: boolean
    currency?: string
    fileType: string | null
    priceType: string
    status: string
    featured?: boolean
    bestSeller?: boolean
    createdAt?: string
    brand?: { slug: string; nameEn: string; nameBg: string; nameEs: string } | null
}

interface PromotedCoupon {
    code: string
    type: string
    value: string
    currency: string | null
    expiresAt: string | null
    allowOnSale?: boolean
}

interface ProductDetailClientProps {
    product: Product
    productName: string
    variants: Variant[]
    packages?: PackageData[]
    initialPackageSlug?: string
    locale: string
    mainImage: string | null
    gallery: string[]
    initialCouponCode?: string
    promotedCoupons?: PromotedCoupon[]
    isWishlisted?: boolean
    children: React.ReactNode // Category badges, brand, name, wishlist, status badge
}

export function ProductDetailClient({
    product,
    productName,
    variants,
    packages = [],
    initialPackageSlug,
    locale,
    mainImage,
    gallery,
    initialCouponCode,
    promotedCoupons,
    isWishlisted,
    children,
}: ProductDetailClientProps) {
    const t = useTranslations("products")
    const router = useRouter()

    const getDefaultPackageIndex = () => {
        if (packages.length === 0) return -1
        if (initialPackageSlug) {
            const idx = packages.findIndex(p => p.slug === initialPackageSlug)
            return idx >= 0 ? idx : 0
        }
        const firstAvailable = packages.findIndex(p => ["in_stock", "pre_order"].includes(p.status))
        return firstAvailable >= 0 ? firstAvailable : 0
    }

    const [selectedPackageIndex, setSelectedPackageIndex] = useState(getDefaultPackageIndex)
    const selectedPackage = selectedPackageIndex >= 0 && packages.length > 0 ? packages[selectedPackageIndex] : null

    // Compute available variant IDs for selected package (null = all variants shown)
    const availableVariantIds = useMemo<Set<string> | null>(() => {
        if (!selectedPackage?.packageVariants?.length) return null
        return new Set(selectedPackage.packageVariants.map(pv => pv.variantId))
    }, [selectedPackage])

    const getDefaultVariantIndex = () => {
        if (variants.length === 0) return -1
        const pkg = selectedPackageIndex >= 0 ? packages[selectedPackageIndex] : null
        if (!pkg?.packageVariants?.length) {
            // No package filter — prefer first available (in_stock/pre_order) variant
            const first = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
            return first >= 0 ? first : 0
        }
        // With package filter — use per-package status (not global variant status)
        const pvMap = new Map(pkg.packageVariants.map(pv => [pv.variantId, pv.status]))
        const firstAvailable = variants.findIndex(
            v => pvMap.has(v.id) && ["in_stock", "pre_order"].includes(pvMap.get(v.id) || "")
        )
        if (firstAvailable >= 0) return firstAvailable
        const first = variants.findIndex(v => pvMap.has(v.id))
        return first >= 0 ? first : 0
    }

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(getDefaultVariantIndex)

    // Indices of variants visible for the selected package
    const availableVariantIndices = useMemo<number[] | null>(() => {
        if (!availableVariantIds) return null
        const indices = variants
            .map((v, i) => (availableVariantIds.has(v.id) ? i : -1))
            .filter(i => i >= 0)
        return indices.length > 0 ? indices : null
    }, [availableVariantIds, variants])

    // When package changes: update URL + always auto-select first available color
    const handlePackageChange = (index: number) => {
        setSelectedPackageIndex(index)
        const pkg = packages[index]
        if (!pkg) return
        const url = new URL(window.location.href)
        url.searchParams.set("weight", pkg.slug)
        router.replace(url.pathname + url.search, { scroll: false })
        if (pkg.packageVariants?.length) {
            // Always select first available color using per-package status
            const pvMap = new Map(pkg.packageVariants.map(pv => [pv.variantId, pv.status]))
            const firstAvailableIdx = variants.findIndex(
                v => pvMap.has(v.id) && ["in_stock", "pre_order"].includes(pvMap.get(v.id) || "")
            )
            const firstIdx = firstAvailableIdx >= 0
                ? firstAvailableIdx
                : variants.findIndex(v => pvMap.has(v.id))
            setSelectedVariantIndex(firstIdx >= 0 ? firstIdx : -1)
        } else {
            // No package variants — select first globally available color
            const firstAvailableIdx = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
            setSelectedVariantIndex(firstAvailableIdx >= 0 ? firstAvailableIdx : 0)
        }
    }

    // Base variant status from the variant itself
    const selectedVariantStatus = selectedVariantIndex >= 0
        ? variants[selectedVariantIndex]?.status || "in_stock"
        : undefined

    // Junction-level status overrides variant status when both package + variant selected
    const packageVariantStatus = useMemo<string | undefined>(() => {
        if (!selectedPackage?.packageVariants?.length || selectedVariantIndex < 0) return undefined
        const variantId = variants[selectedVariantIndex]?.id
        if (!variantId) return undefined
        return selectedPackage.packageVariants.find(pv => pv.variantId === variantId)?.status
    }, [selectedPackage, selectedVariantIndex, variants])

    // The effective status used for purchase eligibility
    const effectiveVariantStatus = packageVariantStatus ?? selectedVariantStatus

    // Maps colorId → packageVariant status for the currently selected package
    const packageVariantStatusMap = useMemo<Map<string, string> | null>(() => {
        if (!selectedPackage?.packageVariants?.length) return null
        const map = new Map<string, string>()
        for (const pv of selectedPackage.packageVariants) {
            const variant = variants.find(v => v.id === pv.variantId)
            if (variant) map.set(variant.colorId, pv.status)
        }
        return map
    }, [selectedPackage, variants])

    // The selected variant's ID, image, and color for checkout/cart
    const selectedVariantId = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.id : undefined
    const selectedVariantImage = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.image : null
    const selectedVariantColor = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.color ?? null : null

    // Price computation — package overrides base product price
    const displayPrice = selectedPackage
        ? parseFloat(selectedPackage.price)
        : product.price ? parseFloat(product.price.toString()) : null

    const displaySalePrice = selectedPackage
        ? (selectedPackage.salePrice ? parseFloat(selectedPackage.salePrice) : null)
        : (product.onSale && product.salePrice ? parseFloat(product.salePrice.toString()) : null)

    const isOnSale = selectedPackage ? !!selectedPackage.salePrice : !!product.onSale

    const lowestPackagePrice = packages.length > 0
        ? Math.min(...packages.map(p => parseFloat(p.price)))
        : null

    const discountPercent = isOnSale && displaySalePrice && displayPrice
        ? Math.round((1 - displaySalePrice / displayPrice) * 100)
        : null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            {/* Image + Color Variants */}
            <ProductImageGallery
                mainImage={mainImage}
                productName={productName}
                variants={variants}
                locale={locale}
                gallery={gallery}
                productStatus={product.status}
                onVariantChange={setSelectedVariantIndex}
                selectedVariantIndex={selectedVariantIndex}
                availableVariantIndices={availableVariantIndices}
                packageVariantStatusMap={packageVariantStatusMap}
                isNew={!!product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000}
                discountPercent={discountPercent}
            />

            {/* Details */}
            <div className="space-y-3 md:space-y-6">
                {children}

                {/* Reactive status badge — updates when variant is selected */}
                {(() => {
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
                    return (
                        <div className="-mt-1 md:-mt-3">
                            <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium ${badgeClass}`}>
                                {label}
                            </span>
                        </div>
                    )
                })()}

                {/* Package Size Selector */}
                {packages.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-300">
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
                                        className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium border-2 transition-all touch-manipulation ${
                                            isSelected
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : isUnavailable
                                                    ? "bg-transparent border-white/15 text-gray-600 line-through cursor-not-allowed opacity-50"
                                                    : "bg-transparent border-white/30 text-gray-300 hover:border-emerald-500/60 hover:text-white"
                                        }`}
                                    >
                                        {pkg.weight.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Price */}
                <div className="p-3 sm:p-4 md:p-6 rounded-lg md:rounded-xl bg-white/5 border border-white/10">
                    {packages.length > 0 && !selectedPackage ? (
                        <div>
                            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                                {t("from")} {lowestPackagePrice?.toFixed(2)} {product.currency}
                            </span>
                            <p className="text-sm text-gray-500 mt-1">{t("selectSize")}</p>
                        </div>
                    ) : isOnSale && displaySalePrice ? (
                        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                            <span className="text-xl sm:text-2xl md:text-4xl font-bold text-red-400">
                                {displaySalePrice.toFixed(2)} {product.currency}
                            </span>
                            <span className="text-sm sm:text-base md:text-xl text-gray-500 line-through">
                                {displayPrice?.toFixed(2)} {product.currency}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xl sm:text-2xl md:text-4xl font-bold text-white">
                            {displayPrice ? `${displayPrice.toFixed(2)} ${product.currency}` : "-"}
                        </span>
                    )}
                </div>

                {/* Action Buttons */}
                <ProductActions
                    product={product}
                    initialCouponCode={initialCouponCode}
                    promotedCoupons={promotedCoupons}
                    selectedVariantStatus={effectiveVariantStatus}
                    selectedVariantId={selectedVariantId}
                    selectedVariantImage={selectedVariantImage}
                    selectedVariantColor={selectedVariantColor}
                    selectedPackage={selectedPackage}
                    packages={packages}
                    isWishlisted={isWishlisted}
                />
            </div>
        </div>
    )
}
