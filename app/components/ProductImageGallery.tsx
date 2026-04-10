"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface Variant {
    image: string | null
    status: string
    colorId: string
    color: { nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null }
}

interface ProductImageGalleryProps {
    mainImage: string | null
    productName: string
    variants: Variant[]
    locale: string
    gallery?: string[]
    productStatus?: string
    onVariantChange?: (index: number) => void
    availableVariantIndices?: number[] | null
    packageVariantStatusMap?: Map<string, string> | null
    isNew?: boolean
    discountPercent?: number | null
    hasBulkDiscount?: boolean
    selectedVariantIndex?: number // parent-controlled: synced when package changes
}

const STATUS_OVERLAY_STYLE: Record<string, string> = {
    sold_out: "bg-red-600/80",
    out_of_stock: "bg-gray-600/80",
    coming_soon: "bg-blue-600/80",
}

const STATUS_OVERLAY_TEXT: Record<string, Record<string, string>> = {
    sold_out: { bg: "РАЗПРОДАДЕНО", en: "SOLD OUT", es: "AGOTADO" },
    out_of_stock: { bg: "ИЗЧЕРПАН", en: "OUT OF STOCK", es: "AGOTADO" },
    coming_soon: { bg: "ОЧАКВАЙТЕ СКОРО", en: "COMING SOON", es: "PRÓXIMAMENTE" },
}

export function ProductImageGallery({ mainImage, productName, variants, locale, gallery = [], productStatus, onVariantChange, availableVariantIndices, packageVariantStatusMap, isNew, discountPercent, hasBulkDiscount, selectedVariantIndex: controlledVariantIndex }: ProductImageGalleryProps) {
    const t = useTranslations("products")
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const firstAvailableVariant = variants.findIndex(v => ["in_stock", "pre_order"].includes(v.status))
    const defaultVariantIndex = variants.length > 0 ? (firstAvailableVariant >= 0 ? firstAvailableVariant : 0) : -1
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(defaultVariantIndex)
    const [showingVariant, setShowingVariant] = useState(
        defaultVariantIndex >= 0 && !!variants[defaultVariantIndex]?.image
    )

    // Sync internal selection when parent changes it (e.g., package switch auto-selects a color)
    useEffect(() => {
        if (controlledVariantIndex !== undefined && controlledVariantIndex !== selectedVariantIndex) {
            setSelectedVariantIndex(controlledVariantIndex)
            setShowingVariant(controlledVariantIndex >= 0 && !!variants[controlledVariantIndex]?.image)
        }
    }, [controlledVariantIndex]) // eslint-disable-line react-hooks/exhaustive-deps
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const swiped = useRef(false)

    const getColorName = (variant: Variant) => {
        switch (locale) {
            case "bg":
                return variant.color.nameBg
            case "es":
                return variant.color.nameEs
            default:
                return variant.color.nameEn
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "sold_out": return t("soldOut")
            case "out_of_stock": return t("outOfStock")
            default: return ""
        }
    }

    // Build array of all browsable images: main + gallery + variant images
    const allImages = [mainImage, ...gallery].filter(Boolean) as string[]
    const variantImages = variants.map(v => v.image).filter(Boolean) as string[]
    const allLightboxImages = [...allImages, ...variantImages.filter(img => !allImages.includes(img))]

    // Determine which image to display
    let currentImage: string | null
    if (showingVariant && variants[selectedVariantIndex]?.image) {
        currentImage = variants[selectedVariantIndex].image
    } else {
        currentImage = allImages[selectedImageIndex] || mainImage
    }

    // Determine overlay status: prefer per-package status, then global variant status, then product status
    const variantStatus = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.status : null
    const selectedVariantColorId = selectedVariantIndex >= 0 ? variants[selectedVariantIndex]?.colorId : null
    const effectiveVariantStatus = selectedVariantColorId
        ? (packageVariantStatusMap?.get(selectedVariantColorId) ?? variantStatus)
        : variantStatus
    const overlayStatus = (effectiveVariantStatus && STATUS_OVERLAY_STYLE[effectiveVariantStatus])
        ? effectiveVariantStatus
        : productStatus
    const overlayBg = overlayStatus ? STATUS_OVERLAY_STYLE[overlayStatus] : null
    const overlayText = overlayStatus ? STATUS_OVERLAY_TEXT[overlayStatus]?.[locale] || STATUS_OVERLAY_TEXT[overlayStatus]?.en : null

    const selectedColorName = selectedVariantIndex >= 0 ? getColorName(variants[selectedVariantIndex]) : null
    const showThumbnails = allImages.length > 1

    // Lightbox index tracks position in allLightboxImages
    const [lightboxIndex, setLightboxIndex] = useState(0)

    const openLightbox = () => {
        if (!currentImage) return
        const idx = allLightboxImages.indexOf(currentImage)
        setLightboxIndex(idx >= 0 ? idx : 0)
        setLightboxOpen(true)
    }

    const lightboxPrev = useCallback(() => {
        setLightboxIndex(prev => (prev - 1 + allLightboxImages.length) % allLightboxImages.length)
    }, [allLightboxImages.length])

    const lightboxNext = useCallback(() => {
        setLightboxIndex(prev => (prev + 1) % allLightboxImages.length)
    }, [allLightboxImages.length])

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (!lightboxOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false)
            if (e.key === "ArrowLeft") lightboxPrev()
            if (e.key === "ArrowRight") lightboxNext()
        }
        const scrollY = window.scrollY
        document.body.style.position = "fixed"
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = "100%"
        document.documentElement.style.overflow = "hidden"
        window.addEventListener("keydown", handleKey)
        return () => {
            document.body.style.position = ""
            document.body.style.top = ""
            document.body.style.width = ""
            document.documentElement.style.overflow = ""
            window.scrollTo(0, scrollY)
            window.removeEventListener("keydown", handleKey)
        }
    }, [lightboxOpen, lightboxPrev, lightboxNext])

    const handleThumbnailClick = (index: number) => {
        setSelectedImageIndex(index)
        setShowingVariant(false)
    }

    const handleVariantClick = (index: number) => {
        setSelectedVariantIndex(index)
        setShowingVariant(true)
        onVariantChange?.(index)
    }

    return (
        <>
            <div className="glass rounded-xl md:rounded-2xl border border-white/10 flex flex-col">
                {/* Image with status overlay */}
                <div className="overflow-hidden relative">
                    {currentImage ? (
                        <img
                            src={currentImage}
                            alt={showingVariant && selectedColorName ? `${productName} - ${selectedColorName}` : productName}
                            className="w-full object-contain min-h-[220px] sm:min-h-[300px] md:min-h-[400px] max-h-[500px] p-4 cursor-zoom-in"
                            onClick={openLightbox}
                        />
                    ) : (
                        <div className="min-h-[220px] sm:min-h-[300px] md:min-h-[400px] flex items-center justify-center bg-white/5">
                            <svg className="w-12 h-12 md:w-24 md:h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    )}
                    {/* Status overlay banner */}
                    {overlayBg && overlayText && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className={`${overlayBg} px-6 py-2 sm:px-8 sm:py-3 -rotate-12 shadow-lg`}>
                                <span className="text-white font-bold text-sm sm:text-lg tracking-wider">{overlayText}</span>
                            </div>
                        </div>
                    )}

                    {/* Top-left: NEW badge */}
                    {isNew && (
                        <div className="absolute top-3 left-3 pointer-events-none z-10">
                            <span className="px-4 py-2 rounded-lg text-base font-black bg-cyan-500 text-white shadow-xl tracking-widest uppercase">NEW</span>
                        </div>
                    )}

                    {/* Top-right: Discount badge */}
                    {discountPercent && discountPercent > 0 ? (
                        <div className="absolute top-3 right-3 pointer-events-none z-10">
                            <span className="-rotate-6 inline-block px-4 py-2 rounded-xl text-base font-black bg-red-500 text-white shadow-xl tracking-wide">
                                -{discountPercent}%
                            </span>
                        </div>
                    ) : hasBulkDiscount ? (
                        <div className="absolute top-3 right-3 pointer-events-none z-10">
                            <span className="-rotate-6 inline-block px-3 py-1.5 rounded-xl text-sm font-black bg-red-500 text-white shadow-xl tracking-wide">
                                {t("onSale")}
                            </span>
                        </div>
                    ) : null}

                </div>

                {/* Gallery Thumbnails — only when multiple images exist */}
                {showThumbnails && (
                    <div className="px-3 pt-3 md:px-4 md:pt-4 border-t border-white/10">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {allImages.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleThumbnailClick(index)}
                                    className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                        !showingVariant && selectedImageIndex === index
                                            ? "border-emerald-400 ring-2 ring-emerald-400/30"
                                            : "border-white/10 hover:border-white/30"
                                    }`}
                                >
                                    <img src={url} alt={`${productName} ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Color Selector — only actual variants */}
                {variants.length > 0 && (
                    <div className={`p-3 md:p-4 ${showThumbnails ? "" : "border-t border-white/10"}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                            {variants.map((variant, index) => {
                                const effectiveStatus = packageVariantStatusMap?.get(variant.colorId) ?? variant.status
                                const isUnavailable = effectiveStatus === "sold_out" || effectiveStatus === "out_of_stock"
                                const isHidden = availableVariantIndices !== null && availableVariantIndices !== undefined && !availableVariantIndices.includes(index)
                                if (isHidden) return null
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleVariantClick(index)}
                                        className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center relative ${
                                            selectedVariantIndex === index
                                                ? "border-emerald-400 ring-2 ring-emerald-400/30"
                                                : "border-white/20 hover:border-white/40"
                                        } ${isUnavailable ? "opacity-50" : ""}`}
                                        title={getColorName(variant)}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full"
                                            style={variant.color.hex2
                                                ? { background: `linear-gradient(135deg, ${variant.color.hex} 50%, ${variant.color.hex2} 50%)` }
                                                : { backgroundColor: variant.color.hex }}
                                        />
                                        {isUnavailable && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-8 h-0.5 bg-white/80 rotate-45 rounded-full" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        {showingVariant && selectedColorName && (() => {
                            const sel = variants[selectedVariantIndex]
                            const selEffective = sel ? (packageVariantStatusMap?.get(sel.colorId) ?? sel.status) : undefined
                            return (
                                <p className="text-xs text-slate-400 mt-2">
                                    {selectedColorName}
                                    {selEffective && selEffective !== "in_stock" && (
                                        <span className={`ml-2 ${
                                            selEffective === "sold_out" ? "text-red-400"
                                            : selEffective === "out_of_stock" ? "text-gray-400"
                                            : "text-slate-400"
                                        }`}>
                                            — {getStatusLabel(selEffective)}
                                        </span>
                                    )}
                                </p>
                            )
                        })()}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-[65] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
                    onClick={() => { if (!swiped.current) setLightboxOpen(false) }}
                    onTouchStart={(e) => {
                        touchStartX.current = e.touches[0].clientX
                        touchStartY.current = e.touches[0].clientY
                        swiped.current = false
                    }}
                    onTouchEnd={(e) => {
                        const dx = e.changedTouches[0].clientX - touchStartX.current
                        const dy = e.changedTouches[0].clientY - touchStartY.current
                        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                            swiped.current = true
                            if (dx < 0) lightboxNext()
                            else lightboxPrev()
                        } else {
                            swiped.current = false
                        }
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Prev arrow */}
                    {allLightboxImages.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
                            className="absolute left-3 sm:left-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={allLightboxImages[lightboxIndex]}
                        alt={productName}
                        className="max-w-full max-h-[85svh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next arrow */}
                    {allLightboxImages.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); lightboxNext() }}
                            className="absolute right-3 sm:right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Image counter */}
                    {allLightboxImages.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
                            {lightboxIndex + 1} / {allLightboxImages.length}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
