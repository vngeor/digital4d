"use client"

import { useState } from "react"
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
    locale: string
    mainImage: string | null
    gallery: string[]
    initialCouponCode?: string
    promotedCoupons?: PromotedCoupon[]
    isWishlisted?: boolean
    children: React.ReactNode // Category badges, brand, name, wishlist, status badge, price
}

export function ProductDetailClient({
    product,
    productName,
    variants,
    locale,
    mainImage,
    gallery,
    initialCouponCode,
    promotedCoupons,
    isWishlisted,
    children,
}: ProductDetailClientProps) {
    const firstAvailableVariant = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
    const defaultVariantIndex = variants.length > 0 ? (firstAvailableVariant >= 0 ? firstAvailableVariant : 0) : -1
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(defaultVariantIndex)

    const selectedVariantStatus = selectedVariantIndex >= 0
        ? variants[selectedVariantIndex]?.status || "in_stock"
        : undefined

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

                {/* Action Buttons */}
                <ProductActions
                    product={product}
                    initialCouponCode={initialCouponCode}
                    promotedCoupons={promotedCoupons}
                    selectedVariantStatus={selectedVariantStatus}
                    isWishlisted={isWishlisted}
                />
            </div>
        </div>
    )
}
