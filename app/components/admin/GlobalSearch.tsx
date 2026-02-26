"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAdminPermissions } from "./AdminPermissionsContext"
import {
  Search,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  Tag,
  Package,
  MessageSquare,
  Presentation,
  Shield,
  ScrollText,
  Menu as MenuIcon,
  CornerDownLeft,
} from "lucide-react"

// Lightweight types for search results
interface SearchProduct {
  id: string; nameEn: string; nameBg: string; nameEs: string
  sku: string | null; slug: string
}
interface SearchContent {
  id: string; titleEn: string; titleBg: string; titleEs: string
  type: string; slug: string | null
}
interface SearchOrder {
  id: string; orderNumber: string; customerName: string
  customerEmail: string; status: string
}
interface SearchQuote {
  id: string; quoteNumber: string; name: string
  email: string; status: string
}
interface SearchUser {
  id: string; name: string | null; email: string; role: string
}
interface SearchMenuItem {
  id: string; titleEn: string; titleBg: string; titleEs: string
  slug: string; type: string
}
interface SearchType {
  id: string; nameEn: string; nameBg: string; nameEs: string
  slug: string; color: string
}

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: string
}

const PAGE_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "dashboard", resource: "dashboard" },
  { href: "/admin/menu", icon: MenuIcon, labelKey: "menu", resource: "menu" },
  { href: "/admin/content", icon: FileText, labelKey: "content", resource: "content" },
  { href: "/admin/banners", icon: Presentation, labelKey: "banners", resource: "banners" },
  { href: "/admin/types", icon: Tag, labelKey: "types", resource: "types" },
  { href: "/admin/products", icon: Package, labelKey: "products", resource: "products" },
  { href: "/admin/quotes", icon: MessageSquare, labelKey: "quotes", resource: "quotes" },
  { href: "/admin/orders", icon: ShoppingCart, labelKey: "orders", resource: "orders" },
  { href: "/admin/users", icon: Users, labelKey: "users", resource: "users" },
  { href: "/admin/roles", icon: Shield, labelKey: "roles", resource: "roles" },
  { href: "/admin/audit-logs", icon: ScrollText, labelKey: "auditLogs", resource: "audit" },
]

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function GlobalSearch() {
  const router = useRouter()
  const t = useTranslations("admin.search")
  const tNav = useTranslations("admin.nav")
  const { can } = useAdminPermissions()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const [dataCache, setDataCache] = useState<{
    products: SearchProduct[] | null
    content: SearchContent[] | null
    orders: SearchOrder[] | null
    quotes: SearchQuote[] | null
    users: SearchUser[] | null
    menu: SearchMenuItem[] | null
    types: SearchType[] | null
  }>({
    products: null,
    content: null,
    orders: null,
    quotes: null,
    users: null,
    menu: null,
    types: null,
  })

  const lastFetchRef = useRef<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setActiveIndex(0)
    }
  }, [open])

  // Fetch data on open
  const fetchData = useCallback(async () => {
    if (dataCache.products !== null && Date.now() - lastFetchRef.current < CACHE_TTL) return

    setLoading(true)
    // Reset cache
    setDataCache({ products: null, content: null, orders: null, quotes: null, users: null, menu: null, types: null })

    const fetchers: Promise<void>[] = []

    const fetchEndpoint = <T,>(
      resource: string,
      url: string,
      key: keyof typeof dataCache
    ) => {
      if (can(resource, "view")) {
        fetchers.push(
          fetch(url)
            .then(r => r.json())
            .then((data: T[]) => {
              setDataCache(prev => ({ ...prev, [key]: Array.isArray(data) ? data : [] }))
            })
            .catch(() => {
              setDataCache(prev => ({ ...prev, [key]: [] }))
            })
        )
      } else {
        setDataCache(prev => ({ ...prev, [key]: [] }))
      }
    }

    fetchEndpoint<SearchProduct>("products", "/api/admin/products", "products")
    fetchEndpoint<SearchContent>("content", "/api/admin/content", "content")
    fetchEndpoint<SearchOrder>("orders", "/api/admin/orders", "orders")
    fetchEndpoint<SearchQuote>("quotes", "/api/admin/quotes", "quotes")
    fetchEndpoint<SearchUser>("users", "/api/admin/users", "users")
    fetchEndpoint<SearchMenuItem>("menu", "/api/admin/menu", "menu")
    fetchEndpoint<SearchType>("types", "/api/admin/types", "types")

    await Promise.allSettled(fetchers)
    lastFetchRef.current = Date.now()
    setLoading(false)
  }, [can, dataCache.products])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  // Filter results
  const results = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim()
    const items: SearchResult[] = []

    // Pages section
    const pageResults = PAGE_ITEMS
      .filter(p => can(p.resource, "view"))
      .filter(p => {
        if (!q) return true
        const label = tNav(p.labelKey).toLowerCase()
        return label.includes(q) || p.href.toLowerCase().includes(q)
      })
      .map(p => ({
        id: `page-${p.href}`,
        label: tNav(p.labelKey),
        href: p.href,
        icon: p.icon,
        section: t("pages"),
      }))
    items.push(...pageResults)

    // Data section (only when query >= 2 chars)
    if (q.length >= 2) {
      // Products
      if (dataCache.products) {
        dataCache.products
          .filter(p =>
            p.nameEn.toLowerCase().includes(q) ||
            p.nameBg.toLowerCase().includes(q) ||
            p.nameEs.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach(p => items.push({
            id: `product-${p.id}`,
            label: p.nameEn,
            sublabel: p.sku || undefined,
            href: `/admin/products?edit=${p.id}`,
            icon: Package,
            section: t("products"),
          }))
      }

      // Content
      if (dataCache.content) {
        dataCache.content
          .filter(c =>
            c.titleEn.toLowerCase().includes(q) ||
            c.titleBg.toLowerCase().includes(q) ||
            c.titleEs.toLowerCase().includes(q) ||
            (c.slug && c.slug.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach(c => items.push({
            id: `content-${c.id}`,
            label: c.titleEn,
            sublabel: c.type,
            href: `/admin/content?edit=${c.id}`,
            icon: FileText,
            section: t("content"),
          }))
      }

      // Orders
      if (dataCache.orders) {
        dataCache.orders
          .filter(o =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerEmail.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach(o => items.push({
            id: `order-${o.id}`,
            label: o.customerName,
            sublabel: o.orderNumber,
            href: `/admin/orders?edit=${o.id}`,
            icon: ShoppingCart,
            section: t("orders"),
          }))
      }

      // Quotes
      if (dataCache.quotes) {
        dataCache.quotes
          .filter(q2 =>
            q2.quoteNumber.toLowerCase().includes(q) ||
            q2.name.toLowerCase().includes(q) ||
            q2.email.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach(q2 => items.push({
            id: `quote-${q2.id}`,
            label: q2.name,
            sublabel: q2.quoteNumber,
            href: `/admin/quotes?edit=${q2.id}`,
            icon: MessageSquare,
            section: t("quotes"),
          }))
      }

      // Users
      if (dataCache.users) {
        dataCache.users
          .filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            u.email.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach(u => items.push({
            id: `user-${u.id}`,
            label: u.name || u.email,
            sublabel: u.role,
            href: `/admin/users?edit=${u.id}`,
            icon: Users,
            section: t("users"),
          }))
      }

      // Menu Items
      if (dataCache.menu) {
        dataCache.menu
          .filter(m =>
            m.titleEn.toLowerCase().includes(q) ||
            m.titleBg.toLowerCase().includes(q) ||
            m.titleEs.toLowerCase().includes(q) ||
            m.slug.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach(m => items.push({
            id: `menu-${m.id}`,
            label: m.titleEn,
            sublabel: `/${m.slug}`,
            href: `/admin/menu?edit=${m.id}`,
            icon: MenuIcon,
            section: t("menuItems"),
          }))
      }

      // Content Types
      if (dataCache.types) {
        dataCache.types
          .filter(ct =>
            ct.nameEn.toLowerCase().includes(q) ||
            ct.nameBg.toLowerCase().includes(q) ||
            ct.nameEs.toLowerCase().includes(q) ||
            ct.slug.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach(ct => items.push({
            id: `type-${ct.id}`,
            label: ct.nameEn,
            sublabel: ct.slug,
            href: `/admin/types?edit=${ct.id}`,
            icon: Tag,
            section: t("types"),
          }))
      }
    }

    return items
  }, [query, dataCache, can, t, tNav])

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const navigateTo = useCallback((href: string) => {
    close()
    router.push(href)
  }, [router, close])

  // Modal keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (results[activeIndex]) {
          navigateTo(results[activeIndex].href)
        }
        break
      case "Escape":
        e.preventDefault()
        close()
        break
    }
  }

  if (!open) return null

  // Group results by section for rendering
  const sections: { name: string; items: (SearchResult & { flatIndex: number })[] }[] = []
  let flatIndex = 0
  for (const result of results) {
    let section = sections.find(s => s.name === result.section)
    if (!section) {
      section = { name: result.section, items: [] }
      sections.push(section)
    }
    section.items.push({ ...result, flatIndex })
    flatIndex++
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
      onClick={close}
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute top-[15vh] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1 bg-transparent text-white text-base placeholder-gray-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-gray-400 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading && results.length === 0 ? (
            <div className="space-y-1 px-2 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t("noResults")}</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.name}>
                <div className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {section.name}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.flatIndex === activeIndex
                  return (
                    <button
                      key={item.id}
                      ref={(el) => { resultRefs.current[item.flatIndex] = el }}
                      onClick={() => navigateTo(item.href)}
                      onMouseEnter={() => setActiveIndex(item.flatIndex)}
                      className={`flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors rounded-lg mx-2 ${
                        isActive ? "bg-white/5 text-white" : "text-gray-300 hover:bg-white/5"
                      }`}
                      style={{ width: "calc(100% - 1rem)" }}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-gray-500"}`} />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-xs text-gray-500 ml-auto shrink-0">{item.sublabel}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-mono">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-mono">↓</kbd>
            {t("navigate")}
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            {t("select")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-mono">Esc</kbd>
            {t("close")}
          </span>
        </div>
      </div>
    </div>
  )
}
