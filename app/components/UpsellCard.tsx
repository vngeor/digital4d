"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Check, ShoppingCart } from "lucide-react"
import { useTranslations } from "next-intl"
import { addToCart } from "@/lib/cart"

export interface UpsellProduct {
  id: string
  slug: string
  nameEn: string
  nameBg: string
  nameEs: string
  image: string | null
  price: string
  salePrice: string | null
  onSale: boolean
  currency: string
  priceType: string
  fileType: string
  status: string
  productUrl: string
  bestSeller?: boolean
  featured?: boolean
}

interface UpsellCardProps {
  product: UpsellProduct
  locale: string
  onClose: () => void
}

export function UpsellCard({ product: p, locale, onClose }: UpsellCardProps) {
  const t = useTranslations("cart")
  const [added, setAdded] = useState(false)
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (addedTimerRef.current) clearTimeout(addedTimerRef.current) }
  }, [])

  const name =
    locale === "bg"
      ? p.nameBg || p.nameEn
      : locale === "es"
      ? p.nameEs || p.nameEn
      : p.nameEn

  const effectivePrice =
    p.onSale && p.salePrice
      ? parseFloat(p.salePrice)
      : parseFloat(p.price || "0")

  const isUnavailable = ["sold_out", "coming_soon"].includes(p.status)

  const handleAdd = () => {
    if (p.priceType !== "fixed" || isUnavailable) return
    addToCart({
      productId: p.id,
      productSlug: p.slug,
      productUrl: p.productUrl,
      nameEn: p.nameEn,
      nameBg: p.nameBg,
      nameEs: p.nameEs,
      image: p.image || "",
      price: p.price,
      salePrice: p.salePrice,
      onSale: p.onSale,
      currency: p.currency,
      fileType: p.fileType,
      priceType: p.priceType,
      status: p.status,
    })
    window.dispatchEvent(new Event("cart-updated"))
    setAdded(true)
    addedTimerRef.current = setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col">
      {/* Image */}
      <Link
        href={p.productUrl}
        onClick={onClose}
        className="relative block aspect-square bg-white/5 rounded-t-xl overflow-hidden"
      >
        {p.image ? (
          <img
            src={p.image}
            alt={name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-slate-600" />
          </div>
        )}
        {/* Badges */}
        {(p.bestSeller || p.featured) && (
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {p.bestSeller && (
              <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/90 text-white leading-none">
                <Check className="w-2 h-2" />
                Best Seller
              </span>
            )}
            {p.featured && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-500/90 text-white leading-none">
                ⭐ Featured
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-2 flex flex-col gap-1 flex-1">
        <Link href={p.productUrl} onClick={onClose}>
          <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight hover:text-emerald-400 transition-colors">
            {name}
          </p>
        </Link>
        {/* Price */}
        <div className="mt-auto">
          {p.onSale && p.salePrice ? (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-red-400">
                {parseFloat(p.salePrice).toFixed(2)} {p.currency}
              </span>
              <span className="text-[10px] text-slate-500 line-through">
                {parseFloat(p.price).toFixed(2)}
              </span>
              {(() => {
                const orig = parseFloat(p.price)
                const pct = orig > 0 ? Math.round((1 - parseFloat(p.salePrice!) / orig) * 100) : 0
                return pct > 0 ? (
                  <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1 py-0.5 rounded">
                    -{pct}%
                  </span>
                ) : null
              })()}
            </div>
          ) : (
            <span className="text-[11px] font-bold text-white">
              {effectivePrice.toFixed(2)} {p.currency}
            </span>
          )}
        </div>
        {p.priceType === "fixed" && (
          <button
            onClick={handleAdd}
            disabled={isUnavailable}
            className={`w-full py-1.5 rounded-lg text-[10px] font-semibold transition-all touch-manipulation flex items-center justify-center gap-1 ${
              added
                ? "bg-emerald-500 text-white scale-95"
                : isUnavailable
                ? "bg-white/5 text-slate-600 cursor-not-allowed"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {added ? (
              <>
                <Check className="w-3 h-3" />
                {t("addedToCart")}
              </>
            ) : (
              `+ ${t("addToCart")}`
            )}
          </button>
        )}
      </div>
    </div>
  )
}
