"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ShoppingCart, MessageSquare, Loader2, Ticket, X, Check, Clock, Minus, Plus, Bell } from "lucide-react"
import { QuoteForm } from "./QuoteForm"
import { addToCart } from "@/lib/cart"
import { BulkTier, getActiveTier, applyBulkDiscount, formatTierBadge, parseTiers } from "@/lib/bulkDiscount"

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
    brand?: { slug: string; nameEn: string; nameBg: string; nameEs: string } | null
    bulkDiscountTiers?: string | null
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

interface SelectedPackage {
    id: string
    price: string
    salePrice: string | null
    status: string
    sku: string | null
    weightId: string
    weight: { label: string }
}

interface ProductActionsProps {
    product: Product
    initialCouponCode?: string
    promotedCoupons?: PromotedCoupon[]
    selectedVariantStatus?: string
    selectedVariantId?: string
    selectedVariantImage?: string | null
    selectedVariantColor?: { nameEn: string; nameBg: string; nameEs: string; hex: string } | null
    selectedPackage?: SelectedPackage | null
    packages?: { id: string }[]
    isWishlisted?: boolean
}

export function ProductActions({ product, initialCouponCode, promotedCoupons, selectedVariantStatus, selectedVariantId, selectedVariantImage, selectedVariantColor, selectedPackage, packages, isWishlisted = false }: ProductActionsProps) {
    const t = useTranslations("products")
    const tc = useTranslations("cart")
    const { data: session, status } = useSession()
    const [loading, setLoading] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [notifySubscribed, setNotifySubscribed] = useState(isWishlisted)
    const [bulkTiers, setBulkTiers] = useState<BulkTier[]>([])
    const [bulkEnabled, setBulkEnabled] = useState(false)
    const [showQuoteForm, setShowQuoteForm] = useState(false)
    const [showContactForm, setShowContactForm] = useState(false)
    const [couponCode, setCouponCode] = useState("")
    const [couponLoading, setCouponLoading] = useState(false)
    const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null)
    const [couponError, setCouponError] = useState("")
    // Live countdown timer for promoted coupons, pause when tab hidden
    const [countdownKey, setCountdownKey] = useState(0)
    useEffect(() => {
        if (!promotedCoupons?.some(c => c.expiresAt)) return
        let interval: ReturnType<typeof setInterval> | null = null
        const start = () => { if (!interval) interval = setInterval(() => setCountdownKey(k => k + 1), 1000) }
        const stop = () => { if (interval) { clearInterval(interval); interval = null } }
        const onVisibility = () => { document.hidden ? stop() : start() }
        start()
        document.addEventListener("visibilitychange", onVisibility)
        return () => { stop(); document.removeEventListener("visibilitychange", onVisibility) }
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
                                <span className="font-mono font-bold text-sm sm:tracking-wider whitespace-nowrap text-orange-200 truncate">
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

    // Fetch bulk discount settings once on mount
    // Product-level tiers (non-empty) override global tiers
    useEffect(() => {
        const productTiers = parseTiers(product.bulkDiscountTiers || "")
        if (productTiers.length > 0) {
            setBulkEnabled(true)
            setBulkTiers(productTiers)
            return
        }
        fetch("/api/settings")
            .then(r => r.json())
            .then(data => {
                if (data.bulkDiscountEnabled) {
                    setBulkEnabled(true)
                    setBulkTiers(parseTiers(data.bulkDiscountTiers))
                }
            })
            .catch(() => {})
    }, [product.bulkDiscountTiers])

    // Compute active bulk tier and discounted price
    const activeBulkTier = useMemo(() =>
        bulkEnabled ? getActiveTier(quantity, bulkTiers) : null,
        [quantity, bulkTiers, bulkEnabled]
    )

    const effectiveUnitPrice = useMemo(() => {
        if (selectedPackage) return parseFloat((selectedPackage.salePrice ?? selectedPackage.price).toString())
        return parseFloat(((product.onSale && product.salePrice) ? product.salePrice : (product.price ?? "0")).toString())
    }, [selectedPackage, product])

    const bulkFinalPrice = useMemo(() =>
        activeBulkTier ? applyBulkDiscount(effectiveUnitPrice, activeBulkTier) : null,
        [activeBulkTier, effectiveUnitPrice]
    )

    const quantitySelector = (
        <div className="space-y-1.5">
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 whitespace-nowrap">{t("quantity")}</span>
                <div className="flex items-center gap-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-white font-medium tabular-nums">{quantity}</span>
                    <button
                        type="button"
                        onClick={() => setQuantity(q => Math.min(99, q + 1))}
                        disabled={quantity >= 99}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {activeBulkTier && (
                <div className="flex items-center gap-2 pl-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        {formatTierBadge(activeBulkTier, product.currency)}
                    </span>
                    <span className="text-xs text-slate-400">
                        = {(bulkFinalPrice! * quantity).toFixed(2)} {product.currency} total
                    </span>
                </div>
            )}
        </div>
    )

    const handleBuyNow = async () => {
        if (status === "loading") return  // Wait until session resolves
        if (!session) {
            const callbackUrl = encodeURIComponent(window.location.pathname)
            window.location.href = `/login?callbackUrl=${callbackUrl}`
            return
        }
        setLoading(true)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    quantity,
                    ...(appliedCoupon ? { couponCode: appliedCoupon.couponCode } : {}),
                    packageId: selectedPackage?.id ?? null,
                    variantId: selectedVariantId ?? null,
                    ...(bulkFinalPrice !== null ? { bulkDiscountedUnitPrice: bulkFinalPrice } : {}),
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

    const packageOk = !packages?.length || (selectedPackage !== null && selectedPackage !== undefined
        && ["in_stock", "pre_order"].includes(selectedPackage.status))

    const handleAddToCart = () => {
        // Use package price when a package is selected; fall back to product price
        const effectivePrice = selectedPackage ? selectedPackage.price : (product.price || "0")
        const effectiveSalePrice = selectedPackage ? (selectedPackage.salePrice || null) : (product.salePrice || null)
        const effectiveOnSale = selectedPackage ? !!selectedPackage.salePrice : (product.onSale || false)
        // Use selected variant image if available, else product main image
        const effectiveImage = selectedVariantImage || (product as unknown as { image?: string }).image || ""
        // Apply bulk discount to cart item pricing
        const cartUnitPrice = bulkFinalPrice !== null ? bulkFinalPrice.toFixed(2) : null

        addToCart({
            productId: product.id,
            packageId: selectedPackage?.id ?? null,
            packageLabel: selectedPackage?.weight?.label ?? null,
            colorNameEn: selectedVariantColor?.nameEn ?? null,
            colorNameBg: selectedVariantColor?.nameBg ?? null,
            colorNameEs: selectedVariantColor?.nameEs ?? null,
            colorHex: selectedVariantColor?.hex ?? null,
            brandNameEn: product.brand?.nameEn ?? null,
            brandNameBg: product.brand?.nameBg ?? null,
            brandNameEs: product.brand?.nameEs ?? null,
            productSlug: product.slug,
            productUrl: window.location.pathname,
            nameEn: product.nameEn,
            nameBg: product.nameBg,
            nameEs: product.nameEs,
            image: effectiveImage,
            price: cartUnitPrice ?? effectivePrice,
            salePrice: cartUnitPrice !== null ? cartUnitPrice : (effectiveSalePrice ?? null),
            onSale: cartUnitPrice !== null ? true : effectiveOnSale,
            currency: product.currency || "EUR",
            fileType: product.fileType || "physical",
            priceType: product.priceType,
            status: product.status,
        }, quantity)
        window.dispatchEvent(new Event("cart-updated"))
        window.dispatchEvent(new Event("open-cart-upsell"))
    }

    const canPurchase = ["in_stock", "pre_order"].includes(product.status)
        && (selectedVariantStatus === undefined || ["in_stock", "pre_order"].includes(selectedVariantStatus))
        && packageOk

    const handleNotifyMe = async () => {
        if (!session) {
            const callbackUrl = encodeURIComponent(window.location.pathname)
            window.location.href = `/login?callbackUrl=${callbackUrl}`
            return
        }
        try {
            setLoading(true)
            const res = await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id }),
            })
            if (res.ok) {
                setNotifySubscribed(true)
                toast.success(t("notifyMeSuccess"))
            }
        } catch {
            toast.error(t("notifyMeError"))
        } finally {
            setLoading(false)
        }
    }

    const notifyMeButton = (
        <button
            onClick={handleNotifyMe}
            disabled={loading || notifySubscribed}
            className={`w-full flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium transition-all touch-manipulation ${
                notifySubscribed
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50"
            }`}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : notifySubscribed ? (
                <Check className="w-5 h-5" />
            ) : (
                <Bell className="w-5 h-5" />
            )}
            {notifySubscribed ? t("notifyMeSubscribed") : t("notifyMe")}
        </button>
    )

    const isService = product.fileType === "service"
    const isDigital = product.fileType === "digital"
    const isCartEligible = product.priceType === "fixed" && !isService

    // Coupon discount banner for quote/non-digital products
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
                    <span className="font-mono font-bold text-amber-300 text-sm sm:tracking-wider whitespace-nowrap truncate">{initialCouponCode.toUpperCase()}</span>
                    <span className="text-[11px] text-amber-400/60">— {t("couponMentionInQuote")}</span>
                </div>
            </div>
        </div>
    ) : null

    // Cart-eligible products (fixed price, not service) — digital and physical
    if (isCartEligible) {
        return (
            <>
            <div className="space-y-3">
                {/* Promoted Coupon Banners */}
                {promotedBanners}

                {/* Coupon Section — only for digital in v1 */}
                {isDigital && (!appliedCoupon ? (
                    <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Ticket className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-sm text-slate-300 font-medium">{t("haveACoupon")}</span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError("") }}
                                placeholder={t("enterCouponCode")}
                                className="flex-1 min-w-0 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 uppercase sm:tracking-wider font-mono"
                                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={couponLoading || !couponCode.trim()}
                                className="px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("applyCoupon")}
                            </button>
                        </div>
                        {couponError && (
                            <p className="text-xs text-red-400">{couponError}</p>
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
                            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-red-400 transition-colors touch-manipulation shrink-0"
                            title={t("removeCoupon")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {/* Discount Preview */}
                {isDigital && appliedCoupon && (
                    <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-slate-400 line-through">
                            {appliedCoupon.original} {appliedCoupon.productCurrency}
                        </span>
                        <span className="text-red-400 font-bold text-lg">
                            {appliedCoupon.final} {appliedCoupon.productCurrency}
                        </span>
                    </div>
                )}

                {canPurchase && quantitySelector}

                {canPurchase ? (
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 py-3 rounded-xl border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors font-semibold flex items-center justify-center gap-2 touch-manipulation"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {tc("addToCart")}
                        </button>
                        <button
                            onClick={handleBuyNow}
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 touch-manipulation"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {tc("buyNow")}
                        </button>
                    </div>
                ) : notifyMeButton}
            </div>
            </>
        )
    }

    // Service - Get Quote button
    if (isService) {
        return (
            <div className="space-y-3">
                {promotedBanners}
                {couponBanner}
                {quantitySelector}
                <button
                    onClick={() => setShowQuoteForm(true)}
                    className="w-full flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                >
                    <MessageSquare className="w-5 h-5" />
                    {t("getQuote")}
                </button>

                {showQuoteForm && (
                    <QuoteForm
                        productId={product.id}
                        productName={product.nameEn}
                        quantity={quantity > 1 ? quantity : undefined}
                        onClose={() => setShowQuoteForm(false)}
                    />
                )}
            </div>
        )
    }

    // Non-fixed price physical product (priceType="quote" or "from") - Get Quote
    return (
        <div className="space-y-3">
            {promotedBanners}
            {couponBanner}
            {canPurchase && quantitySelector}
            {canPurchase ? (
                <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                >
                    <MessageSquare className="w-5 h-5" />
                    {t("getQuote")}
                </button>
            ) : notifyMeButton}

            {showContactForm && (
                <QuoteForm
                    productId={product.id}
                    productName={product.nameEn}
                    quantity={quantity > 1 ? quantity : undefined}
                    onClose={() => setShowContactForm(false)}
                    isOrderInquiry
                />
            )}
        </div>
    )
}
