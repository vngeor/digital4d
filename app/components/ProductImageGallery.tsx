"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface Variant {
    colorNameBg: string
    colorNameEn: string
    colorNameEs: string
    colorHex: string
    image: string | null
}

interface ProductImageGalleryProps {
    mainImage: string | null
    productName: string
    variants: Variant[]
    locale: string
    gallery?: string[]
}

export function ProductImageGallery({ mainImage, productName, variants, locale, gallery = [] }: ProductImageGalleryProps) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(variants.length > 0 ? 0 : -1)
    const [showingVariant, setShowingVariant] = useState(false)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const swiped = useRef(false)

    const getColorName = (variant: Variant) => {
        switch (locale) {
            case "bg":
                return variant.colorNameBg
            case "es":
                return variant.colorNameEs
            default:
                return variant.colorNameEn
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
        document.body.style.overflow = "hidden"
        window.addEventListener("keydown", handleKey)
        return () => {
            document.body.style.overflow = ""
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
    }

    return (
        <>
            <div className="glass rounded-xl md:rounded-2xl border border-white/10 flex flex-col">
                {/* Image */}
                <div className="overflow-hidden">
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
                            {variants.map((variant, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleVariantClick(index)}
                                    className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                                        selectedVariantIndex === index
                                            ? "border-emerald-400 ring-2 ring-emerald-400/30"
                                            : "border-white/20 hover:border-white/40"
                                    }`}
                                    title={getColorName(variant)}
                                >
                                    <div
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: variant.colorHex }}
                                    />
                                </button>
                            ))}
                        </div>
                        {showingVariant && selectedColorName && (
                            <p className="text-xs text-slate-400 mt-2">{selectedColorName}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden touch-none"
                    onClick={() => { if (!swiped.current) setLightboxOpen(false) }}
                    onTouchStart={(e) => {
                        touchStartX.current = e.touches[0].clientX
                        touchStartY.current = e.touches[0].clientY
                        swiped.current = false
                    }}
                    onTouchEnd={(e) => {
                        const dx = e.changedTouches[0].clientX - touchStartX.current
                        const dy = e.changedTouches[0].clientY - touchStartY.current
                        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                            swiped.current = true
                            if (dx < 0) lightboxNext()
                            else lightboxPrev()
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
                        className="max-w-full max-h-[85vh] object-contain"
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
