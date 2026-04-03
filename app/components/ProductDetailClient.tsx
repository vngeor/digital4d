"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ProductImageGallery } from "./ProductImageGallery"
import { ProductActions } from "./ProductActions"

interface Variant {
    colorNameBg: string
    colorNameEn: string
    colorNameEs: string
    colorHex: string
    image: string | null
    status: string
}

interface PackageData {
    id: string
    label: string
    slug: string
    price: string
    salePrice: string | null
    sku: string | null
    status: string
    order: number
}

interface Product {
    id: string
    slug: string
    nameEn: string
    price: string | null
    salePrice?: string | null
    onSale?: boolean
    currency?: string
    fileType: string | null
    status: string
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
    packages: PackageData[]
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
    packages,
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

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(variants.length > 0 ? 0 : -1)

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

    const handlePackageChange = (index: number) => {
        setSelectedPackageIndex(index)
        const pkg = packages[index]
        if (!pkg) return
        const url = new URL(window.location.href)
        url.searchParams.set("size", pkg.slug)
        router.replace(url.pathname + url.search, { scroll: false })
    }

    const selectedVariantStatus = selectedVariantIndex >= 0
        ? variants[selectedVariantIndex]?.status || "in_stock"
        : undefined

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
            />

            {/* Details */}
            <div className="space-y-3 md:space-y-6">
                {children}

                {/* Package Size Selector */}
                {packages.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-300">
                            {t("size")}{selectedPackage ? `: ${selectedPackage.label}` : ""}
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
                                        {pkg.label}
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
                    selectedVariantStatus={selectedVariantStatus}
                    selectedPackage={selectedPackage}
                    packages={packages}
                    isWishlisted={isWishlisted}
                />
            </div>
        </div>
    )
}
