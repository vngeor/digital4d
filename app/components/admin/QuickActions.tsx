"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Package, FileText, MessageSquare, Users, Plus } from "lucide-react"
import { useAdminPermissions } from "./AdminPermissionsContext"

const actions = [
  {
    labelKey: "newProduct",
    href: "/admin/products?action=create",
    icon: Package,
    overlay: Plus,
    color: "from-emerald-500 to-emerald-600",
    permission: { resource: "products" as const, action: "create" as const },
  },
  {
    labelKey: "newContent",
    href: "/admin/content?action=create",
    icon: FileText,
    overlay: Plus,
    color: "from-cyan-500 to-cyan-600",
    permission: { resource: "content" as const, action: "create" as const },
  },
  {
    labelKey: "viewQuotes",
    href: "/admin/quotes",
    icon: MessageSquare,
    color: "from-amber-500 to-amber-600",
    permission: { resource: "quotes" as const, action: "view" as const },
  },
  {
    labelKey: "viewUsers",
    href: "/admin/users",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    permission: { resource: "users" as const, action: "view" as const },
  },
]

export function QuickActions() {
  const t = useTranslations("admin.dashboard")
  const { can } = useAdminPermissions()

  const visibleActions = actions.filter(a =>
    can(a.permission.resource, a.permission.action)
  )

  if (visibleActions.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">{t("quickActions")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleActions.map(action => {
          const Icon = action.icon
          const Overlay = action.overlay
          return (
            <Link
              key={action.labelKey}
              href={action.href}
              className="glass rounded-xl border border-white/10 p-4 flex items-center gap-3 hover:bg-white/10 hover:scale-[1.02] transition-all group"
            >
              <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
                {Overlay && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    <Overlay className="w-3 h-3 text-gray-800" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {t(action.labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
