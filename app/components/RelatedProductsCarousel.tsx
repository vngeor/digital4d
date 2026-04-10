"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProductImageBadges } from "./ProductBadges"
import { computeDiscountPercent, computeHasBulkDiscount } from "@/lib/badgeHelpers"

export interface RelatedCard {
  id: string
  name: string
  brandName: string | null
  desc: string | null
  image: string | null
  price: string | null
  salePrice: string | null
  onSale: boolean
  currency: string
  priceType: string
  fileType: string | null
  status: string
  featured: boolean
  bestSeller: boolean
  isNew: boolean
  url: string
  coupon: { type: string; value: string; currency: string | null } | null
  bulkDiscountTiers?: string | null
}

export function RelatedProductsCarousel({ cards }: { cards: RelatedCard[] }) {
  const t = useTranslations("products")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [updateArrows])

  const handleScrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const card = el.children[0] as HTMLElement
    if (!card) return
    const amount = card.offsetWidth + 12
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  if (cards.length === 0) return null

  return (
    <div className="mt-8 md:mt-16">
      <h2 className="text-lg md:text-2xl font-bold text-white mb-4 md:mb-6">
        {t("relatedProducts")}
      </h2>
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => handleScrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full glass flex items-center justify-center shadow-lg hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => handleScrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full glass flex items-center justify-center shadow-lg hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        >
          {cards.map(card => {
            const discountPercent =
              card.onSale && card.price && card.salePrice
                ? Math.round((1 - parseFloat(card.salePrice) / parseFloat(card.price)) * 100)
                : 0
            const displayPrice = card.price
              ? `${parseFloat(card.price).toFixed(2)} ${card.currency}`
              : "-"

            return (
              <Link
                key={card.id}
                href={card.url}
                className="snap-start shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] group glass rounded-xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col"
              >
                <div className="relative h-28 md:h-40 overflow-hidden bg-white/5">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}

                  <ProductImageBadges
                    size="sm"
                    isNew={card.isNew}
                    featured={card.featured}
                    bestSeller={card.bestSeller}
                    onSale={card.onSale}
                    discountPercent={computeDiscountPercent(card.price, card.salePrice)}
                    hasBulkDiscount={computeHasBulkDiscount(card.bulkDiscountTiers)}
                    status={card.status}
                    showStatusOverlay
                    coupon={card.coupon ?? null}
                  />
                </div>

                {/* Card body */}
                <div className="p-2 md:p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-xs md:text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[2rem] md:min-h-[3rem]">
                    {card.name}
                  </h3>
                  {card.brandName && (
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium">{card.brandName}</p>
                  )}
                  {card.desc && (() => {
                    const text = card.desc
                      .replace(/<[^>]*>/g, "")
                      .replace(/&amp;/g, "&")
                      .replace(/&nbsp;/g, " ")
                      .replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .trim()
                    return text ? (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {text.length > 100 ? text.substring(0, 100) + "..." : text}
                      </p>
                    ) : null
                  })()}

                  <div className="mt-auto pt-1 md:pt-2">
                    {/* Price */}
                    <div className="mb-1 md:mb-2">
                      {card.priceType === "quote" ? (
                        <span className="text-[10px] md:text-sm text-amber-400 font-medium">{t("requestQuote")}</span>
                      ) : card.onSale && card.salePrice ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                          <span className="text-xs md:text-base font-bold text-red-400">
                            {parseFloat(card.salePrice).toFixed(2)} {card.currency}
                          </span>
                          <span className="text-[10px] md:text-xs text-gray-500 line-through">{displayPrice}</span>
                        </div>
                      ) : (
                        <span className="text-xs md:text-base font-bold text-white">{displayPrice}</span>
                      )}
                    </div>

                    {/* CTA button */}
                    {!["in_stock", "pre_order"].includes(card.status) ? (
                      <span className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 text-xs font-medium">
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {t("notifyMeShort")}
                      </span>
                    ) : card.priceType === "fixed" && card.fileType !== "service" ? (
                      <span className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {t("buyNow")}
                      </span>
                    ) : (
                      <span className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {t("getQuote")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
