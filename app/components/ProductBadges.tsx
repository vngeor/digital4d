"use client"

import { Check, Ticket } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { computeDiscountPercent, computeHasBulkDiscount, computeIsNew } from "@/lib/badgeHelpers"

export interface CouponBadge {
  type: string
  value: string
  currency: string | null
}

// ─── ProductImageBadges ───────────────────────────────────────────────────────
// Absolute-positioned badge overlays on product card images.
// Renders four corners + optional center status overlay.
// All elements are pointer-events-none z-10.

interface ProductImageBadgesProps {
  isNew?: boolean
  featured?: boolean
  bestSeller?: boolean
  onSale?: boolean
  /** Pre-computed discount %; 0 = no sale discount */
  discountPercent?: number
  hasBulkDiscount?: boolean
  /** Drives center status overlay and pre_order pill */
  status?: string
  /** Show sold_out / out_of_stock / coming_soon overlay. Default: true */
  showStatusOverlay?: boolean
  /** Show subtle pre_order pill in top-right. Default: false */
  showPreOrderPill?: boolean
  coupon?: CouponBadge | null
  /** xs = UpsellCard (text-[8px]), sm = standard cards (text-[10px] sm:text-xs). Default: sm */
  size?: "xs" | "sm"
  /** Skip rendering top-right corner (use when caller places WishlistButton there) */
  hideTopRight?: boolean
}

export function ProductImageBadges({
  isNew,
  featured,
  bestSeller,
  onSale,
  discountPercent = 0,
  hasBulkDiscount,
  status,
  showStatusOverlay = true,
  showPreOrderPill = false,
  coupon,
  size = "sm",
  hideTopRight = false,
}: ProductImageBadgesProps) {
  const t = useTranslations("products")

  const pill = size === "xs"
    ? "text-[8px] px-1.5 py-0.5"
    : "text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1"
  const iconSize = size === "xs" ? "w-2 h-2" : "w-2.5 h-2.5 sm:w-3 sm:h-3"
  const starCircle = size === "xs" ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6"
  const starIcon = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5"

  const showCenter = showStatusOverlay &&
    (status === "sold_out" || status === "out_of_stock" || status === "coming_soon")
  const showTopLeft = isNew || featured
  const showTopRight = !hideTopRight && (discountPercent > 0 || hasBulkDiscount ||
    (showPreOrderPill && status === "pre_order"))

  return (
    <>
      {/* Center: status overlay */}
      {showCenter && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className={`px-3 py-1 -rotate-12 shadow-lg ${
            status === "sold_out" ? "bg-red-600/80"
            : status === "coming_soon" ? "bg-blue-600/80"
            : "bg-gray-600/80"
          }`}>
            <span className={`text-white font-bold tracking-wider uppercase ${size === "xs" ? "text-[8px]" : "text-[10px] sm:text-xs"}`}>
              {status === "sold_out" ? t("soldOut")
              : status === "coming_soon" ? t("comingSoon")
              : t("outOfStock")}
            </span>
          </div>
        </div>
      )}

      {/* Top-left: Featured (violet circle) + NEW (cyan pill) */}
      {showTopLeft && (
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10 pointer-events-none">
          {featured && (
            <div className={`${starCircle} bg-violet-500/90 rounded-full flex items-center justify-center shadow-lg`}>
              <svg className={`${starIcon} text-white`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          )}
          {isNew && (
            <span className={`${pill} rounded-md font-bold bg-cyan-500 text-white leading-none shadow-lg`}>
              {t("new")}
            </span>
          )}
        </div>
      )}

      {/* Top-right: discount % or "Sale" + optional pre_order pill */}
      {showTopRight && (
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 z-10 pointer-events-none">
          {(discountPercent > 0 || hasBulkDiscount) && (
            <span className={`${pill} rounded-md font-bold bg-red-500 text-white leading-none shadow-lg`}>
              {discountPercent > 0 ? `-${discountPercent}%` : t("onSale")}
            </span>
          )}
          {showPreOrderPill && status === "pre_order" && (
            <span className={`${pill} rounded-full font-medium bg-purple-500/20 text-purple-400 leading-none`}>
              {t("preOrder")}
            </span>
          )}
        </div>
      )}

      {/* Bottom-right: Best Seller */}
      {bestSeller && (
        <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
          <span className={`flex items-center gap-0.5 ${pill} rounded-md font-bold bg-amber-500 text-white leading-none shadow-lg`}>
            <Check className={iconSize} />
            {t("bestSeller")}
          </span>
        </div>
      )}

      {/* Bottom-left: Coupon */}
      {coupon && (
        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
          <span className={`flex items-center gap-0.5 ${pill} rounded-md font-bold bg-orange-500 text-white leading-none shadow-lg`}>
            <Ticket className={iconSize} />
            -{coupon.type === "percentage"
              ? `${coupon.value}%`
              : `${coupon.value} ${coupon.currency || "EUR"}`}
          </span>
        </div>
      )}
    </>
  )
}

// ─── ProductPanelBadges ───────────────────────────────────────────────────────
// Inline flex-row badges for product detail / quick-view right panels.
// Badges become <Link> elements when href props are provided (detail page).

interface ProductPanelBadgesProps {
  isNew?: boolean
  featured?: boolean
  bestSeller?: boolean
  onSale?: boolean
  hasBulkDiscount?: boolean
  /** Renders Sale badge as a styled link (product detail page) */
  saleHref?: string
  /** Renders Featured badge as a styled link (product detail page) */
  featuredHref?: string
  /** Renders Best Seller badge as a styled link (product detail page) */
  bestSellerHref?: string
}

export function ProductPanelBadges({
  isNew,
  featured,
  bestSeller,
  onSale,
  hasBulkDiscount,
  saleHref,
  featuredHref,
  bestSellerHref,
}: ProductPanelBadgesProps) {
  const t = useTranslations("products")
  const showSale = onSale || hasBulkDiscount

  if (!showSale && !isNew && !bestSeller && !featured) return null

  return (
    <div className="flex flex-wrap items-center gap-1 md:gap-2">
      {showSale && (saleHref ? (
        <Link href={saleHref}
          className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer">
          {t("onSale")}
        </Link>
      ) : (
        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-500 text-white shadow-lg">
          {t("onSale")}
        </span>
      ))}
      {isNew && (
        <span className="px-2 py-0.5 rounded-md text-xs font-black bg-cyan-500 text-white shadow-lg tracking-wider uppercase">
          {t("new")}
        </span>
      )}
      {bestSeller && (bestSellerHref ? (
        <Link href={bestSellerHref}
          className="flex items-center gap-0.5 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[10px] md:text-xs font-bold bg-amber-500 text-white shadow-lg hover:bg-amber-400 transition-colors cursor-pointer">
          <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />
          {t("bestSeller")}
        </Link>
      ) : (
        <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500 text-white shadow-lg">
          <Check className="w-3 h-3" />
          {t("bestSeller")}
        </span>
      ))}
      {featured && (featuredHref ? (
        <Link href={featuredHref}
          className="flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[10px] md:text-xs font-bold bg-violet-500/90 text-white shadow-lg hover:bg-violet-500 transition-colors cursor-pointer">
          ⭐ {t("featured")}
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-violet-500/90 text-white shadow-lg">
          ⭐ {t("featured")}
        </span>
      ))}
    </div>
  )
}
