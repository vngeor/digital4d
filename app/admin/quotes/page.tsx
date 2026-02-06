"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Trash2, Loader2, MessageSquare, Download, X, Save, Eye, Link as LinkIcon, ExternalLink } from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"

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

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-500/20 text-amber-400" },
  quoted: { label: "Quoted", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Accepted", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400" },
  counter_offer: { label: "Counter Offer", color: "bg-purple-500/20 text-purple-400" },
  user_declined: { label: "User Declined", color: "bg-gray-500/20 text-gray-400" },
}

export default function QuotesPage() {
  const t = useTranslations("admin.quotes")
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null)
  const [editForm, setEditForm] = useState({
    status: "",
    quotedPrice: "",
    adminNotes: "",
  })
  const [saving, setSaving] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const fetchQuotes = async (status?: string | null) => {
    setLoading(true)
    const url = status
      ? `/api/admin/quotes?status=${encodeURIComponent(status)}`
      : "/api/admin/quotes"
    const res = await fetch(url)
    const data = await res.json()
    const quotesData = Array.isArray(data) ? data : []
    setQuotes(quotesData)
    if (!status) {
      setPendingCount(quotesData.filter((q: QuoteRequest) => q.status === "pending").length)
    } else if (status === "pending") {
      setPendingCount(quotesData.length)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  useEffect(() => {
    fetchQuotes(selectedStatus)
  }, [selectedStatus])

  const handleView = (quote: QuoteRequest) => {
    setViewingQuote(quote)
    setEditForm({
      status: quote.status,
      quotedPrice: quote.quotedPrice || "",
      adminNotes: quote.adminNotes || "",
    })
  }

  const handleSave = async () => {
    if (!viewingQuote) return

    setSaving(true)
    const res = await fetch("/api/admin/quotes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: viewingQuote.id,
        ...editForm,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      alert(error.error || "Failed to update quote")
      setSaving(false)
      return
    }

    setSaving(false)
    setViewingQuote(null)
    fetchQuotes(selectedStatus)
    // Notify sidebar to update pending count
    window.dispatchEvent(new Event("quoteUpdated"))
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    await fetch(`/api/admin/quotes?id=${id}`, { method: "DELETE" })
    fetchQuotes(selectedStatus)
    // Notify sidebar to update pending count
    window.dispatchEvent(new Event("quoteUpdated"))
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const columns = [
    {
      key: "quoteNumber",
      header: "#",
      className: "whitespace-nowrap w-[120px]",
      render: (item: QuoteRequest) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(item.quoteNumber)
            const btn = e.currentTarget
            btn.classList.add("scale-95")
            const orig = btn.textContent
            btn.textContent = "Copied!"
            setTimeout(() => {
              btn.textContent = orig
              btn.classList.remove("scale-95")
            }, 1000)
          }}
          className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-all"
          title="Click to copy"
        >
          {item.quoteNumber}
        </button>
      ),
    },
    {
      key: "customer",
      header: t("customer"),
      className: "min-w-[150px]",
      render: (item: QuoteRequest) => (
        <div>
          <p className="font-medium text-white text-sm truncate max-w-[150px]">{item.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[150px]">{item.email}</p>
        </div>
      ),
    },
    {
      key: "product",
      header: t("product"),
      className: "min-w-[140px] max-w-[180px]",
      render: (item: QuoteRequest) => {
        const product = item.product
        if (!product) return <span className="text-gray-500 text-sm">-</span>

        return (
          <div>
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white text-sm hover:text-emerald-300 truncate block max-w-[160px]"
              title={product.nameEn}
            >
              {product.nameEn}
            </a>
            {product.price && (
              <div className="flex items-center gap-2">
                {product.onSale && product.salePrice ? (
                  <>
                    <span className="text-xs text-gray-500 line-through">
                      {parseFloat(product.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-400">
                      {parseFloat(product.salePrice).toFixed(2)} {product.currency}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-emerald-400">
                    {parseFloat(product.price).toFixed(2)} {product.currency}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: "file",
      header: t("file"),
      className: "whitespace-nowrap",
      render: (item: QuoteRequest) => (
        <div>
          {item.fileUrl ? (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300"
              title={item.fileName || "Download"}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="text-xs truncate max-w-[80px]">{item.fileName || "File"}</span>
            </a>
          ) : (
            <span className="text-gray-500 text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: t("status"),
      className: "whitespace-nowrap",
      render: (item: QuoteRequest) => {
        const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending
        const hasCounterOffer = (item.status === "pending" && item.userResponse) || item.status === "counter_offer"
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${badge.color}`}>
              {badge.label}
            </span>
            {hasCounterOffer && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 w-fit">
                Counter
              </span>
            )}
            {item.status === "quoted" && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${
                item.viewedAt
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {item.viewedAt ? "Seen" : "Unseen"}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "quotedPrice",
      header: t("quotedPrice"),
      className: "whitespace-nowrap text-right",
      render: (item: QuoteRequest) => (
        <span className="text-white font-medium">
          {item.quotedPrice && parseFloat(item.quotedPrice) >= 0
            ? `€${parseFloat(item.quotedPrice).toFixed(2)}`
            : "-"}
        </span>
      ),
    },
    {
      key: "date",
      header: t("date"),
      className: "whitespace-nowrap",
      render: (item: QuoteRequest) => (
        <span className="text-gray-400 text-xs">
          {new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      render: (item: QuoteRequest) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleView(item)
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={t("viewQuote")}
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id)
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ),
    },
  ]

  const statusFilters = [
    { key: null, label: t("all") },
    { key: "pending", label: t("pending") },
    { key: "quoted", label: t("quoted") },
    { key: "counter_offer", label: "Counter Offer" },
    { key: "accepted", label: t("accepted") },
    { key: "user_declined", label: "User Declined" },
    { key: "rejected", label: t("rejected") },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.key || "all"}
            onClick={() => setSelectedStatus(filter.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedStatus === filter.key
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {filter.label}
            {filter.key === "pending" && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={quotes}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noQuotes")}
        />
      )}

      {/* View/Edit Quote Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                {t("viewQuote")}
              </h2>
              <button
                onClick={() => setViewingQuote(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info */}
              {viewingQuote.product && (() => {
                const product = viewingQuote.product
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
                      <span>View Product →</span>
                    </a>
                  </div>
                )
              })()}

              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-medium text-gray-300">{t("customer")}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t("customer")}</p>
                    <p className="text-white">{viewingQuote.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("email")}</p>
                    <p className="text-white">{viewingQuote.email}</p>
                  </div>
                  {viewingQuote.phone && (
                    <div>
                      <p className="text-gray-500">{t("phone")}</p>
                      <p className="text-white">{viewingQuote.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">{t("date")}</p>
                    <p className="text-white">
                      {new Date(viewingQuote.createdAt).toLocaleDateString("en-US", {
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

              {/* Message */}
              {viewingQuote.message && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("message")}
                  </label>
                  <p className="text-white bg-white/5 p-4 rounded-xl border border-white/10 whitespace-pre-wrap">
                    {viewingQuote.message}
                  </p>
                </div>
              )}

              {/* User Response (Counter Offer) - Legacy */}
              {viewingQuote.userResponse && (
                <div>
                  <label className="block text-sm font-medium text-purple-400 mb-2">
                    Customer Response
                  </label>
                  <p className="text-white bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 whitespace-pre-wrap">
                    {viewingQuote.userResponse}
                  </p>
                </div>
              )}

              {/* Message History */}
              {viewingQuote.messages && viewingQuote.messages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Conversation History
                  </label>
                  <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 max-h-60 overflow-y-auto">
                    {viewingQuote.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2 ${
                            msg.senderType === "admin"
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "bg-emerald-500/20 border border-emerald-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${
                              msg.senderType === "admin" ? "text-blue-400" : "text-emerald-400"
                            }`}>
                              {msg.senderType === "admin" ? "You" : "Customer"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-white">{msg.message}</p>
                          {msg.quotedPrice && (
                            <p className="text-sm font-semibold text-emerald-400 mt-1">
                              €{parseFloat(msg.quotedPrice).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File */}
              {viewingQuote.fileUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("file")}
                  </label>
                  <a
                    href={viewingQuote.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Download className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-cyan-400 font-medium">{viewingQuote.fileName || "Download File"}</p>
                      {viewingQuote.fileSize && (
                        <p className="text-xs text-cyan-400/60">{formatFileSize(viewingQuote.fileSize)}</p>
                      )}
                    </div>
                  </a>
                </div>
              )}

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
                    // Prevent negative values
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setViewingQuote(null)}
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
        </div>
      )}
    </div>
  )
}
