"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Calendar,
  ShieldOff,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface AuditUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface AuditLogEntry {
  id: string
  userId: string
  user: AuditUser
  action: string
  resource: string
  recordId: string
  recordTitle: string | null
  details: string | null
  createdAt: string
}

interface AuditResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const ACTION_STYLES: Record<string, { icon: typeof Plus; color: string }> = {
  create: { icon: Plus, color: "bg-emerald-500/20 text-emerald-400" },
  edit: { icon: Pencil, color: "bg-amber-500/20 text-amber-400" },
  delete: { icon: Trash2, color: "bg-red-500/20 text-red-400" },
}

const RESOURCE_COLORS: Record<string, string> = {
  products: "bg-purple-500/20 text-purple-400",
  content: "bg-blue-500/20 text-blue-400",
  orders: "bg-cyan-500/20 text-cyan-400",
  quotes: "bg-orange-500/20 text-orange-400",
  banners: "bg-pink-500/20 text-pink-400",
  menu: "bg-teal-500/20 text-teal-400",
  types: "bg-indigo-500/20 text-indigo-400",
  users: "bg-yellow-500/20 text-yellow-400",
  roles: "bg-red-500/20 text-red-400",
  categories: "bg-emerald-500/20 text-emerald-400",
}

const RESOURCES = [
  "products", "content", "orders", "quotes", "banners",
  "menu", "types", "users", "roles", "categories",
]

const ACTIONS = ["create", "edit", "delete"]

export default function AuditLogsPage() {
  const t = useTranslations("admin.auditLogs")
  const tAdmin = useTranslations("admin")
  const router = useRouter()
  const { can } = useAdminPermissions()

  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [resourceFilter, setResourceFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [viewingDetails, setViewingDetails] = useState<AuditLogEntry | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", "50")
      if (search) params.set("search", search)
      if (resourceFilter) params.set("resource", resourceFilter)
      if (actionFilter) params.set("action", actionFilter)
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Ignore
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [page, resourceFilter, actionFilter, dateFrom, dateTo])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchLogs()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const clearFilters = () => {
    setSearch("")
    setResourceFilter("")
    setActionFilter("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasFilters = search || resourceFilter || actionFilter || dateFrom || dateTo

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const parseDetails = (details: string | null): Record<string, { from: unknown; to: unknown }> | string | null => {
    if (!details) return null
    try {
      return JSON.parse(details)
    } catch {
      return details
    }
  }

  const isChangeRecord = (parsed: unknown): parsed is Record<string, { from: unknown; to: unknown }> => {
    if (!parsed || typeof parsed !== "object") return false
    const entries = Object.entries(parsed as Record<string, unknown>)
    if (entries.length === 0) return false
    return entries.some(([, v]) => v && typeof v === "object" && "from" in (v as Record<string, unknown>) && "to" in (v as Record<string, unknown>))
  }

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "boolean") return val ? "true" : "false"
    if (typeof val === "object") return JSON.stringify(val)
    return String(val)
  }

  const getInlineChangeSummary = (details: string | null): string | null => {
    const parsed = parseDetails(details)
    if (!parsed || !isChangeRecord(parsed)) return null
    const keys = Object.keys(parsed)
    if (keys.length === 0) return null
    if (keys.length === 1) {
      const key = keys[0]
      const change = parsed[key]
      return `${key}: ${formatValue(change.from)} → ${formatValue(change.to)}`
    }
    return `${keys.length} ${t("fieldsChanged")}`
  }

  // Map resource to admin page URL
  const RESOURCE_PAGES: Record<string, string> = {
    products: "/admin/products",
    content: "/admin/content",
    orders: "/admin/orders",
    quotes: "/admin/quotes",
    banners: "/admin/banners",
    menu: "/admin/menu",
    types: "/admin/types",
    users: "/admin/users",
    roles: "/admin/roles",
    categories: "/admin/categories",
  }

  const getResourcePageLink = (resource: string): string | null => {
    return RESOURCE_PAGES[resource] || null
  }

  // Build a deep link to the specific record (opens edit modal via ?edit=<id>)
  const getRecordLink = (log: AuditLogEntry): string | null => {
    const basePath = RESOURCE_PAGES[log.resource]
    if (!basePath) return null
    // Deleted items no longer exist — link to the resource page only
    if (log.action === "delete") return basePath
    // Roles page doesn't have per-record editing
    if (log.resource === "roles") return basePath
    return `${basePath}?edit=${log.recordId}`
  }

  if (!can("audit", "view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">{tAdmin("noPermission")}</h2>
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-emerald-400" />
            {t("title")}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t("subtitle")}</p>
        </div>
        {data && (
          <div className="text-sm text-gray-400">
            {t("totalEntries", { count: data.total })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Resource filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(1) }}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">{t("allResources")}</option>
              {RESOURCES.map((r) => (
                <option key={r} value={r}>{t(`resource_${r}`)}</option>
              ))}
            </select>
          </div>

          {/* Action filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">{t("allActions")}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{t(`action_${a}`)}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
            </div>
            <span className="text-gray-500 text-sm">—</span>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">{t("noLogs")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("timestamp")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("user")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("action")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("resource")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("record")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("details")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.logs.map((log) => {
                    const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.edit
                    const ActionIcon = actionStyle.icon
                    const resourceColor = RESOURCE_COLORS[log.resource] || "bg-gray-500/20 text-gray-400"
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {log.user.image ? (
                              <img src={log.user.image} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold">
                                {(log.user.name || log.user.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm text-white truncate max-w-[140px]">
                              {log.user.name || log.user.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionStyle.color}`}>
                            <ActionIcon className="w-3 h-3" />
                            {t(`action_${log.action}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getResourcePageLink(log.resource) ? (
                            <Link
                              href={getResourcePageLink(log.resource)!}
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${resourceColor} hover:opacity-80 transition-opacity`}
                            >
                              {t(`resource_${log.resource}`)}
                            </Link>
                          ) : (
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${resourceColor}`}>
                              {t(`resource_${log.resource}`)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                          {getRecordLink(log) ? (
                            <Link
                              href={getRecordLink(log)!}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                            >
                              {log.recordTitle || log.recordId}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-gray-300">{log.recordTitle || log.recordId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.details ? (
                            <button
                              onClick={() => setViewingDetails(log)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors text-left"
                            >
                              {getInlineChangeSummary(log.details) || t("viewDetails")}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {data.logs.map((log) => {
                const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.edit
                const ActionIcon = actionStyle.icon
                const resourceColor = RESOURCE_COLORS[log.resource] || "bg-gray-500/20 text-gray-400"
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.user.image ? (
                          <img src={log.user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold">
                            {(log.user.name || log.user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-white">{log.user.name || log.user.email}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionStyle.color}`}>
                        <ActionIcon className="w-3 h-3" />
                        {t(`action_${log.action}`)}
                      </span>
                      {getResourcePageLink(log.resource) ? (
                        <Link
                          href={getResourcePageLink(log.resource)!}
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${resourceColor} hover:opacity-80 transition-opacity`}
                        >
                          {t(`resource_${log.resource}`)}
                        </Link>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${resourceColor}`}>
                          {t(`resource_${log.resource}`)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm truncate">
                      {getRecordLink(log) ? (
                        <Link
                          href={getRecordLink(log)!}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                        >
                          {log.recordTitle || log.recordId}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-gray-300">{log.recordTitle || log.recordId}</span>
                      )}
                    </div>
                    {log.details && (
                      <button
                        onClick={() => setViewingDetails(log)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        {t("viewDetails")}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <span className="text-sm text-gray-400">
                  {t("pageInfo", { page: data.page, total: data.totalPages })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingDetails(null)}>
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{t("detailsTitle")}</h3>
              <button onClick={() => setViewingDetails(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">{t("user")}</span>
                  <p className="text-white">{viewingDetails.user.name || viewingDetails.user.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("timestamp")}</span>
                  <p className="text-white">{formatDate(viewingDetails.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("action")}</span>
                  <p className="text-white capitalize">{t(`action_${viewingDetails.action}`)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("resource")}</span>
                  {getResourcePageLink(viewingDetails.resource) ? (
                    <Link href={getResourcePageLink(viewingDetails.resource)!} className="text-emerald-400 hover:text-emerald-300 transition-colors capitalize block">
                      {t(`resource_${viewingDetails.resource}`)}
                    </Link>
                  ) : (
                    <p className="text-white capitalize">{t(`resource_${viewingDetails.resource}`)}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">{t("record")}</span>
                  {getRecordLink(viewingDetails) ? (
                    <button
                      onClick={() => {
                        const link = getRecordLink(viewingDetails)
                        setViewingDetails(null)
                        if (link) router.push(link)
                      }}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                    >
                      {viewingDetails.recordTitle || viewingDetails.recordId}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <p className="text-white">{viewingDetails.recordTitle || viewingDetails.recordId}</p>
                  )}
                </div>
              </div>
              {viewingDetails.details && (() => {
                const parsed = parseDetails(viewingDetails.details)
                if (isChangeRecord(parsed)) {
                  return (
                    <div>
                      <span className="text-sm text-gray-500 block mb-2">{t("changes")}</span>
                      <div className="bg-black/40 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("field")}</th>
                              <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("fromValue")}</th>
                              <th className="px-3 py-2 text-left text-gray-500 font-medium">{t("toValue")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {Object.entries(parsed).map(([field, change]) => (
                              <tr key={field}>
                                <td className="px-3 py-2 text-emerald-400 font-mono">{field}</td>
                                <td className="px-3 py-2 text-red-400 break-all max-w-[180px]">{formatValue(change.from)}</td>
                                <td className="px-3 py-2 text-green-400 break-all max-w-[180px]">{formatValue(change.to)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                }
                return (
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">{t("changes")}</span>
                    <pre className="bg-black/40 rounded-xl p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : viewingDetails.details}
                    </pre>
                  </div>
                )
              })()}
              {getRecordLink(viewingDetails) && (
                <button
                  onClick={() => {
                    const link = getRecordLink(viewingDetails)
                    setViewingDetails(null)
                    if (link) router.push(link)
                  }}
                  className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("goToRecord")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
