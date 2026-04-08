"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { X, ShoppingCart, Trash2, Minus, Plus, Loader2 } from "lucide-react"
import { getCart, addToCart, removeFromCart, updateQuantity, clearCart, getEffectivePrice, cartItemKey, CART_KEY, fetchServerCart, mergeServerCartIntoLocal, syncCartToServer, syncCartItemToServer, deleteCartItemFromServer, type CartItem } from "@/lib/cart"
import { parseTiers, getActiveTier, applyBulkDiscount, type BulkTier } from "@/lib/bulkDiscount"
import { UpsellCard, type UpsellProduct } from "./UpsellCard"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  locale: string
}

export function CartDrawer({ open, onClose, locale }: CartDrawerProps) {
  const t = useTranslations("cart")
  const { data: session, status } = useSession()
  const prevStatusRef = useRef(status)
  const [items, setItems] = useState<CartItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"cart" | "upsell">("cart")
  const [upsellEnabled, setUpsellEnabled] = useState(true)
  const [upsellOpenOnAdd, setUpsellOpenOnAdd] = useState("upsell")

  interface ShippingSettings {
    freeShippingEnabled: boolean
    freeShippingThreshold: number | null
    freeShippingCurrency: string
  }
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((data) => {
        setShippingSettings({
          freeShippingEnabled: data.freeShippingEnabled,
          freeShippingThreshold: data.freeShippingThreshold,
          freeShippingCurrency: data.freeShippingCurrency,
        })
        setUpsellEnabled(data.upsellTabEnabled ?? true)
        setUpsellOpenOnAdd(data.upsellOpenOnAdd ?? "upsell")
        if (data.bulkDiscountEnabled) {
          setBulkEnabled(true)
          setGlobalBulkTiers(parseTiers(data.bulkDiscountTiers ?? "[]"))
        }
      })
      .catch(() => {}) // Silently fail — bar simply won't show
  }, [])

  const [bulkEnabled, setBulkEnabled] = useState(false)
  const [globalBulkTiers, setGlobalBulkTiers] = useState<BulkTier[]>([])

  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([])

  const primaryProductId = items?.[0]?.productId ?? null
  const itemCount = items?.length ?? 0
  const excludeIds = items?.map((i) => i.productId).join(",") ?? ""

  useEffect(() => {
    if (!primaryProductId || itemCount === 0) {
      setUpsellProducts([])
      return
    }
    fetch(`/api/products/related?productId=${primaryProductId}&excludeIds=${excludeIds}`)
      .then((r) => r.json())
      .then((data) => setUpsellProducts(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setUpsellProducts([]))
  }, [primaryProductId, itemCount, excludeIds])

  const refresh = useCallback(() => {
    setItems(getCart())
  }, [])

  // Refresh prices for stale cart items (added with old code that baked bulk discount into price)
  useEffect(() => {
    const currentItems = getCart()
    if (currentItems.length === 0) return

    // Detect stale items: missing bulkDiscountTiers field (old format) OR salePrice === price (old bulk-discount fingerprint)
    const stale = currentItems.filter(
      (i) =>
        i.bulkDiscountTiers === undefined ||
        (i.onSale && i.salePrice != null && i.salePrice === i.price)
    )
    if (stale.length === 0) return

    const ids = stale
      .map((i) => (i.packageId ? `${i.productId}:${i.packageId}` : i.productId))
      .join(",")

    fetch(`/api/cart/prices?items=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((fresh: Array<{ productId: string; packageId: string | null; price: string | null; salePrice: string | null; onSale: boolean; bulkDiscountTiers: string }>) => {
        const cart = getCart()
        let updated = false
        for (const f of fresh) {
          if (!f.price) continue
          const idx = cart.findIndex(
            (i) => i.productId === f.productId && (i.packageId ?? null) === f.packageId
          )
          if (idx < 0) continue
          cart[idx].price = f.price
          cart[idx].salePrice = f.salePrice
          cart[idx].onSale = f.onSale
          cart[idx].bulkDiscountTiers = f.bulkDiscountTiers
          updated = true
        }
        if (updated) {
          localStorage.setItem(CART_KEY, JSON.stringify(cart))
          window.dispatchEvent(new Event("cart-updated"))
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hydration-safe: load cart only on client
  useEffect(() => {
    refresh()
    window.addEventListener("cart-updated", refresh)
    return () => window.removeEventListener("cart-updated", refresh)
  }, [refresh])

  // Body scroll lock when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Reset tab to cart when drawer closes
  useEffect(() => {
    if (!open) setActiveTab("cart")
  }, [open])

  // open-cart-upsell: switch to upsell tab based on admin setting
  useEffect(() => {
    const handler = () => {
      if (upsellOpenOnAdd === "upsell") setActiveTab("upsell")
    }
    window.addEventListener("open-cart-upsell", handler)
    return () => window.removeEventListener("open-cart-upsell", handler)
  }, [upsellOpenOnAdd])

  // Cart sync: restore sessionStorage backup and merge server cart on login
  useEffect(() => {
    const prevStatus = prevStatusRef.current
    prevStatusRef.current = status

    if (status !== "authenticated" || prevStatus === "authenticated") return

    // 1. Restore pre-OAuth sessionStorage backup
    try {
      const backup = sessionStorage.getItem("d4d-cart-backup")
      if (backup) {
        const backupItems: CartItem[] = JSON.parse(backup)
        for (const item of backupItems) {
          addToCart({ ...item }, item.quantity)
        }
        sessionStorage.removeItem("d4d-cart-backup")
        window.dispatchEvent(new Event("cart-updated"))
      }
    } catch {}

    // 2. Fetch server cart and merge quantities into local cart
    fetchServerCart().then((serverItems) => {
      if (serverItems.length > 0) {
        mergeServerCartIntoLocal(serverItems)
        window.dispatchEvent(new Event("cart-updated"))
      }
      // 3. Push entire (merged) local cart to server
      syncCartToServer(getCart()).catch(() => {})
    })
  }, [status])

  // Re-sync server cart whenever the drawer is opened (catches items added on another device)
  useEffect(() => {
    if (!open || status !== "authenticated") return
    fetchServerCart().then((serverItems) => {
      if (serverItems.length === 0) return
      mergeServerCartIntoLocal(serverItems)
      window.dispatchEvent(new Event("cart-updated"))
    })
  }, [open, status])

  // Re-sync when tab/app becomes visible again (e.g. switching from Mac to phone)
  useEffect(() => {
    if (status !== "authenticated") return
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return
      fetchServerCart().then((serverItems) => {
        if (serverItems.length === 0) return
        mergeServerCartIntoLocal(serverItems)
        window.dispatchEvent(new Event("cart-updated"))
      })
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [status])

  const handleRemove = (key: string) => {
    const item = items?.find((i) => cartItemKey(i.productId, i.packageId) === key)
    removeFromCart(key)
    window.dispatchEvent(new Event("cart-updated"))
    if (session && item) {
      deleteCartItemFromServer(item.productId, item.packageId)
    }
  }

  const handleQty = (key: string, delta: number) => {
    const item = items?.find((i) => cartItemKey(i.productId, i.packageId) === key)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      handleRemove(key)
    } else {
      updateQuantity(key, newQty)
      window.dispatchEvent(new Event("cart-updated"))
      if (session) {
        syncCartItemToServer({ ...item, quantity: newQty })
      }
    }
  }

  const handleCheckout = async () => {
    if (!items || items.length === 0) return
    if (status === "loading") return  // Wait until session resolves
    if (!session) {
      // Back up cart to sessionStorage — survives OAuth external redirects
      try {
        const cart = localStorage.getItem(CART_KEY)
        if (cart && cart !== "[]") sessionStorage.setItem("d4d-cart-backup", cart)
      } catch {}
      const callbackUrl = encodeURIComponent(window.location.pathname + "?openCart=1")
      window.location.href = `/login?callbackUrl=${callbackUrl}`
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, packageId: i.packageId ?? null, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || t("checkoutFailed"))
        return
      }
      clearCart()
      window.dispatchEvent(new Event("cart-updated"))
      window.location.href = data.url
    } catch {
      alert(t("checkoutError"))
    } finally {
      setLoading(false)
    }
  }

  // Compute the bulk-aware effective unit price for a cart item.
  // Product-level tiers always apply if set; global tiers only if bulkEnabled.
  const getBulkUnitPrice = (item: CartItem): number => {
    const base = getEffectivePrice(item)  // sale price if on sale, else regular price
    if (item.quantity <= 1) return base
    const productTiers = parseTiers(item.bulkDiscountTiers || "")
    const activeTiers = productTiers.length > 0 ? productTiers : (bulkEnabled ? globalBulkTiers : [])
    if (activeTiers.length === 0) return base
    const tier = getActiveTier(item.quantity, activeTiers)
    return tier ? Math.max(applyBulkDiscount(base, tier), 0.01) : base
  }

  const subtotal = items
    ? items.reduce((sum, item) => sum + getBulkUnitPrice(item) * item.quantity, 0)
    : 0

  const currency = items?.[0]?.currency || "EUR"

  // Free shipping progress — only show when enabled, threshold > 0, and currencies match
  const threshold = shippingSettings?.freeShippingThreshold ?? 0
  const showFreeShipping =
    !!shippingSettings?.freeShippingEnabled &&
    threshold > 0 &&                                       // Guard against division by zero
    shippingSettings.freeShippingCurrency === currency     // Guard against currency mismatch
  const progress = showFreeShipping ? Math.min(subtotal / threshold, 1) : 0
  const amountLeft = showFreeShipping ? Math.max(threshold - subtotal, 0) : 0
  const qualifies = showFreeShipping && subtotal >= threshold

  const totalCount = items ? items.reduce((sum, i) => sum + i.quantity, 0) : 0

  const getLocalizedName = (item: CartItem) => {
    if (locale === "bg") return item.nameBg || item.nameEn
    if (locale === "es") return item.nameEs || item.nameEn
    return item.nameEn
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[57] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[58] w-full max-w-sm flex flex-col bg-slate-950 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white">{t("title")}</span>
            {totalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                {totalCount === 1 ? t("item") : t("items", { count: totalCount })}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white touch-manipulation"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar — shown only when upsell is enabled and cart has items */}
        {upsellEnabled && items && items.length > 0 && (
          <div className="flex border-b border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("cart")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors touch-manipulation ${
                activeTab === "cart"
                  ? "text-white border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛒 {t("tabCart")} ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("upsell")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors touch-manipulation ${
                activeTab === "upsell"
                  ? "text-white border-b-2 border-amber-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ✨ {t("tabUpsell")}
            </button>
          </div>
        )}

        {/* Upsell tab content */}
        {activeTab === "upsell" && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {upsellProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
                <p>{t("youMightLike")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {upsellProducts.map((p) => (
                  <UpsellCard key={p.id} product={p} locale={locale} onClose={onClose} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items list — only on cart tab */}
        {activeTab === "cart" && <div className="flex-1 overflow-y-auto overscroll-contain">
          {items === null ? (
            // Loading skeleton
            <div className="p-5 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-white font-semibold mb-1">{t("empty")}</p>
              <p className="text-slate-500 text-sm mb-6">{t("emptySubtitle")}</p>
              <Link
                href="/products"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity touch-manipulation"
              >
                {t("browseProducts")}
              </Link>
            </div>
          ) : (
            // Cart items
            <ul className="divide-y divide-white/5 px-5">
              {items.map((item) => {
                const baseUnitPrice = getEffectivePrice(item)   // pre-bulk price
                const effectivePrice = getBulkUnitPrice(item)   // bulk-adjusted price
                const hasBulkDiscount = effectivePrice < baseUnitPrice
                // Only show as "on sale" if there's an actual price reduction visible
                const isOnSale = hasBulkDiscount ||
                  (item.onSale && item.salePrice != null &&
                    parseFloat(item.salePrice) < parseFloat(item.price))
                const itemKey = cartItemKey(item.productId, item.packageId)
                return (
                  <li key={itemKey} className="py-4 flex gap-3">
                    {/* Product image */}
                    {item.image ? (
                      <Link href={item.productUrl} onClick={onClose} className="shrink-0">
                        <img
                          src={item.image}
                          alt={item.nameEn}
                          className="w-14 h-14 rounded-lg object-cover border border-white/10"
                        />
                      </Link>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <ShoppingCart className="w-5 h-5 text-slate-600" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={item.productUrl}
                        onClick={onClose}
                        className="text-sm font-medium text-white line-clamp-2 hover:text-emerald-400 transition-colors"
                      >
                        {getLocalizedName(item)}
                      </Link>
                      {(item.brandNameEn || item.brandNameBg) && (
                        <span className="text-xs text-slate-500">
                          {locale === "bg" ? item.brandNameBg : locale === "es" ? item.brandNameEs : item.brandNameEn}
                        </span>
                      )}
                      {(item.packageLabel || item.colorNameEn) && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.packageLabel && (
                            <span className="text-xs text-slate-400">{item.packageLabel}</span>
                          )}
                          {item.packageLabel && item.colorNameEn && (
                            <span className="text-xs text-slate-600">·</span>
                          )}
                          {item.colorHex && (
                            <span
                              className="w-3 h-3 rounded-full inline-block border border-white/20 shrink-0"
                              style={item.colorHex2
                                ? { background: `linear-gradient(135deg, ${item.colorHex} 50%, ${item.colorHex2} 50%)` }
                                : { backgroundColor: item.colorHex }}
                            />
                          )}
                          {item.colorNameEn && (
                            <span className="text-xs text-slate-400">
                              {locale === "bg" ? item.colorNameBg : locale === "es" ? item.colorNameEs : item.colorNameEn}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price + item total */}
                      <div className="flex items-start justify-between gap-2 mt-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold ${isOnSale ? "text-red-400" : "text-emerald-400"}`}>
                              {effectivePrice.toFixed(2)} {item.currency}
                            </span>
                            {hasBulkDiscount ? (
                              <span className="text-xs text-slate-500 line-through">
                                {baseUnitPrice.toFixed(2)}
                              </span>
                            ) : item.onSale && item.salePrice != null &&
                              parseFloat(item.salePrice) < parseFloat(item.price) ? (
                              <span className="text-xs text-slate-500 line-through">
                                {parseFloat(item.price).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                          {item.quantity > 1 && (
                            <span className="text-xs text-slate-500">× {item.quantity}</span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-white shrink-0">
                          {(effectivePrice * item.quantity).toFixed(2)} {item.currency}
                        </span>
                      </div>

                      {/* Qty + Remove */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 glass rounded-lg border border-white/10 px-1">
                          <button
                            onClick={() => handleQty(itemKey, -1)}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors touch-manipulation disabled:opacity-40"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm text-white font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQty(itemKey, 1)}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors touch-manipulation disabled:opacity-40"
                            disabled={item.quantity >= 99}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(itemKey)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation"
                          aria-label={t("remove")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

        </div>}

        {/* Footer — cart tab */}
        {activeTab === "cart" && items && items.length > 0 && (
          <div className="border-t border-white/10 p-5 shrink-0 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{t("subtotal")}</span>
              <span className="text-white font-semibold">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>

            {/* Free shipping progress bar */}
            {showFreeShipping && (
              <div className="space-y-1.5">
                <p className="text-xs text-center">
                  {qualifies ? (
                    <span className="text-emerald-400 font-medium">{t("freeShippingUnlocked")}</span>
                  ) : (
                    <span className="text-slate-400">
                      {t("freeShippingAdd", { amount: amountLeft.toFixed(2), currency })}
                    </span>
                  )}
                </p>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      qualifies ? "bg-emerald-400" : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <button
              onClick={handleCheckout}
              disabled={loading || status === "loading"}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity touch-manipulation flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {(loading || status === "loading") ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {t("checkout")}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors touch-manipulation"
            >
              {t("continueShopping")}
            </button>
          </div>
        )}

        {/* Footer — upsell tab */}
        {activeTab === "upsell" && items && items.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4 shrink-0">
            <button
              onClick={() => setActiveTab("cart")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity touch-manipulation"
            >
              {t("upsellViewCart")}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
