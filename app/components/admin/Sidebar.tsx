"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  LogOut,
  Settings,
  Menu,
  Tag,
  Package,
  MessageSquare,
  Presentation,
  Shield,
} from "lucide-react"
import type { PermissionMap } from "@/lib/permissions"

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  role: string
  visibleNavHrefs: string[]
  permissions: PermissionMap
}

const allNavItems = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/admin/menu", icon: Menu, labelKey: "menu" },
  { href: "/admin/content", icon: FileText, labelKey: "content" },
  { href: "/admin/banners", icon: Presentation, labelKey: "banners" },
  { href: "/admin/types", icon: Tag, labelKey: "types" },
  { href: "/admin/products", icon: Package, labelKey: "products" },
  { href: "/admin/quotes", icon: MessageSquare, labelKey: "quotes", showBadge: true },
  { href: "/admin/orders", icon: ShoppingCart, labelKey: "orders" },
  { href: "/admin/users", icon: Users, labelKey: "users" },
  { href: "/admin/roles", icon: Shield, labelKey: "roles" },
]

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
  EDITOR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  AUTHOR: "bg-green-500/20 text-green-400 border-green-500/30",
}

export function Sidebar({ user, role, visibleNavHrefs }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("admin.nav")
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0)

  const navItems = allNavItems.filter((item) => visibleNavHrefs.includes(item.href))

  useEffect(() => {
    // Only fetch quotes if user can see quotes
    if (!visibleNavHrefs.includes("/admin/quotes")) return

    async function fetchPendingQuotes() {
      try {
        const res = await fetch("/api/admin/quotes?status=pending")
        if (res.ok) {
          const quotes = await res.json()
          setPendingQuotesCount(Array.isArray(quotes) ? quotes.length : 0)
        }
      } catch {
        // Ignore errors
      }
    }
    fetchPendingQuotes()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingQuotes, 30000)
    // Listen for quote updates
    const handleQuoteUpdate = () => fetchPendingQuotes()
    window.addEventListener("quoteUpdated", handleQuoteUpdate)
    return () => {
      clearInterval(interval)
      window.removeEventListener("quoteUpdated", handleQuoteUpdate)
    }
  }, [visibleNavHrefs])

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-strong border-r border-white/10 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Digital4D</h1>
            <p className="text-xs text-gray-400">{t("adminPanel")}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          const showBadge = item.showBadge && pendingQuotesCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium flex-1">{t(item.labelKey)}</span>
              {showBadge && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                  {pendingQuotesCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name || "Admin"}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="px-4 mb-3">
          <span
            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
              ROLE_BADGE_COLORS[role] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
            }`}
          >
            {role}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t("logout")}</span>
        </button>
      </div>
    </aside>
  )
}
