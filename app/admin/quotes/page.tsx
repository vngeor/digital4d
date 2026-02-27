"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Trash2, MessageSquare, Download, Eye, Search, ChevronLeft, ChevronRight, Clock, ArrowUpDown } from "lucide-react"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { DataTable } from "@/app/components/admin/DataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { QuoteDetailModal } from "@/app/components/admin/QuoteDetailModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

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

const STATUS_BADGES: Record<string, { labelKey: string; color: string }> = {
  pending: { labelKey: "statusPending", color: "bg-amber-500/20 text-amber-400" },
  quoted: { labelKey: "statusQuoted", color: "bg-blue-500/20 text-blue-400" },
  accepted: { labelKey: "statusAccepted", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { labelKey: "statusRejected", color: "bg-red-500/20 text-red-400" },
  counter_offer: { labelKey: "counterOffer", color: "bg-purple-500/20 text-purple-400" },
  user_declined: { labelKey: "userDeclined", color: "bg-gray-500/20 text-gray-400" },
}

export default function QuotesPage() {
  const t = useTranslations("admin.quotes")
  const { can } = useAdminPermissions()
  const searchParams = useSearchParams()
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const [waitingFilter, setWaitingFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>("newest")

  // Server-side pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search input
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search])

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus) params.set("status", selectedStatus)
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy !== "newest") params.set("sort", sortBy)
      params.set("page", String(page))
      params.set("limit", "15")
      const res = await fetch(`/api/admin/quotes?${params.toString()}`)
      const data = await res.json()
      setQuotes(data.quotes || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setPendingCount(data.pendingCount || 0)
    } catch {
      toast.error(t("updateFailed"))
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, debouncedSearch, page, sortBy])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  // Reset page when status filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedStatus])

  // Deep link: open view modal when ?edit=<id> is present
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (editId && quotes.length > 0 && !viewingQuote) {
      const item = quotes.find((q) => q.id === editId)
      if (item) {
        setViewingQuote(item)
        window.history.replaceState({}, "", "/admin/quotes")
      }
    }
  }, [searchParams, quotes])

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/quotes?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchQuotes()
    window.dispatchEvent(new Event("quoteUpdated"))
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

  const getLastActivity = (item: QuoteRequest): string => {
    const lastMsg = item.messages?.[item.messages.length - 1]
    const lastMsgDate = lastMsg ? new Date(lastMsg.createdAt).getTime() : 0
    const updatedDate = new Date(item.updatedAt).getTime()
    const latest = lastMsgDate > updatedDate ? lastMsg!.createdAt : item.updatedAt
    return formatTimeAgo(latest)
  }

  const getWaitingBadge = (item: QuoteRequest) => {
    if (item.status !== "pending" && item.status !== "counter_offer") return null
    const diffMs = Date.now() - new Date(item.updatedAt).getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = diffMs / 86400000
    if (diffDays < 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">
          <Clock className="w-3 h-3" />{diffHours}h
        </span>
      )
    } else if (diffDays < 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
          <Clock className="w-3 h-3" />~{Math.floor(diffDays)}d
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 animate-pulse">
          <Clock className="w-3 h-3" />{Math.floor(diffDays)}d!
        </span>
      )
    }
  }

  // Client-side urgency filter (on already-fetched data)
  const filteredQuotes = quotes.filter((q) => {
    if (!waitingFilter) return true
    if (q.status !== "pending" && q.status !== "counter_offer") return false
    const diffDays = (Date.now() - new Date(q.updatedAt).getTime()) / 86400000
    if (waitingFilter === "fresh") return diffDays < 1
    if (waitingFilter === "medium") return diffDays >= 1 && diffDays < 3
    if (waitingFilter === "urgent") return diffDays >= 3
    return true
  })

  // Whether to show urgency filter (only for statuses that have waiting time)
  const showUrgencyFilter = !selectedStatus || selectedStatus === "pending" || selectedStatus === "counter_offer"

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
            toast.success(t("copied"))
          }}
          className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-all"
          title={t("clickToCopy")}
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
      className: "min-w-[140px] max-w-[180px] hidden md:table-cell",
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
      key: "status",
      header: t("status"),
      className: "whitespace-nowrap",
      render: (item: QuoteRequest) => {
        const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending
        const hasCounterOffer = (item.status === "pending" && item.userResponse) || item.status === "counter_offer"
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${badge.color}`}>
              {t(badge.labelKey)}
            </span>
            {hasCounterOffer && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 w-fit">
                {t("counterOffer")}
              </span>
            )}
            {item.status === "quoted" && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${
                  item.viewedAt ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {item.viewedAt ? t("seen") : t("unseen")}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "waiting",
      header: t("waitingTime"),
      className: "whitespace-nowrap hidden md:table-cell w-[90px]",
      render: (item: QuoteRequest) => getWaitingBadge(item) || <span className="text-gray-600">—</span>,
    },
    {
      key: "messages",
      header: t("messagesCol"),
      className: "whitespace-nowrap hidden sm:table-cell w-[80px]",
      render: (item: QuoteRequest) => {
        const count = item.messages?.length || 0
        const lastMsg = item.messages?.[item.messages.length - 1]
        const needsReply = lastMsg?.senderType === "user"
        return count > 0 ? (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-400">{count}</span>
            {needsReply && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                title={t("needsReply")}
              />
            )}
          </div>
        ) : (
          <span className="text-gray-600">—</span>
        )
      },
    },
    {
      key: "lastActivity",
      header: t("lastActivity"),
      className: "whitespace-nowrap hidden lg:table-cell",
      render: (item: QuoteRequest) => (
        <span className="text-gray-400 text-xs">{getLastActivity(item)}</span>
      ),
    },
    {
      key: "quotedPrice",
      header: t("quotedPrice"),
      className: "whitespace-nowrap text-right hidden sm:table-cell",
      render: (item: QuoteRequest) => (
        <span className="text-white font-medium">
          {item.quotedPrice && parseFloat(item.quotedPrice) >= 0
            ? `€${parseFloat(item.quotedPrice).toFixed(2)}`
            : "-"}
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
              setViewingQuote(item)
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={t("viewQuote")}
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          {can("quotes", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.quoteNumber)
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              title={t("delete")}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      ),
    },
  ]

  const statusFilters = [
    { key: null, label: t("all") },
    { key: "pending", label: t("pending") },
    { key: "quoted", label: t("quoted") },
    { key: "counter_offer", label: t("counterOffer") },
    { key: "accepted", label: t("accepted") },
    { key: "user_declined", label: t("userDeclined") },
    { key: "rejected", label: t("rejected") },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">{t("subtitle")}</p>
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
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

        {/* Urgency Filter + Sort */}
        {showUrgencyFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-gray-500" />
            {[
              { key: null, label: t("all") },
              { key: "fresh", label: t("filterFresh"), dot: "bg-blue-400" },
              { key: "medium", label: t("filterMedium"), dot: "bg-amber-400" },
              { key: "urgent", label: t("filterUrgent"), dot: "bg-red-400" },
            ].map((f) => (
              <button
                key={f.key || "all"}
                onClick={() => setWaitingFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  waitingFilter === f.key
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
              </button>
            ))}
            <div className="ml-auto">
              <button
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === "oldest"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortBy === "oldest" ? t("sortOldestFirst") : t("sortNewestFirst")}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={5} />
      ) : (
        <DataTable
          data={filteredQuotes}
          columns={columns}
          searchable={false}
          pageSize={100}
          emptyMessage={t("noQuotes")}
          renderMobileCard={(item: QuoteRequest) => {
            const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending
            const hasCounterOffer = (item.status === "pending" && item.userResponse) || item.status === "counter_offer"
            const msgCount = item.messages?.length || 0
            const lastMsg = item.messages?.[item.messages.length - 1]
            const needsReply = lastMsg?.senderType === "user"
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(item.quoteNumber)
                      toast.success(t("copied"))
                    }}
                    className="font-mono text-xs text-blue-400 hover:text-blue-300 shrink-0"
                  >
                    {item.quoteNumber}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                    {t(badge.labelKey)}
                  </span>
                  {hasCounterOffer && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400">
                      {t("counterOffer")}
                    </span>
                  )}
                  {item.status === "quoted" && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.viewedAt ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {item.viewedAt ? t("seen") : t("unseen")}
                    </span>
                  )}
                  {getWaitingBadge(item)}
                  {msgCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3 h-3" />
                      {msgCount}
                      {needsReply && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </span>
                  )}
                </div>
                {item.product && (
                  <div className="text-sm text-gray-300 truncate">
                    {item.product.nameEn}
                    {item.product.price && (
                      <span className="text-xs text-emerald-400 ml-2">
                        {item.product.onSale && item.product.salePrice
                          ? `${parseFloat(item.product.salePrice).toFixed(2)} ${item.product.currency}`
                          : `${parseFloat(item.product.price).toFixed(2)} ${item.product.currency}`}
                      </span>
                    )}
                  </div>
                )}
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.fileName || "File"}</span>
                  </a>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {item.quotedPrice && parseFloat(item.quotedPrice) >= 0 && (
                      <span className="text-white font-medium text-sm">
                        €{parseFloat(item.quotedPrice).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{getLastActivity(item)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setViewingQuote(item)
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    {can("quotes", "delete") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item.id, item.quoteNumber)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )
          }}
        />
      )}

      {/* Server-side Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="glass rounded-2xl border border-white/10 p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-gray-400 hidden sm:block">
            {`${(page - 1) * 15 + 1}-${Math.min(page * 15, total)} / ${total}`}
          </p>
          <div className="flex items-center gap-2 sm:ml-0 mx-auto sm:mx-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Quote Detail Modal */}
      {viewingQuote && (
        <QuoteDetailModal
          quote={viewingQuote}
          onClose={() => setViewingQuote(null)}
          onSaved={() => fetchQuotes()}
          canDelete={can("quotes", "delete")}
          onDelete={handleDelete}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { name: deleteItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}
