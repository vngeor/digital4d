"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Shield, Save, Loader2, Lock, Check, X, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

type PermissionMap = Record<string, Record<string, boolean>>

const RESOURCES = [
  "dashboard",
  "products",
  "categories",
  "content",
  "types",
  "banners",
  "menu",
  "orders",
  "quotes",
  "media",
  "coupons",
  "notifications",
  "users",
  "roles",
  "audit",
] as const

const ACTIONS = ["view", "create", "edit", "delete"] as const

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: "resDashboard",
  products: "resProducts",
  categories: "resCategories",
  content: "resContent",
  types: "resTypes",
  banners: "resBanners",
  menu: "resMenu",
  orders: "resOrders",
  quotes: "resQuotes",
  users: "resUsers",
  roles: "resRoles",
  media: "resMedia",
  coupons: "resCoupons",
  notifications: "resNotifications",
  audit: "resAudit",
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-red-400",
  EDITOR: "text-blue-400",
  AUTHOR: "text-green-400",
}

export default function RolesPage() {
  const t = useTranslations("admin")
  const router = useRouter()
  const { can } = useAdminPermissions()
  const [permissions, setPermissions] = useState<Record<string, PermissionMap>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPermissions()
  }, [])

  async function fetchPermissions() {
    try {
      const res = await fetch("/api/admin/roles")
      if (res.ok) {
        const data = await res.json()
        setPermissions(data)
      }
    } catch {
      toast.error(t("roles.loadFailed"))
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(role: string, resource: string, action: string) {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [resource]: {
          ...prev[role]?.[resource],
          [action]: !prev[role]?.[resource]?.[action],
        },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      })
      if (res.ok) {
        toast.success(t("roles.saved"))
      } else {
        const data = await res.json()
        toast.error(data.error || t("roles.saveFailed"))
      }
    } catch {
      toast.error(t("roles.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (!can("roles", "view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">{t("noPermission")}</h2>
          <p className="text-sm text-gray-400 mt-1">{t("noPermissionDesc")}</p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white transition-colors"
        >
          {t("backToDashboard")}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">{t("roles.title")}</h1>
            <p className="text-xs lg:text-sm text-gray-400">{t("roles.description")}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl text-sm sm:text-base font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("roles.save")}
        </button>
      </div>

      {/* Permission Matrix */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">
                  {t("roles.resource")}
                </th>
                {/* ADMIN column — locked */}
                <th className="px-4 py-4 text-center" colSpan={4}>
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-gray-500" />
                    <span className={`text-sm font-bold ${ROLE_COLORS.ADMIN}`}>ADMIN</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t("roles.fullAccess")}</p>
                </th>
                {/* EDITOR columns */}
                <th className="px-2 py-4 text-center border-l border-white/10" colSpan={4}>
                  <span className={`text-sm font-bold ${ROLE_COLORS.EDITOR}`}>EDITOR</span>
                </th>
                {/* AUTHOR columns */}
                <th className="px-2 py-4 text-center border-l border-white/10" colSpan={4}>
                  <span className={`text-sm font-bold ${ROLE_COLORS.AUTHOR}`}>AUTHOR</span>
                </th>
              </tr>
              <tr className="border-b border-white/5">
                <th className="px-6 py-2" />
                {/* ADMIN action headers */}
                {ACTIONS.map((action) => (
                  <th key={`admin-${action}`} className="px-2 py-2 text-[10px] text-gray-500 uppercase font-medium text-center">
                    {action}
                  </th>
                ))}
                {/* EDITOR action headers */}
                {ACTIONS.map((action) => (
                  <th key={`editor-${action}`} className="px-2 py-2 text-[10px] text-gray-500 uppercase font-medium text-center border-l border-white/5 first:border-l-white/10">
                    {action}
                  </th>
                ))}
                {/* AUTHOR action headers */}
                {ACTIONS.map((action) => (
                  <th key={`author-${action}`} className="px-2 py-2 text-[10px] text-gray-500 uppercase font-medium text-center border-l border-white/5 first:border-l-white/10">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-white">
                      {t(`roles.${RESOURCE_LABELS[resource]}`)}
                    </span>
                  </td>
                  {/* ADMIN — all locked to true */}
                  {ACTIONS.map((action) => (
                    <td key={`admin-${resource}-${action}`} className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      </div>
                    </td>
                  ))}
                  {/* EDITOR — toggleable */}
                  {ACTIONS.map((action, i) => {
                    const allowed = permissions.EDITOR?.[resource]?.[action] ?? false
                    return (
                      <td key={`editor-${resource}-${action}`} className={`px-2 py-3 text-center ${i === 0 ? "border-l border-white/10" : ""}`}>
                        <button
                          onClick={() => togglePermission("EDITOR", resource, action)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            allowed
                              ? "bg-blue-500/20 hover:bg-blue-500/30"
                              : "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          {allowed ? (
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </td>
                    )
                  })}
                  {/* AUTHOR — toggleable */}
                  {ACTIONS.map((action, i) => {
                    const allowed = permissions.AUTHOR?.[resource]?.[action] ?? false
                    return (
                      <td key={`author-${resource}-${action}`} className={`px-2 py-3 text-center ${i === 0 ? "border-l border-white/10" : ""}`}>
                        <button
                          onClick={() => togglePermission("AUTHOR", resource, action)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            allowed
                              ? "bg-green-500/20 hover:bg-green-500/30"
                              : "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          {allowed ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info card */}
      <div className="mt-6 glass rounded-xl p-4">
        <p className="text-xs text-gray-400">
          <span className="text-red-400 font-semibold">ADMIN</span> {t("roles.adminNote")}
          {" • "}
          <span className="text-blue-400 font-semibold">EDITOR</span> {t("roles.editorNote")}
          {" • "}
          <span className="text-green-400 font-semibold">AUTHOR</span> {t("roles.authorNote")}
        </p>
      </div>
    </div>
  )
}
