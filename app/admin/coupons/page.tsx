"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  ShieldOff,
  Loader2,
  Search,
  Percent,
  DollarSign,
  Calendar,
  Package,
  Megaphone,
  Cake,
  Gift,
  Zap,
  FolderOpen,
  Store,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface Coupon {
  id: string
  code: string
  type: "percentage" | "fixed"
  value: number
  currency: string
  minPurchase: number | null
  maxUses: number | null
  usedCount: number
  perUserLimit: number
  productIds: string[]
  categoryIds: string[]
  categoryNames?: string[]
  brandIds: string[]
  brandNames?: string[]
  allowOnSale: boolean
  showOnProduct: boolean
  active: boolean
  startsAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string | null; email: string } | null
}

interface CouponFormData {
  id?: string
  code: string
  type: "percentage" | "fixed"
  value: number
  currency: string
  minPurchase: number | null
  maxUses: number | null
  perUserLimit: number
  productIds: string[]
  categoryIds: string[]
  brandIds: string[]
  allowOnSale: boolean
  showOnProduct: boolean
  active: boolean
  startsAt: string | null
  expiresAt: string | null
}

interface ProductOption {
  id: string
  nameEn: string
  nameBg: string
  image: string | null
  sku?: string | null
}

interface CategoryOption {
  id: string
  slug: string
  nameEn: string
  nameBg: string
  children?: { id: string; slug: string; nameEn: string; nameBg: string }[]
}

interface BrandOption {
  id: string
  nameEn: string
  nameBg: string
  image: string | null
  _count?: { products: number }
}

type FilterStatus = "all" | "active" | "expired" | "inactive" | "auto"

const AUTO_COUPON_PATTERN = /^(BDAY|XMAS|NEWYEAR|EASTER|TMPL)-[A-Z0-9]{6}-\d{4}T?$/

type AutoCouponType = "birthday" | "christmas" | "new_year" | "orthodox_easter" | "custom_date"

function getAutoCouponType(code: string): AutoCouponType | null {
  if (!AUTO_COUPON_PATTERN.test(code)) return null
  const match = code.match(/^(BDAY|XMAS|NEWYEAR|EASTER|TMPL)-/)
  if (!match) return null
  const prefixMap: Record<string, AutoCouponType> = {
    BDAY: "birthday",
    XMAS: "christmas",
    NEWYEAR: "new_year",
    EASTER: "orthodox_easter",
    TMPL: "custom_date",
  }
  return prefixMap[match[1]] ?? null
}

function isAutoCoupon(code: string): boolean {
  return AUTO_COUPON_PATTERN.test(code)
}

function getCouponStatus(coupon: Coupon): "active" | "expired" | "inactive" {
  if (!coupon.active) return "inactive"
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return "expired"
  if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) return "inactive"
  return "active"
}

function getStatusBadgeClass(status: "active" | "expired" | "inactive"): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/20 text-emerald-400"
    case "expired":
      return "bg-red-500/20 text-red-400"
    case "inactive":
      return "bg-gray-500/20 text-gray-400"
  }
}

function formatCurrency(value: number | string, currency: string): string {
  const symbols: Record<string, string> = { EUR: "\u20ac" }
  const symbol = symbols[currency] || currency
  const num = typeof value === "string" ? parseFloat(value) : value
  return `${symbol}${num.toFixed(2)}`
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toISOString().split("T")[0]
}

export default function CouponsPage() {
  const t = useTranslations("admin.coupons")
  const tAdmin = useTranslations("admin")
  const { can } = useAdminPermissions()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const LIMIT = 20

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filter or search changes
  useEffect(() => { setPage(1) }, [filter, debouncedSearch])

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(LIMIT))
    if (filter === "auto") {
      params.set("source", "auto")
    } else if (filter !== "all") {
      params.set("status", filter)
    }
    if (debouncedSearch) params.set("search", debouncedSearch)
    const res = await fetch(`/api/admin/coupons?${params.toString()}`)
    const data = await res.json()
    setCoupons(Array.isArray(data.coupons) ? data.coupons : [])
    setTotalItems(data.total ?? 0)
    setTotalPages(data.totalPages ?? 1)
    setLoading(false)
  }, [page, filter, debouncedSearch])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  // Deep link: open edit form when ?edit=<id> is present
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId || showForm) return
    // Try to find in current page first
    const item = coupons.find((c) => c.id === editId)
    if (item) {
      setEditingCoupon(item)
      setShowForm(true)
      window.history.replaceState({}, "", "/admin/coupons")
      return
    }
    // Not on current page — fetch the specific coupon by searching for it
    if (coupons.length > 0) {
      fetch(`/api/admin/coupons?page=1&limit=1&search=${encodeURIComponent(editId)}`)
        .then(r => r.json())
        .then(data => {
          const found = data.coupons?.[0]
          if (found) {
            setEditingCoupon(found)
            setShowForm(true)
            window.history.replaceState({}, "", "/admin/coupons")
          }
        })
        .catch(() => {})
    }
  }, [searchParams, coupons, showForm])

  const handleCopyCode = (coupon: Coupon) => {
    navigator.clipboard.writeText(coupon.code)
    setCopiedId(coupon.id)
    toast.success(t("copiedCode"))
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSubmit = async (data: CouponFormData) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/coupons", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("saveFailed"))
      return
    }

    setShowForm(false)
    setEditingCoupon(null)
    toast.success(data.id ? t("savedSuccess") : t("createdSuccess"))
    fetchCoupons()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/coupons?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("couponInUse"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchCoupons()
  }

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: "all", label: t("all") },
    { key: "active", label: t("active") },
    { key: "expired", label: t("expired") },
    { key: "inactive", label: t("inactive") },
    { key: "auto", label: t("autoGenerated") },
  ]

  const columns = [
    {
      key: "code",
      header: t("code"),
      className: "whitespace-nowrap min-w-[120px]",
      render: (item: Coupon) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-emerald-400 font-medium">{item.code}</span>
          {item.showOnProduct && (
            <span title={t("showOnProduct")}><Megaphone className="w-3.5 h-3.5 text-amber-400" /></span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopyCode(item)
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={t("copyCode")}
          >
            {copiedId === item.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "source",
      header: t("source"),
      className: "whitespace-nowrap w-[110px] hidden sm:table-cell",
      render: (item: Coupon) => {
        const autoType = getAutoCouponType(item.code)
        if (autoType) {
          const iconMap: Record<string, typeof Cake> = {
            birthday: Cake,
            christmas: Gift,
            new_year: Gift,
            orthodox_easter: Gift,
            custom_date: Zap,
          }
          const labelMap: Record<string, string> = {
            birthday: t("autoBirthday"),
            christmas: t("autoChristmas"),
            new_year: t("autoNewYear"),
            orthodox_easter: t("autoEaster"),
            custom_date: t("autoCustom"),
          }
          const Icon = iconMap[autoType] || Zap
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
              <Icon className="w-3 h-3" />
              {labelMap[autoType]}
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            {t("manual")}
          </span>
        )
      },
    },
    {
      key: "type",
      header: t("type"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: Coupon) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            item.type === "percentage"
              ? "bg-purple-500/20 text-purple-400"
              : "bg-cyan-500/20 text-cyan-400"
          }`}
        >
          {item.type === "percentage" ? (
            <Percent className="w-3 h-3" />
          ) : (
            <DollarSign className="w-3 h-3" />
          )}
          {item.type === "percentage" ? t("percentage") : t("fixedAmount")}
        </span>
      ),
    },
    {
      key: "value",
      header: t("value"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: Coupon) => (
        <span className="text-white font-medium text-sm">
          {item.type === "percentage"
            ? `${item.value}%`
            : formatCurrency(item.value, item.currency)}
        </span>
      ),
    },
    {
      key: "usage",
      header: t("usage"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: Coupon) => (
        <span className="text-gray-300 text-sm">
          {item.usedCount} / {item.maxUses ?? "\u221e"}
        </span>
      ),
    },
    {
      key: "products",
      header: t("products"),
      className: "whitespace-nowrap w-[150px] hidden md:table-cell",
      render: (item: Coupon) => {
        const hasProducts = item.productIds?.length > 0
        const hasCategories = item.categoryIds?.length > 0
        const hasBrands = item.brandIds?.length > 0
        if (!hasProducts && !hasCategories && !hasBrands) {
          return (
            <span className="text-gray-400 text-xs flex items-center gap-1">
              <Package className="w-3 h-3" />
              {t("allProducts")}
            </span>
          )
        }
        return (
          <div className="flex flex-wrap gap-1">
            {hasProducts && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                {t("selectedProducts", { count: item.productIds.length })}
              </span>
            )}
            {hasCategories && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400" title={(item.categoryNames ?? item.categoryIds).join(", ")}>
                {item.categoryIds.length} {t("categories")}
              </span>
            )}
            {hasBrands && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400" title={(item.brandNames ?? item.brandIds).join(", ")}>
                {item.brandIds.length} {t("brands")}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "allowOnSale",
      header: t("allowOnSale"),
      className: "whitespace-nowrap w-[80px] hidden lg:table-cell",
      render: (item: Coupon) =>
        item.allowOnSale ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <X className="w-4 h-4 text-gray-500" />
        ),
    },
    {
      key: "status",
      header: t("status"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: Coupon) => {
        const status = getCouponStatus(item)
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}
          >
            {t(status)}
          </span>
        )
      },
    },
    {
      key: "dates",
      header: t("startsAt"),
      className: "whitespace-nowrap min-w-[160px] hidden xl:table-cell",
      render: (item: Coupon) => (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{formatDateShort(item.startsAt)}</span>
          <span className="text-gray-600">\u2192</span>
          <span>{formatDateShort(item.expiresAt)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      render: (item: Coupon) => (
        <div className="flex items-center gap-1">
          {can("coupons", "edit") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingCoupon(item)
                setShowForm(true)
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={t("editCoupon")}
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("coupons", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.code)
              }}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      ),
    },
  ]

  // No-permission view
  if (!can("coupons", "view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">{t("noPermission")}</h2>
          <p className="text-sm text-gray-400 mt-1">{tAdmin("noPermissionDesc")}</p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white transition-colors"
        >
          {tAdmin("backToDashboard")}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Ticket className="w-7 h-7 text-emerald-400" />
            {t("title")}
          </h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">{t("subtitle")}</p>
        </div>
        {can("coupons", "create") && (
          <button
            onClick={() => {
              setEditingCoupon(null)
              setShowForm(true)
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm sm:text-base hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("createCoupon")}
          </button>
        )}
      </div>

      {/* Search + total count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!loading && (
          <span className="text-sm text-slate-400 shrink-0">
            {totalItems} {t("totalCount")}
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === tab.key
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonDataTable columns={8} />
      ) : (
        <DataTable
          data={coupons}
          columns={columns}
          emptyMessage={<div className="flex flex-col items-center gap-2"><p className="text-gray-400">{t("noCoupons")}</p><p className="text-xs text-gray-600">Create discount codes to boost sales</p></div>}
          renderMobileCard={(item: Coupon) => {
            const status = getCouponStatus(item)
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm text-emerald-400 font-medium truncate">{item.code}</span>
                    {isAutoCoupon(item.code) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 shrink-0">
                        {t("auto")}
                      </span>
                    )}
                    {item.showOnProduct && (
                      <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyCode(item) }}
                      className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusBadgeClass(status)}`}>
                    {t(status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.type === "percentage" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    {item.type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                    {item.type === "percentage" ? `${item.value}%` : formatCurrency(item.value, item.currency)}
                  </span>
                  <span className="text-xs text-gray-300">
                    {item.usedCount} / {item.maxUses ?? "\u221e"}
                  </span>
                  {item.productIds?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                      {t("selectedProducts", { count: item.productIds.length })}
                    </span>
                  )}
                  {item.categoryIds?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                      {item.categoryIds.length} {t("categories")}
                    </span>
                  )}
                  {item.brandIds?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400">
                      {item.brandIds.length} {t("brands")}
                    </span>
                  )}
                </div>
                {(item.startsAt || item.expiresAt) && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{formatDateShort(item.startsAt)}</span>
                    <span className="text-gray-600">{"\u2192"}</span>
                    <span>{formatDateShort(item.expiresAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  {can("coupons", "edit") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCoupon(item); setShowForm(true) }}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {can("coupons", "delete") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.code) }}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </>
            )
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 py-2">
          <p className="text-sm text-slate-400">
            {t("pageInfo", { page, totalPages, total: totalItems })}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← {t("prev")}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("next")} →
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <CouponForm
          initialData={editingCoupon || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingCoupon(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { code: deleteItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}

// ─── Inline CouponForm Component ─────────────────────────────────────────────

function CouponForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: Coupon
  onSubmit: (data: CouponFormData) => Promise<void>
  onCancel: () => void
}) {
  const t = useTranslations("admin.coupons")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CouponFormData>({
    id: initialData?.id,
    code: initialData?.code ?? "",
    type: initialData?.type ?? "percentage",
    value: initialData?.value ?? 0,
    currency: initialData?.currency ?? "EUR",
    minPurchase: initialData?.minPurchase ?? null,
    maxUses: initialData?.maxUses ?? null,
    perUserLimit: initialData?.perUserLimit ?? 1,
    productIds: initialData?.productIds ?? [],
    categoryIds: (initialData as Coupon | undefined)?.categoryIds ?? [],
    brandIds: (initialData as Coupon | undefined)?.brandIds ?? [],
    allowOnSale: initialData?.allowOnSale ?? false,
    showOnProduct: initialData?.showOnProduct ?? false,
    active: initialData?.active ?? true,
    startsAt: initialData?.startsAt ?? null,
    expiresAt: initialData?.expiresAt ?? null,
  })

  // Product search state
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<ProductOption[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productDropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load selected products on mount if editing
  useEffect(() => {
    if (initialData?.productIds && initialData.productIds.length > 0) {
      loadSelectedProducts(initialData.productIds)
    }
  }, [])

  // Close product dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  const loadSelectedProducts = async (ids: string[]) => {
    try {
      const res = await fetch(`/api/admin/products?ids=${ids.join(",")}`)
      if (res.ok) {
        const data = await res.json()
        const products = Array.isArray(data) ? data : []
        setSelectedProducts(
          products.map((p: ProductOption & Record<string, unknown>) => ({
            id: p.id,
            nameEn: p.nameEn,
            nameBg: p.nameBg,
            image: p.image,
          }))
        )
      }
    } catch {
      // Silently fail — products will show as IDs
    }
  }

  // Category picker state
  const [allCategoriesData, setAllCategoriesData] = useState<CategoryOption[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState("")
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Brand picker state
  const [allBrandsData, setAllBrandsData] = useState<BrandOption[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [brandSearch, setBrandSearch] = useState("")
  const brandDropdownRef = useRef<HTMLDivElement>(null)

  // Close category/brand dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false)
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const loadCategories = useCallback(async () => {
    if (categoriesLoaded) return
    try {
      const res = await fetch("/api/categories")
      if (res.ok) {
        const data = await res.json()
        setAllCategoriesData(Array.isArray(data) ? data : [])
        setCategoriesLoaded(true)
      }
    } catch { /* ignore */ }
  }, [categoriesLoaded])

  const loadBrands = useCallback(async () => {
    if (brandsLoaded) return
    try {
      const res = await fetch("/api/admin/brands")
      if (res.ok) {
        const data = await res.json()
        setAllBrandsData(Array.isArray(data) ? data : [])
        setBrandsLoaded(true)
      }
    } catch { /* ignore */ }
  }, [brandsLoaded])

  // Auto-load brands/categories when editing a coupon that already has selections
  useEffect(() => {
    if (formData.brandIds.length > 0) loadBrands()
    if (formData.categoryIds.length > 0) loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpandParent = (slug: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const toggleCategory = (slug: string) => {
    const parent = allCategoriesData.find(c => c.slug === slug)
    const childSlugs = parent?.children?.map(c => c.slug) ?? []
    const isSelecting = !formData.categoryIds.includes(slug)

    setFormData(prev => {
      if (isSelecting) {
        const toAdd = [slug, ...childSlugs].filter(s => !prev.categoryIds.includes(s))
        return { ...prev, categoryIds: [...prev.categoryIds, ...toAdd] }
      } else {
        const toRemove = new Set([slug, ...childSlugs])
        return { ...prev, categoryIds: prev.categoryIds.filter(s => !toRemove.has(s)) }
      }
    })

    // Auto-expand parent when selecting so user sees checked children
    if (isSelecting && childSlugs.length > 0) {
      setExpandedParents(prev => new Set([...prev, slug]))
    }
  }

  const removeCategory = (slug: string) => {
    const parent = allCategoriesData.find(c => c.slug === slug)
    const childSlugs = parent?.children?.map(c => c.slug) ?? []
    const toRemove = new Set([slug, ...childSlugs])
    setFormData(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(s => !toRemove.has(s)) }))
  }

  const toggleBrand = (id: string) => {
    setFormData(prev => ({
      ...prev,
      brandIds: prev.brandIds.includes(id)
        ? prev.brandIds.filter(i => i !== id)
        : [...prev.brandIds, id],
    }))
  }

  const removeBrand = (id: string) => {
    setFormData(prev => ({ ...prev, brandIds: prev.brandIds.filter(i => i !== id) }))
  }

  // All products cache (loaded once on first dropdown open)
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const allProductsLoadedRef = useRef(false)

  const loadAllProducts = useCallback(async () => {
    if (allProductsLoadedRef.current) return
    setSearchingProducts(true)
    try {
      const res = await fetch("/api/admin/products")
      if (res.ok) {
        const data = await res.json()
        const products = Array.isArray(data) ? data : []
        const mapped = products.map((p: ProductOption & Record<string, unknown>) => ({
          id: p.id,
          nameEn: p.nameEn,
          nameBg: p.nameBg,
          image: p.image,
          sku: (p.sku as string | null | undefined) ?? null,
        }))
        setAllProducts(mapped)
        setProductResults(mapped)
        allProductsLoadedRef.current = true
      }
    } catch {
      setProductResults([])
    } finally {
      setSearchingProducts(false)
    }
  }, [])

  const searchProducts = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (!query.trim()) {
        // Show all products when search is empty
        if (allProductsLoadedRef.current) {
          setProductResults(allProducts)
        }
        return
      }
      searchTimeoutRef.current = setTimeout(async () => {
        setSearchingProducts(true)
        try {
          const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}`)
          if (res.ok) {
            const data = await res.json()
            const products = Array.isArray(data) ? data : []
            setProductResults(
              products.slice(0, 20).map((p: ProductOption & Record<string, unknown>) => ({
                id: p.id,
                nameEn: p.nameEn,
                nameBg: p.nameBg,
                image: p.image,
                sku: (p.sku as string | null | undefined) ?? null,
              }))
            )
          }
        } catch {
          setProductResults([])
        } finally {
          setSearchingProducts(false)
        }
      }, 300)
    },
    [allProducts]
  )

  const toggleProduct = (product: ProductOption) => {
    const isSelected = formData.productIds.includes(product.id)
    if (isSelected) {
      setFormData((prev) => ({
        ...prev,
        productIds: prev.productIds.filter((id) => id !== product.id),
      }))
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id))
    } else {
      setFormData((prev) => ({
        ...prev,
        productIds: [...prev.productIds, product.id],
      }))
      setSelectedProducts((prev) => [...prev, product])
    }
  }

  const removeProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.filter((id) => id !== productId),
    }))
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const updateField = (field: keyof CouponFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const isEditing = !!initialData?.id

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border border-white/10 w-full max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d0d1a] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? t("editCoupon") : t("createCoupon")}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* Code + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("code")}
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                readOnly={isEditing}
                required
                placeholder="SUMMER2025"
                className={`w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors ${
                  isEditing ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("type")}
              </label>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => updateField("type", "percentage")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                    formData.type === "percentage"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <Percent className="w-4 h-4" />
                  {t("percentage")}
                </button>
                <button
                  type="button"
                  onClick={() => updateField("type", "fixed")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                    formData.type === "fixed"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  {t("fixedAmount")}
                </button>
              </div>
            </div>
          </div>

          {/* Value + Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("value")}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.value || ""}
                  onChange={(e) => updateField("value", parseFloat(e.target.value) || 0)}
                  required
                  min={0}
                  max={formData.type === "percentage" ? 100 : undefined}
                  step="any"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {formData.type === "percentage" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                )}
              </div>
            </div>
            {formData.type === "fixed" && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("currency")}
                </label>
                <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium">
                  € EUR
                </div>
              </div>
            )}
          </div>

          {/* Min Purchase + Max Uses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("minPurchase")}
              </label>
              <input
                type="number"
                value={formData.minPurchase ?? ""}
                onChange={(e) =>
                  updateField("minPurchase", e.target.value ? parseFloat(e.target.value) : null)
                }
                min={0}
                step="any"
                placeholder="0.00"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("maxUses")}
                <span className="text-gray-600 font-normal ml-1">({t("unlimited")})</span>
              </label>
              <input
                type="number"
                value={formData.maxUses ?? ""}
                onChange={(e) =>
                  updateField("maxUses", e.target.value ? parseInt(e.target.value) : null)
                }
                min={0}
                placeholder={t("unlimited")}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Per-user Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("perUserLimit")}
              </label>
              <input
                type="number"
                value={formData.perUserLimit}
                onChange={(e) => updateField("perUserLimit", parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Product Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("products")}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t("allProducts")} — {t("selectedProducts", { count: formData.productIds.length })}
            </p>

            {/* Selected Product Tags */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedProducts.map((product) => (
                  <span
                    key={product.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    {product.nameEn}
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative" ref={productDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    const val = e.target.value
                    setProductSearch(val)
                    if (!val.trim() && allProductsLoadedRef.current) {
                      setProductResults(allProducts)
                    } else {
                      searchProducts(val)
                    }
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => {
                    setShowProductDropdown(true)
                    if (!allProductsLoadedRef.current) {
                      loadAllProducts()
                    } else if (!productSearch.trim()) {
                      setProductResults(allProducts)
                    }
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-9 pr-9 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {searchingProducts ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                ) : productSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch("")
                      setProductResults([])
                      setShowProductDropdown(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showProductDropdown && (productResults.length > 0 || searchingProducts) && (
                <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                  {/* Select All / Deselect All */}
                  {productResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allResultIds = productResults.map(p => p.id)
                        const allSelected = allResultIds.every(id => formData.productIds.includes(id))
                        if (allSelected) {
                          // Deselect all visible results
                          setFormData(prev => ({
                            ...prev,
                            productIds: prev.productIds.filter(id => !allResultIds.includes(id)),
                          }))
                          setSelectedProducts(prev => prev.filter(p => !allResultIds.includes(p.id)))
                        } else {
                          // Select all visible results
                          const newIds = allResultIds.filter(id => !formData.productIds.includes(id))
                          const newProducts = productResults.filter(p => !formData.productIds.includes(p.id))
                          setFormData(prev => ({
                            ...prev,
                            productIds: [...prev.productIds, ...newIds],
                          }))
                          setSelectedProducts(prev => [...prev, ...newProducts])
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium border-b border-white/10 hover:bg-white/5 transition-colors text-emerald-400"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          productResults.length > 0 && productResults.every(p => formData.productIds.includes(p.id))
                            ? "bg-emerald-500 border-emerald-500"
                            : productResults.some(p => formData.productIds.includes(p.id))
                              ? "bg-emerald-500/50 border-emerald-500"
                              : "border-white/20"
                        }`}
                      >
                        {productResults.length > 0 && productResults.every(p => formData.productIds.includes(p.id)) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                        {productResults.some(p => formData.productIds.includes(p.id)) && !productResults.every(p => formData.productIds.includes(p.id)) && (
                          <div className="w-2 h-0.5 bg-white rounded" />
                        )}
                      </div>
                      <span>
                        {productResults.every(p => formData.productIds.includes(p.id))
                          ? t("deselectAll")
                          : t("selectAll")}
                        {" "}({productResults.length})
                      </span>
                    </button>
                  )}
                  {productResults.map((product) => {
                    const isSelected = formData.productIds.includes(product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors ${
                          isSelected ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-white/20"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {product.image && (
                          <img
                            src={product.image}
                            alt=""
                            className="w-6 h-6 rounded object-cover shrink-0"
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-300 truncate">{product.nameEn}</span>
                          {product.sku && (
                            <span className="text-xs text-slate-500 font-mono truncate">{product.sku}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {searchingProducts && productResults.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {t("categories")}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t("categoriesHint")}</p>

            {/* Selected Category Tags */}
            {formData.categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.categoryIds.map((slug) => {
                  const flat = allCategoriesData.flatMap(c => [c, ...(c.children ?? [])])
                  const cat = flat.find(c => c.slug === slug)
                  return (
                    <span key={slug} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/20">
                      <FolderOpen className="w-3 h-3" />
                      {cat?.nameEn ?? slug}
                      <button type="button" onClick={() => removeCategory(slug)} className="hover:text-white transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Category Dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => { setShowCategoryDropdown(v => !v); loadCategories() }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors text-left"
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                {formData.categoryIds.length > 0
                  ? t("selectedCategories", { count: formData.categoryIds.length })
                  : t("searchCategories")}
              </button>
              {showCategoryDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                  <div className="p-2 border-b border-white/10">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      placeholder={t("searchCategories")}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      autoFocus
                    />
                  </div>
                  {allCategoriesData
                    .filter(cat =>
                      !categorySearch ||
                      cat.nameEn.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      cat.nameBg.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      cat.children?.some(c =>
                        c.nameEn.toLowerCase().includes(categorySearch.toLowerCase()) ||
                        c.nameBg.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                    )
                    .map(cat => (
                      <div key={cat.slug}>
                        {/* Parent row */}
                        <div
                          onClick={() => { if (cat.children?.length) toggleExpandParent(cat.slug) }}
                          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${cat.children?.length ? "cursor-pointer hover:bg-white/5" : ""} ${formData.categoryIds.includes(cat.slug) ? "bg-purple-500/10" : ""}`}
                        >
                          <div
                            role="checkbox"
                            aria-checked={formData.categoryIds.includes(cat.slug)}
                            onClick={e => { e.stopPropagation(); toggleCategory(cat.slug) }}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${formData.categoryIds.includes(cat.slug) ? "bg-purple-500 border-purple-500" : "border-white/20"}`}
                          >
                            {formData.categoryIds.includes(cat.slug) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <FolderOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-gray-200 font-medium truncate flex-1">{cat.nameEn}</span>
                          {cat.children && cat.children.length > 0 && (
                            <>
                              <span className="text-xs text-gray-500 shrink-0">({cat.children.length})</span>
                              {expandedParents.has(cat.slug)
                                ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              }
                            </>
                          )}
                        </div>
                        {/* Children rows — shown when expanded or search is active */}
                        {(expandedParents.has(cat.slug) || !!categorySearch) && cat.children?.filter(c =>
                          !categorySearch ||
                          c.nameEn.toLowerCase().includes(categorySearch.toLowerCase()) ||
                          c.nameBg.toLowerCase().includes(categorySearch.toLowerCase())
                        ).map(child => (
                          <button
                            key={child.slug}
                            type="button"
                            onClick={() => toggleCategory(child.slug)}
                            className={`w-full flex items-center gap-3 pl-7 pr-3 py-2 text-left text-sm hover:bg-white/5 transition-colors ${formData.categoryIds.includes(child.slug) ? "bg-purple-500/10" : ""}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${formData.categoryIds.includes(child.slug) ? "bg-purple-500 border-purple-500" : "border-white/20"}`}>
                              {formData.categoryIds.includes(child.slug) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-gray-300 truncate">{child.nameEn}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Brand Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {t("brands")}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t("brandsHint")}</p>

            {/* Selected Brand Tags */}
            {formData.brandIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.brandIds.map((id) => {
                  const brand = allBrandsData.find(b => b.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400 border border-teal-500/20">
                      {brand?.image ? (
                        <img src={brand.image} alt="" className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <Store className="w-3 h-3" />
                      )}
                      {brand?.nameEn ?? id}
                      <button type="button" onClick={() => removeBrand(id)} className="hover:text-white transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Brand Dropdown */}
            <div className="relative" ref={brandDropdownRef}>
              <button
                type="button"
                onClick={() => { setShowBrandDropdown(v => !v); loadBrands() }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors text-left"
              >
                <Store className="w-4 h-4 shrink-0" />
                {formData.brandIds.length > 0
                  ? t("selectedBrands", { count: formData.brandIds.length })
                  : t("searchBrands")}
              </button>
              {showBrandDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                  <div className="p-2 border-b border-white/10">
                    <input
                      type="text"
                      value={brandSearch}
                      onChange={e => setBrandSearch(e.target.value)}
                      placeholder={t("searchBrands")}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
                      autoFocus
                    />
                  </div>
                  {allBrandsData
                    .filter(b =>
                      !brandSearch ||
                      b.nameEn.toLowerCase().includes(brandSearch.toLowerCase()) ||
                      b.nameBg.toLowerCase().includes(brandSearch.toLowerCase())
                    )
                    .map(brand => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => toggleBrand(brand.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors ${formData.brandIds.includes(brand.id) ? "bg-teal-500/10" : ""}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${formData.brandIds.includes(brand.id) ? "bg-teal-500 border-teal-500" : "border-white/20"}`}>
                          {formData.brandIds.includes(brand.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {brand.image ? (
                          <img src={brand.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                        ) : (
                          <Store className="w-5 h-5 text-gray-500 shrink-0" />
                        )}
                        <span className="text-gray-300 truncate">{brand.nameEn}</span>
                        {brand._count?.products !== undefined && (
                          <span className="text-xs text-gray-500 ml-auto shrink-0">{brand._count.products}</span>
                        )}
                      </button>
                    ))}
                  {!brandsLoaded && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Toggles: Allow on Sale + Show on Product + Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowOnSale"
                checked={formData.allowOnSale}
                onChange={(e) => updateField("allowOnSale", e.target.checked)}
                className="w-5 h-5 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
              />
              <div>
                <label htmlFor="allowOnSale" className="text-sm text-gray-300 cursor-pointer">
                  {t("allowOnSale")}
                </label>
                <p className="text-xs text-gray-500">{t("allowOnSaleHint")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showOnProduct"
                checked={formData.showOnProduct}
                onChange={(e) => updateField("showOnProduct", e.target.checked)}
                className="w-5 h-5 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
              />
              <div>
                <label htmlFor="showOnProduct" className="text-sm text-gray-300 cursor-pointer">
                  {t("showOnProduct")}
                </label>
                <p className="text-xs text-gray-500">{t("showOnProductHint")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="w-5 h-5 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
              />
              <label htmlFor="active" className="text-sm text-gray-300 cursor-pointer">
                {t("active")}
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("startsAt")}
              </label>
              <input
                type="date"
                value={toDateInputValue(formData.startsAt)}
                onChange={(e) =>
                  updateField("startsAt", e.target.value ? new Date(e.target.value).toISOString() : null)
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("expiresAt")}
              </label>
              <input
                type="date"
                value={toDateInputValue(formData.expiresAt)}
                onChange={(e) =>
                  updateField("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Ticket className="w-5 h-5" />
              )}
              {t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
