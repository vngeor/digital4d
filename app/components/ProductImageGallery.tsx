"use client"

import { useState } from "react"

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
}

export function ProductImageGallery({ mainImage, productName, variants, locale }: ProductImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)

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

    // Show variant image if selected and has one, otherwise fall back to main image
    const currentImage = variants.length > 0 && variants[selectedIndex]?.image
        ? variants[selectedIndex].image
        : mainImage

    const selectedColorName = variants.length > 0 ? getColorName(variants[selectedIndex]) : null

    return (
        <div className="glass rounded-xl md:rounded-2xl border border-white/10 flex flex-col">
            {/* Image */}
            <div className="overflow-hidden">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt={selectedColorName ? `${productName} - ${selectedColorName}` : productName}
                        className="w-full object-contain min-h-[220px] sm:min-h-[300px] md:min-h-[400px] max-h-[500px] p-4"
                    />
                ) : (
                    <div className="min-h-[220px] sm:min-h-[300px] md:min-h-[400px] flex items-center justify-center bg-white/5">
                        <svg className="w-12 h-12 md:w-24 md:h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Color Selector — only actual variants, no extra default circle */}
            {variants.length > 0 && (
                <div className="p-3 md:p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                        {variants.map((variant, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedIndex(index)}
                                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                                    selectedIndex === index
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
                    {selectedColorName && (
                        <p className="text-xs text-slate-400 mt-2">{selectedColorName}</p>
                    )}
                </div>
            )}
        </div>
    )
}
