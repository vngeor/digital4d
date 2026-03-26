"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Search, Package, FileText, Menu as MenuIcon, X, Clock, CornerDownLeft, ArrowRight } from "lucide-react"
import type { Locale } from "@/i18n/config"

interface SearchProduct {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  image: string | null
  price: number | null
  salePrice: number | null
  onSale: boolean
  currency: string
  priceType: string
  category: string
  fileType: string | null
}

interface SearchContent {
  id: string
  slug: string | null
  titleBg: string
  titleEn: string
  titleEs: string
  type: string
  image: string | null
  menuItemSlug: string | null
}

interface SearchMenuItem {
  id: string
  slug: string
  titleBg: string
  titleEn: string
  titleEs: string
  type: string
}

interface SearchResponse {
  products: SearchProduct[]
  content: SearchContent[]
  menu: SearchMenuItem[]
}

interface FlatResult {
  id: string
  label: string
  sublabel: string
  href: string
  icon: typeof Package
  section: string
  image: string | null
  price?: number | null
  salePrice?: number | null
  onSale?: boolean
  currency?: string
}

const RECENT_SEARCHES_KEY = "d4d-recent-searches"
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query)
    recent.unshift(query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // localStorage unavailable
  }
}

function removeRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent))
  } catch {
    // localStorage unavailable
  }
}

export function GlobalSearch() {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations("search")

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [desktopFocused, setDesktopFocused] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Locale helpers
  const getName = useCallback((item: { nameBg: string; nameEn: string; nameEs: string }) => {
    switch (locale) {
      case "bg": return item.nameBg || item.nameEn
      case "es": return item.nameEs || item.nameEn
      default: return item.nameEn
    }
  }, [locale])

  const getTitle = useCallback((item: { titleBg: string; titleEn: string; titleEs: string }) => {
    switch (locale) {
      case "bg": return item.titleBg || item.titleEn
      case "es": return item.titleEs || item.titleEn
      default: return item.titleEn
    }
  }, [locale])

  // URL resolution
  const getContentUrl = useCallback((item: SearchContent) => {
    if (item.type === "news") return `/news/${item.slug}`
    if (item.menuItemSlug) return `/${item.menuItemSlug}/${item.slug}`
    return `/news/${item.slug}`
  }, [])

  // Flatten results for keyboard navigation
  const flatResults: FlatResult[] = useMemo(() => {
    if (!results) return []
    const flat: FlatResult[] = []

    if (results.products.length > 0) {
      for (const p of results.products) {
        flat.push({
          id: p.id,
          label: getName(p),
          sublabel: p.category || p.priceType,
          href: `/products/${p.slug}`,
          icon: Package,
          section: t("products"),
          image: p.image,
          price: p.price,
          salePrice: p.salePrice,
          onSale: p.onSale,
          currency: p.currency,
        })
      }
    }

    if (results.content.length > 0) {
      for (const c of results.content) {
        flat.push({
          id: c.id,
          label: getTitle(c),
          sublabel: c.type === "news" ? t("news") : t("services"),
          href: getContentUrl(c),
          icon: FileText,
          section: c.type === "news" ? t("news") : t("services"),
          image: c.image,
        })
      }
    }

    if (results.menu.length > 0) {
      for (const m of results.menu) {
        flat.push({
          id: m.id,
          label: getTitle(m),
          sublabel: "",
          href: `/${m.slug}`,
          icon: MenuIcon,
          section: t("pages"),
          image: null,
        })
      }
    }

    return flat
  }, [results, getName, getTitle, getContentUrl, t])

  // Group flat results by section
  const sections = useMemo(() => {
    const grouped: { name: string; items: (FlatResult & { flatIndex: number })[] }[] = []
    let idx = 0
    for (const result of flatResults) {
      let section = grouped.find((s) => s.name === result.section)
      if (!section) {
        section = { name: result.section, items: [] }
        grouped.push(section)
      }
      section.items.push({ ...result, flatIndex: idx })
      idx++
    }
    return grouped
  }, [flatResults])

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setTimeout(() => {
        mobileInputRef.current?.focus()
      }, 50)
    } else {
      setQuery("")
      setResults(null)
      setActiveIndex(0)
    }
  }, [open])

  // Close dropdown when clicking outside (desktop)
  useEffect(() => {
    if (!desktopFocused) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDesktopFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside, { passive: true })
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [desktopFocused])

  // Body scroll lock for mobile modal
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.width = ""
        document.body.style.overflow = ""
        window.scrollTo(0, scrollY)
      }
    }
  }, [open])

  // Debounced search
  const search = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setActiveIndex(0)
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setResults(null)
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300)
    } else {
      setResults(null)
      setLoading(false)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Scroll active item into view
  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const close = useCallback(() => setOpen(false), [])

  const navigateTo = useCallback(
    (href: string) => {
      if (query.length >= 2) saveRecentSearch(query)
      setOpen(false)
      setQuery("")
      setResults(null)
      // Delay navigation to let body scroll lock cleanup complete
      setTimeout(() => router.push(href), 50)
    },
    [router, query]
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (flatResults[activeIndex]) {
          navigateTo(flatResults[activeIndex].href)
        } else if (query.length >= 2) {
          navigateTo(`/search?q=${encodeURIComponent(query)}`)
        }
        break
      case "Escape":
        e.preventDefault()
        if (open) {
          close()
        } else {
          // Desktop: clear dropdown
          setQuery("")
          setResults(null)
          setDesktopFocused(false)
          inputRef.current?.blur()
        }
        break
    }
  }

  // Handle desktop input focus — open dropdown
  const handleDesktopFocus = () => {
    setRecentSearches(getRecentSearches())
    setDesktopFocused(true)
  }

  // Desktop: handle form submit to trigger search on Enter with no results yet
  const handleDesktopSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (flatResults[activeIndex]) {
      navigateTo(flatResults[activeIndex].href)
    } else if (query.length >= 2) {
      navigateTo(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  // Shared results panel
  const renderResults = () => {
    const hasQuery = query.length >= 2
    const showRecent = !hasQuery && recentSearches.length > 0

    return (
      <div className="max-h-[50vh] overflow-y-auto py-2">
        {/* Loading */}
        {loading && !results ? (
          <div className="space-y-1 px-2 py-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : showRecent ? (
          /* Recent searches */
          <div>
            <div className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {t("recentSearches")}
            </div>
            {recentSearches.map((recent) => (
              <div key={recent} className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg hover:bg-white/5 transition-colors group" style={{ width: "calc(100% - 1rem)" }}>
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <button
                  className="flex-1 text-sm text-gray-300 text-left truncate"
                  onClick={() => {
                    setQuery(recent)
                    search(recent)
                  }}
                >
                  {recent}
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRecentSearch(recent)
                    setRecentSearches(getRecentSearches())
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : hasQuery && flatResults.length === 0 && !loading ? (
          /* No results */
          <div className="py-12 text-center">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{t("noResults")}</p>
          </div>
        ) : (
          /* Grouped results */
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
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title || ""}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-gray-500"}`} />
                    )}
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <span className="flex items-center gap-2 ml-auto shrink-0">
                      {item.onSale && item.salePrice != null ? (
                        <>
                          <span className="text-xs font-medium text-red-400">{item.salePrice} {item.currency}</span>
                          {item.price != null && <span className="text-xs text-gray-500 line-through">{parseFloat(String(item.price)).toFixed(2)} {item.currency}</span>}
                        </>
                      ) : item.price != null ? (
                        <span className="text-xs text-gray-400">{item.price} {item.currency}</span>
                      ) : null}
                      {item.sublabel && (
                        <span className="text-xs text-gray-500 max-w-[80px] truncate">{item.sublabel}</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          ))
        )}
        {hasQuery && flatResults.length > 0 && (
          <div className="px-2 py-2 border-t border-white/10">
            <button
              onClick={() => navigateTo(`/search?q=${encodeURIComponent(query)}`)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              {t("viewAll")}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Keyboard hints footer
  const renderFooter = () => (
    <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-gray-500">
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
  )

  // Desktop: inline dropdown visible when has query, loading, or focused with recent searches
  const showDesktopDropdown = desktopFocused && (query.length >= 2 || loading || (recentSearches.length > 0 && query.length < 2))

  return (
    <>
      {/* Desktop: visible search input */}
      <div className="hidden lg:block relative min-w-0 flex-1" ref={dropdownRef}>
        <form onSubmit={handleDesktopSubmit} className="relative" onKeyDown={handleKeyDown}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleDesktopFocus}
            placeholder={t("placeholder")}
            className="w-full pl-9 pr-9 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-[border-color,box-shadow] min-w-0"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults(null)
                setDesktopFocused(false)
                inputRef.current?.focus()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Desktop dropdown */}
        {showDesktopDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 w-[32rem] rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl overflow-hidden z-[60]">
            {renderResults()}
            {renderFooter()}
          </div>
        )}
      </div>

      {/* Mobile: search icon button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
        aria-label={t("searchTip")}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Mobile: full-screen search modal */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          onClick={close}
          onKeyDown={handleKeyDown}
        >
          <div
            className="absolute top-[8vh] sm:top-[15vh] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                className="flex-1 bg-transparent text-white text-base placeholder-gray-500 outline-none"
              />
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderResults()}
            {renderFooter()}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
