"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { X, ShoppingCart, Trash2, Minus, Plus, Loader2 } from "lucide-react"
import { getCart, removeFromCart, updateQuantity, clearCart, getEffectivePrice, type CartItem } from "@/lib/cart"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  locale: string
}

export function CartDrawer({ open, onClose, locale }: CartDrawerProps) {
  const t = useTranslations("cart")
  const { data: session, status } = useSession()
  const [items, setItems] = useState<CartItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setItems(getCart())
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

  const handleRemove = (productId: string) => {
    removeFromCart(productId)
    window.dispatchEvent(new Event("cart-updated"))
  }

  const handleQty = (productId: string, delta: number) => {
    const item = items?.find((i) => i.productId === productId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      handleRemove(productId)
    } else {
      updateQuantity(productId, newQty)
      window.dispatchEvent(new Event("cart-updated"))
    }
  }

  const handleCheckout = async () => {
    if (!items || items.length === 0) return
    if (status === "loading") return  // Wait until session resolves
    if (!session) {
      // Cart persists in localStorage — survives redirect automatically
      const callbackUrl = encodeURIComponent(window.location.pathname)
      window.location.href = `/login?callbackUrl=${callbackUrl}`
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Checkout failed")
        return
      }
      clearCart()
      window.dispatchEvent(new Event("cart-updated"))
      window.location.href = data.url
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const subtotal = items
    ? items.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0)
    : 0

  const currency = items?.[0]?.currency || "EUR"

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
        className={`fixed inset-0 z-[54] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[55] w-full max-w-sm flex flex-col bg-slate-950 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
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

        {/* Items list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
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
                const effectivePrice = getEffectivePrice(item)
                const isOnSale = item.onSale && item.salePrice !== null
                return (
                  <li key={item.productId} className="py-4 flex gap-3">
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

                      {/* Price */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-sm font-semibold ${isOnSale ? "text-red-400" : "text-emerald-400"}`}>
                          {effectivePrice.toFixed(2)} {item.currency}
                        </span>
                        {isOnSale && item.price && (
                          <span className="text-xs text-slate-500 line-through">
                            {parseFloat(item.price).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Qty + Remove */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 glass rounded-lg border border-white/10 px-1">
                          <button
                            onClick={() => handleQty(item.productId, -1)}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors touch-manipulation disabled:opacity-40"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm text-white font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQty(item.productId, 1)}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors touch-manipulation disabled:opacity-40"
                            disabled={item.quantity >= 99}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item.productId)}
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
        </div>

        {/* Footer */}
        {items && items.length > 0 && (
          <div className="border-t border-white/10 p-5 shrink-0 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{t("subtotal")}</span>
              <span className="text-white font-semibold">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>

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
      </div>
    </>
  )
}
