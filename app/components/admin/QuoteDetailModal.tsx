"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  X, Save, Loader2, Download, ExternalLink,
  FileText, MessageSquare, Ticket, Search,
  Copy, Clock,
} from "lucide-react"

interface Product {
  id: string
  slug: string
  sku: string | null
  nameEn: string
  nameBg: string
  nameEs: string
  price: string | null
  salePrice: string | null
  onSale: boolean
  currency: string
}

interface QuoteMessage {
  id: string
  senderType: string
  message: string
  quotedPrice: string | null
  createdAt: string
}

interface QuoteRequest {
  id: string
  quoteNumber: string
  productId: string | null
  product: Product | null
  name: string
  email: string
  phone: string | null
  message: string | null
  fileName: string | null
  fileUrl: string | null
  fileSize: number | null
  status: string
  quotedPrice: string | null
  adminNotes: string | null
  userResponse: string | null
  viewedAt: string | null
  quotedAt: string | null
  createdAt: string
  updatedAt: string
  messages?: QuoteMessage[]
}

interface CouponOption {
  id: string
  code: string
  type: string
  value: string
  currency: string | null
}

interface QuoteDetailModalProps {
  quote: QuoteRequest
  onClose: () => void
  onSaved: () => void
  canDelete: boolean
  onDelete: (id: string, name: string) => void
}

const STATUS_BADGES: Record<string, { labelKey: string; color: string }> = {
  pending: { labelKey: "statusPending", color: "bg-amber-500/20 text-amber-400" },
  quoted: { labelKey: "statusQuoted", color: "bg-blue-500/20 text-blue-400" },
  accepted: { labelKey: "statusAccepted", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { labelKey: "statusRejected", color: "bg-red-500/20 text-red-400" },
  counter_offer: { labelKey: "counterOffer", color: "bg-purple-500/20 text-purple-400" },
  user_declined: { labelKey: "userDeclined", color: "bg-gray-500/20 text-gray-400" },
}

type TabKey = "details" | "conversation"

function localizeMessage(raw: string, t: ReturnType<typeof useTranslations<"admin.quotes">>): string[] {
  try {
    const data = JSON.parse(raw)
    if (!data?.key) throw new Error("not structured")

    const lines: string[] = []
    if (data.key === "accepted") {
      lines.push(t("msgAccepted"))
      if (data.price) lines.push(t("msgAtPrice", { price: data.price }))
      if (data.couponCode && data.couponDiscount) {
        lines.push(`🎟️ ${data.couponCode} (-${data.couponDiscount})`)
      }
    } else if (data.key === "declined") {
      lines.push(t("msgDeclined"))
      if (data.text) lines.push(data.text)
    } else if (data.key === "counter_offer") {
      lines.push(t("msgCounterOffer"))
      if (data.text) lines.push(data.text)
    } else {
      throw new Error("unknown key")
    }
    return lines
  } catch {
    // Plain text message (old format or admin-authored) — split by newlines
    return raw.split("\n")
  }
}

export function QuoteDetailModal({ quote, onClose, onSaved, canDelete, onDelete }: QuoteDetailModalProps) {
  const t = useTranslations("admin.quotes")
  const [activeTab, setActiveTab] = useState<TabKey>("details")
  const [editForm, setEditForm] = useState({
    status: quote.status,
    quotedPrice: quote.quotedPrice || "",
    adminNotes: quote.adminNotes || "",
  })
  const [saving, setSaving] = useState(false)

  // Coupon picker state
  const [selectedCoupon, setSelectedCoupon] = useState<CouponOption | null>(null)
  const [couponSearch, setCouponSearch] = useState("")
  const [couponResults, setCouponResults] = useState<CouponOption[]>([])
  const [couponSearchLoading, setCouponSearchLoading] = useState(false)
  const [showCouponDropdown, setShowCouponDropdown] = useState(false)
  const couponSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const couponDropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll conversation to bottom when tab is selected
  useEffect(() => {
    if (activeTab === "conversation" && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [activeTab])

  // Coupon search
  const searchCoupons = useCallback((query: string) => {
    if (couponSearchTimeout.current) clearTimeout(couponSearchTimeout.current)
    couponSearchTimeout.current = setTimeout(async () => {
      setCouponSearchLoading(true)
      try {
        const res = await fetch(`/api/admin/coupons?search=${encodeURIComponent(query)}&status=active`)
        const data = await res.json()
        const list = Array.isArray(data.coupons) ? data.coupons : Array.isArray(data) ? data : []
        setCouponResults(list.slice(0, 10).map((c: CouponOption & Record<string, unknown>) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          currency: c.currency,
        })))
      } catch {
        setCouponResults([])
      } finally {
        setCouponSearchLoading(false)
      }
    }, 300)
  }, [])

  // Close coupon dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (couponDropdownRef.current && !couponDropdownRef.current.contains(e.target as Node)) {
        setShowCouponDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatCouponValue = (coupon: CouponOption) => {
    if (coupon.type === "percentage") return `${coupon.value}%`
    const symbol = coupon.currency === "EUR" ? "€" : coupon.currency === "USD" ? "$" : coupon.currency || ""
    return `${symbol}${parseFloat(coupon.value).toFixed(2)}`
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return t("justNow")
    if (diffMins < 60) return t("minutesAgo", { minutes: String(diffMins) })
    if (diffHours < 24) return t("hoursAgo", { hours: String(diffHours) })
    return t("daysAgo", { days: String(diffDays) })
  }

  const getWaitingBadge = () => {
    if (quote.status !== "pending" && quote.status !== "counter_offer") return null
    const diffMs = Date.now() - new Date(quote.updatedAt).getTime()
    const diffDays = diffMs / 86400000
    const diffHours = Math.floor(diffMs / 3600000)

    let timeBadge: React.ReactNode
    if (diffDays < 1) {
      timeBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">{diffHours}h</span>
    } else if (diffDays < 3) {
      timeBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">~{Math.floor(diffDays)}d</span>
    } else {
      timeBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 animate-pulse">{Math.floor(diffDays)}d!</span>
    }

    return (
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <Clock className="w-3 h-3" />
        {t("waiting")}
        {timeBadge}
      </span>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t("copied"))
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch("/api/admin/quotes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: quote.id,
        ...editForm,
        couponId: selectedCoupon?.id || null,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      toast.error(error.error || t("updateFailed"))
      setSaving(false)
      return
    }

    setSaving(false)
    toast.success(t("updatedSuccess"))
    onSaved()
    onClose()
    // Notify sidebar to update pending count
    window.dispatchEvent(new Event("quoteUpdated"))
  }

  const messageCount = quote.messages?.length || 0
  const badge = STATUS_BADGES[quote.status] || STATUS_BADGES.pending

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { key: "details", label: t("tabDetails"), icon: <FileText className="w-4 h-4" /> },
    {
      key: "conversation",
      label: t("tabConversation"),
      icon: <MessageSquare className="w-4 h-4" />,
      badge: messageCount > 0 ? (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
          {messageCount}
        </span>
      ) : null,
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border border-white/10 w-full max-w-[95vw] md:max-w-2xl max-h-[90vh] flex flex-col bg-[#1a1a2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => copyToClipboard(quote.quoteNumber)}
              className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-all shrink-0"
              title={t("clickToCopy")}
            >
              {quote.quoteNumber}
            </button>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} shrink-0`}>
              {t(badge.labelKey)}
            </span>
            {getWaitingBadge()}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 sm:p-4 border-b border-white/10 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* === DETAILS TAB === */}
          {activeTab === "details" && (
            <div className="space-y-5">
              {/* Product Info */}
              {quote.product && (() => {
                const product = quote.product
                const hasDiscount = product.onSale && product.salePrice && product.price
                const discountPercent = hasDiscount
                  ? Math.round((1 - parseFloat(product.salePrice!) / parseFloat(product.price!)) * 100)
                  : 0

                return (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <h3 className="text-sm font-medium text-emerald-400">{t("product")}</h3>
                    <a
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white font-medium text-lg hover:text-emerald-300 transition-colors group"
                    >
                      {product.nameEn}
                      <ExternalLink className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {product.sku && (
                      <p className="text-gray-400 text-sm">
                        SKU: <span className="text-white font-mono">{product.sku}</span>
                      </p>
                    )}
                    {hasDiscount ? (
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold text-xl">
                          {parseFloat(product.salePrice!).toFixed(2)} {product.currency}
                        </span>
                        <span className="text-gray-500 line-through text-lg">
                          {parseFloat(product.price!).toFixed(2)}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                          -{discountPercent}%
                        </span>
                      </div>
                    ) : product.price ? (
                      <p className="text-emerald-400 font-bold text-xl">
                        {parseFloat(product.price).toFixed(2)} {product.currency}
                      </p>
                    ) : null}
                    <a
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      <span>{t("viewProduct")} →</span>
                    </a>
                  </div>
                )
              })()}

              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-medium text-gray-300">{t("customer")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t("customer")}</p>
                    <p className="text-white">{quote.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("email")}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white truncate">{quote.email}</p>
                      <button
                        onClick={() => copyToClipboard(quote.email)}
                        className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                        title={t("clickToCopy")}
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                      </button>
                    </div>
                  </div>
                  {quote.phone && (
                    <div>
                      <p className="text-gray-500">{t("phone")}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white">{quote.phone}</p>
                        <button
                          onClick={() => copyToClipboard(quote.phone!)}
                          className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                          title={t("clickToCopy")}
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">{t("date")}</p>
                    <p className="text-white">
                      {new Date(quote.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Tracking */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {quote.viewedAt ? (
                  <span>{t("customerViewed", {
                    date: new Date(quote.viewedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }),
                  })}</span>
                ) : (
                  <span className="text-amber-400">{t("notViewed")}</span>
                )}
              </div>

              {/* Original Message */}
              {quote.message && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("originalMessage")}
                  </label>
                  <p className="text-white bg-white/5 p-4 rounded-xl border border-white/10 whitespace-pre-wrap">
                    {quote.message}
                  </p>
                </div>
              )}

              {/* File */}
              {quote.fileUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("file")}
                  </label>
                  <a
                    href={quote.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Download className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-cyan-400 font-medium">{quote.fileName || t("downloadFile")}</p>
                      {quote.fileSize && (
                        <p className="text-xs text-cyan-400/60">{formatFileSize(quote.fileSize)}</p>
                      )}
                    </div>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* === CONVERSATION & REPLY TAB === */}
          {activeTab === "conversation" && (
            <div className="space-y-4">
              {/* Legacy User Response */}
              {quote.userResponse && (
                <div>
                  <label className="block text-sm font-medium text-purple-400 mb-2">
                    {t("customerResponse")}
                  </label>
                  <p className="text-white bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 whitespace-pre-wrap">
                    {quote.userResponse}
                  </p>
                </div>
              )}

              {/* Chat History */}
              {messageCount > 0 ? (
                <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 max-h-[40vh] overflow-y-auto">
                  {quote.messages!.map((msg) => {
                    const localizedLines = localizeMessage(msg.message, t)
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                            msg.senderType === "admin"
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "bg-emerald-500/20 border border-emerald-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${
                              msg.senderType === "admin" ? "text-blue-400" : "text-emerald-400"
                            }`}>
                              {msg.senderType === "admin" ? t("you") : t("customerLabel")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(msg.createdAt)}
                            </span>
                          </div>
                          {localizedLines.map((line, i) => (
                            <p key={i} className="text-sm text-white">{line}</p>
                          ))}
                          {msg.quotedPrice && (
                            <p className="text-sm font-semibold text-emerald-400 mt-1">
                              €{parseFloat(msg.quotedPrice).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mb-3 text-gray-600" />
                  <p className="text-sm">{t("noMessages")}</p>
                </div>
              )}

              {/* ── Reply Form ── */}
              <div className="border-t border-white/10 pt-4 space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("status")}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="pending">{t("statusPending")}</option>
                    <option value="quoted">{t("statusQuoted")}</option>
                    <option value="accepted">{t("statusAccepted")}</option>
                    <option value="rejected">{t("statusRejected")}</option>
                  </select>
                </div>

                {/* Quoted Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("quotedPrice")} (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.quotedPrice}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || parseFloat(value) >= 0) {
                        setEditForm({ ...editForm, quotedPrice: value })
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("adminNotes")}
                  </label>
                  <textarea
                    value={editForm.adminNotes}
                    onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Attach Coupon — shown only when status is "quoted" */}
                {editForm.status === "quoted" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      {t("attachCoupon")}
                      <span className="text-gray-600 font-normal">({t("optional")})</span>
                    </label>

                    {selectedCoupon ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                          <Ticket className="w-3.5 h-3.5" />
                          <span className="font-mono font-medium">{selectedCoupon.code}</span>
                          <span className="text-amber-400/60">({formatCouponValue(selectedCoupon)})</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCoupon(null)}
                            className="hover:text-red-400 transition-colors ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    ) : (
                      <div className="relative" ref={couponDropdownRef}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={couponSearch}
                            onChange={(e) => {
                              setCouponSearch(e.target.value)
                              searchCoupons(e.target.value)
                              setShowCouponDropdown(true)
                            }}
                            onFocus={() => {
                              setShowCouponDropdown(true)
                              if (!couponSearch) searchCoupons("")
                            }}
                            placeholder={t("searchCoupons")}
                            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                          />
                          {couponSearchLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                          )}
                        </div>

                        {showCouponDropdown && couponResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a2e] shadow-xl">
                            {couponResults.map((coupon) => (
                              <button
                                key={coupon.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCoupon(coupon)
                                  setShowCouponDropdown(false)
                                  setCouponSearch("")
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                              >
                                <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="font-mono text-sm text-amber-400">{coupon.code}</span>
                                <span className="text-xs text-gray-500">
                                  {formatCouponValue(coupon)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">{t("attachCouponHint")}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {t("save")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
