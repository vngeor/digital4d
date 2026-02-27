"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ShoppingCart, MessageSquare, Send, Loader2, Ticket, X, Check, Clock } from "lucide-react"
import { QuoteForm } from "./QuoteForm"

interface Product {
    id: string
    slug: string
    nameEn: string
    price: string | null
    salePrice?: string | null
    onSale?: boolean
    currency?: string
    fileType: string | null
    inStock: boolean
}

interface CouponDiscount {
    couponId: string
    couponCode: string
    original: string
    discountAmount: string
    final: string
    productCurrency: string
    type: string
    value: string
}

interface PromotedCoupon {
    code: string
    type: string
    value: string
    currency: string | null
    expiresAt: string | null
}

interface ProductActionsProps {
    product: Product
    initialCouponCode?: string
    promotedCoupons?: PromotedCoupon[]
}

export function ProductActions({ product, initialCouponCode, promotedCoupons }: ProductActionsProps) {
    const t = useTranslations("products")
    const [loading, setLoading] = useState(false)
    const [showQuoteForm, setShowQuoteForm] = useState(false)
    const [showContactForm, setShowContactForm] = useState(false)
    const [showCouponInput, setShowCouponInput] = useState(false)
    const [couponCode, setCouponCode] = useState("")
    const [couponLoading, setCouponLoading] = useState(false)
    const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null)
    const [couponError, setCouponError] = useState("")

    // Live countdown timer for promoted coupons
    const [countdownKey, setCountdownKey] = useState(0)
    useEffect(() => {
        if (!promotedCoupons?.some(c => c.expiresAt)) return
        const interval = setInterval(() => setCountdownKey(k => k + 1), 1000)
        return () => clearInterval(interval)
    }, [promotedCoupons])

    // Helper: format live countdown from expiresAt
    const getCountdownText = (expiresAt: string | null): string | null => {
        void countdownKey // trigger re-render
        if (!expiresAt) return null
        const now = new Date()
        const expiry = new Date(expiresAt)
        const diffMs = expiry.getTime() - now.getTime()
        if (diffMs <= 0) return null

        const totalSeconds = Math.floor(diffMs / 1000)
        const days = Math.floor(totalSeconds / 86400)
        const hours = Math.floor((totalSeconds % 86400) / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const pad = (n: number) => String(n).padStart(2, "0")

        // > 1 day: "2d 5h 30m"
        if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`
        // < 1 day but > 1 hour: "05:30:12"
        if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        // < 1 hour: "30:12"
        return `${pad(minutes)}:${pad(seconds)}`
    }

    // Helper: get discount label for promoted coupons
    const getDiscountLabel = (coupon: PromotedCoupon): string => {
        if (coupon.type === "percentage") return `${coupon.value}%`
        return `${coupon.value} ${coupon.currency || "EUR"}`
    }

    // Handle clicking a promoted coupon banner
    const handlePromotedCouponClick = (code: string) => {
        setCouponCode(code)
        setShowCouponInput(true)
        setCouponError("")
        // Auto-apply after setting state
        setTimeout(() => {
            const applyPromoted = async () => {
                setCouponLoading(true)
                try {
                    const res = await fetch("/api/coupons/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code, productId: product.id }),
                    })
                    const data = await res.json()
                    if (data.valid) {
                        setAppliedCoupon({
                            couponId: data.coupon.id,
                            couponCode: data.coupon.code,
                            original: data.discount.original,
                            discountAmount: data.discount.discountAmount,
                            final: data.discount.final,
                            productCurrency: data.discount.productCurrency,
                            type: data.coupon.type,
                            value: data.coupon.value,
                        })
                        toast.success(t("couponApplied"))
                    } else {
                        setCouponError(t("invalidCoupon"))
                    }
                } catch {
                    setCouponError(t("invalidCoupon"))
                } finally {
                    setCouponLoading(false)
                }
            }
            applyPromoted()
        }, 0)
    }

    // Promoted coupon banners (shown when admin enables showOnProduct)
    const promotedBanners = promotedCoupons && promotedCoupons.length > 0 && !appliedCoupon ? (
        <div className="space-y-2">
            {promotedCoupons.map((coupon) => {
                const expiryText = getCountdownText(coupon.expiresAt)
                const isDigital = product.fileType === "digital"
                return (
                    <button
                        key={coupon.code}
                        onClick={() => isDigital ? handlePromotedCouponClick(coupon.code) : undefined}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                            isDigital
                                ? "bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-orange-500/30 hover:from-orange-500/25 hover:to-amber-500/25 hover:border-orange-500/50 cursor-pointer"
                                : "bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-orange-500/30 cursor-default"
                        }`}
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center shrink-0">
                            <Ticket className="w-5 h-5 text-orange-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm sm:tracking-wider whitespace-nowrap text-orange-200">
                                    {coupon.code}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/25 text-orange-300 font-semibold">
                                    -{getDiscountLabel(coupon)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {isDigital ? (
                                    <span className="text-[11px] text-orange-400/70">{t("clickToApply")}</span>
                                ) : (
                                    <span className="text-[11px] text-orange-400/70">{t("couponMentionInQuote")}</span>
                                )}
                                {expiryText && (
                                    <span className="text-sm text-red-400 flex items-center gap-1 font-mono font-bold animate-sale-blink">
                                        <Clock className="w-4 h-4" />
                                        {expiryText}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                )
            })}
        </div>
    ) : null

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return
        setCouponLoading(true)
        setCouponError("")

        try {
            const res = await fetch("/api/coupons/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: couponCode.trim(),
                    productId: product.id,
                }),
            })

            const data = await res.json()

            if (data.valid) {
                setAppliedCoupon({
                    couponId: data.coupon.id,
                    couponCode: data.coupon.code,
                    original: data.discount.original,
                    discountAmount: data.discount.discountAmount,
                    final: data.discount.final,
                    productCurrency: data.discount.productCurrency,
                    type: data.coupon.type,
                    value: data.coupon.value,
                })
                toast.success(t("couponApplied"))
            } else {
                const errorMessages: Record<string, string> = {
                    NOT_FOUND: t("invalidCoupon"),
                    INACTIVE: t("invalidCoupon"),
                    EXPIRED: t("couponExpired"),
                    NOT_STARTED: t("invalidCoupon"),
                    MAX_USES: t("couponMaxUses"),
                    USER_LIMIT: t("couponMaxUses"),
                    WRONG_PRODUCT: t("couponWrongProduct"),
                    NOT_ON_SALE: t("couponNotOnSale"),
                    MIN_PURCHASE: t("couponMinPurchase"),
                    CURRENCY_MISMATCH: t("invalidCoupon"),
                }
                setCouponError(errorMessages[data.error] || t("invalidCoupon"))
            }
        } catch {
            setCouponError(t("invalidCoupon"))
        } finally {
            setCouponLoading(false)
        }
    }

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null)
        setCouponCode("")
        setCouponError("")
    }

    // Auto-apply coupon code from URL param (e.g., from quote notification)
    const autoApplied = useRef(false)
    useEffect(() => {
        if (initialCouponCode && !autoApplied.current && product.fileType === "digital") {
            autoApplied.current = true
            setCouponCode(initialCouponCode.toUpperCase())
            setShowCouponInput(true)
            // Auto-validate the coupon
            const autoValidate = async () => {
                setCouponLoading(true)
                try {
                    const res = await fetch("/api/coupons/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            code: initialCouponCode.trim(),
                            productId: product.id,
                        }),
                    })
                    const data = await res.json()
                    if (data.valid) {
                        setAppliedCoupon({
                            couponId: data.coupon.id,
                            couponCode: data.coupon.code,
                            original: data.discount.original,
                            discountAmount: data.discount.discountAmount,
                            final: data.discount.final,
                            productCurrency: data.discount.productCurrency,
                            type: data.coupon.type,
                            value: data.coupon.value,
                        })
                        toast.success(t("couponApplied"))
                    } else {
                        setCouponError(t("invalidCoupon"))
                    }
                } catch {
                    setCouponError(t("invalidCoupon"))
                } finally {
                    setCouponLoading(false)
                }
            }
            autoValidate()
        }
    }, [initialCouponCode, product.id, product.fileType, t])

    const handleBuyNow = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    ...(appliedCoupon ? { couponCode: appliedCoupon.couponCode } : {}),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || t("checkoutFailed"))
                return
            }

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url
            }
        } catch (error) {
            console.error("Checkout error:", error)
            toast.error(t("checkoutError"))
        } finally {
            setLoading(false)
        }
    }

    // Digital product - Buy Now button with coupon support
    if (product.fileType === "digital") {
        return (
            <div className="space-y-3">
                {/* Promoted Coupon Banners */}
                {promotedBanners}

                {/* Coupon Section */}
                {!appliedCoupon ? (
                    <div>
                        {!showCouponInput ? (
                            <button
                                onClick={() => setShowCouponInput(true)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                <Ticket className="w-4 h-4" />
                                {t("haveACoupon")}
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError("") }}
                                        placeholder={t("enterCouponCode")}
                                        className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 uppercase sm:tracking-wider font-mono"
                                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading || !couponCode.trim()}
                                        className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("applyCoupon")}
                                    </button>
                                    <button
                                        onClick={() => { setShowCouponInput(false); setCouponCode(""); setCouponError("") }}
                                        className="p-2 min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation flex items-center justify-center"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {couponError && (
                                    <p className="text-xs text-red-400">{couponError}</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 min-w-0">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-sm text-emerald-400 font-medium font-mono truncate">{appliedCoupon.couponCode}</span>
                            <span className="text-xs text-emerald-400/70">
                                ({appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : `-${appliedCoupon.discountAmount} ${appliedCoupon.productCurrency}`})
                            </span>
                        </div>
                        <button
                            onClick={handleRemoveCoupon}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                            title={t("removeCoupon")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Discount Preview */}
                {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-slate-400 line-through">
                            {appliedCoupon.original} {appliedCoupon.productCurrency}
                        </span>
                        <span className="text-emerald-400 font-bold text-lg">
                            {appliedCoupon.final} {appliedCoupon.productCurrency}
                        </span>
                    </div>
                )}

                {/* Buy Now Button */}
                <button
                    onClick={handleBuyNow}
                    disabled={loading || !product.inStock}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ShoppingCart className="w-5 h-5" />
                    )}
                    {t("buyNow")}
                </button>
            </div>
        )
    }

    // Coupon discount banner for non-digital products
    const couponBanner = initialCouponCode ? (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-300 font-medium">
                    {t("couponDiscountAvailable")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-amber-300 text-sm sm:tracking-wider whitespace-nowrap">{initialCouponCode.toUpperCase()}</span>
                    <span className="text-[11px] text-amber-400/60">— {t("couponMentionInQuote")}</span>
                </div>
            </div>
        </div>
    ) : null

    // Service - Get Quote button
    if (product.fileType === "service") {
        return (
            <div className="space-y-3">
                {promotedBanners}
                {couponBanner}
                <button
                    onClick={() => setShowQuoteForm(true)}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                >
                    <MessageSquare className="w-5 h-5" />
                    {t("getQuote")}
                </button>

                {showQuoteForm && (
                    <QuoteForm
                        productId={product.id}
                        productName={product.nameEn}
                        onClose={() => setShowQuoteForm(false)}
                    />
                )}
            </div>
        )
    }

    // Physical product - Order Now button (opens contact/inquiry form)
    return (
        <div className="space-y-3">
            {promotedBanners}
            {couponBanner}
            <button
                onClick={() => setShowContactForm(true)}
                disabled={!product.inStock}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send className="w-5 h-5" />
                {t("orderNow")}
            </button>

            {showContactForm && (
                <QuoteForm
                    productId={product.id}
                    productName={product.nameEn}
                    onClose={() => setShowContactForm(false)}
                    isOrderInquiry
                />
            )}
        </div>
    )
}
