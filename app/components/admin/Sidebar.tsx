"use client"

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
} from "lucide-react"

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/admin/menu", icon: Menu, labelKey: "menu" },
  { href: "/admin/content", icon: FileText, labelKey: "content" },
  { href: "/admin/types", icon: Tag, labelKey: "types" },
  { href: "/admin/orders", icon: ShoppingCart, labelKey: "orders" },
  { href: "/admin/users", icon: Users, labelKey: "users" },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("admin.nav")

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

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
          const Icon = item.icon

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
              <span className="font-medium">{t(item.labelKey)}</span>
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
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
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
