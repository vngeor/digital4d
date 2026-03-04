"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "../components/Header"
import { Search, Package, FileText, Menu as MenuIcon, ArrowLeft } from "lucide-react"
import { COLOR_CLASSES } from "@/lib/colors"

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

interface ProductCategory {
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
}

interface SearchResultsClientProps {
    initialQuery: string
    locale: string
    categories: ProductCategory[]
    translations: {
        searchResults: string
        searchResultsFor: string
        placeholder: string
        products: string
        news: string
        services: string
        pages: string
        noResults: string
        noResultsDescription: string
        resultCount: string
        viewAll: string
        onSale: string
        from: string
    }
}

export function SearchResultsClient({ initialQuery, locale, categories, translations: t }: SearchResultsClientProps) {
    const router = useRouter()
    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<SearchResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const getCategoryColor = useCallback((categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        return category?.color || "gray"
    }, [categories])

    const getCategoryName = useCallback((categorySlug: string) => {
        const category = categories.find((c) => c.slug === categorySlug)
        if (!category) return categorySlug
        switch (locale) {
            case "bg": return category.nameBg || category.nameEn
            case "es": return category.nameEs || category.nameEn
            default: return category.nameEn
        }
    }, [categories, locale])

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

    const getContentUrl = useCallback((item: SearchContent) => {
        if (item.type === "news") return `/news/${item.slug}`
        if (item.menuItemSlug) return `/${item.menuItemSlug}/${item.slug}`
        return `/news/${item.slug}`
    }, [])

    const search = useCallback(async (q: string) => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`, {
                signal: controller.signal,
            })
            if (res.ok) {
                const data = await res.json()
                setResults(data)
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
            debounceRef.current = setTimeout(() => {
                search(query)
                router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false })
            }, 300)
        } else {
            setResults(null)
            setLoading(false)
        }
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, search, router])

    // Auto-search on mount if initialQuery present
    useEffect(() => {
        if (initialQuery.length >= 2) search(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const totalResults = useMemo(() => {
        if (!results) return 0
        return results.products.length + results.content.length + results.menu.length
    }, [results])

    const newsContent = useMemo(() => results?.content.filter(c => c.type === "news") || [], [results])
    const servicesContent = useMemo(() => results?.content.filter(c => c.type === "service") || [], [results])

    const renderSkeletons = (count: number) => (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden border border-white/10">
                    <div className="h-40 bg-white/5 animate-pulse" />
                    <div className="p-4 space-y-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words">
                        {query ? `${t.searchResultsFor} "${query}"` : t.searchResults}
                    </h1>

                    {/* Search input */}
                    <div className="relative mt-6 max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t.placeholder}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        />
                    </div>

                    {/* Result count */}
                    {results && query.length >= 2 && (
                        <p className="text-slate-400 text-sm mt-3">
                            {totalResults} {t.resultCount}
                        </p>
                    )}
                </div>
            </section>

            {/* Results */}
            <section className="relative py-8 px-4 pb-16">
                <div className="mx-auto max-w-6xl space-y-12">
                    {loading ? (
                        renderSkeletons(8)
                    ) : query.length < 2 ? (
                        <div className="text-center py-20">
                            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-slate-400 text-lg">{t.placeholder}</p>
                        </div>
                    ) : totalResults === 0 ? (
                        <div className="text-center py-20">
                            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-white text-xl font-semibold mb-2">{t.noResults}</p>
                            <p className="text-slate-400">{t.noResultsDescription}</p>
                        </div>
                    ) : (
                        <>
                            {/* Products */}
                            {results!.products.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <Package className="w-5 h-5 text-emerald-400" />
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">{t.products}</h2>
                                        <span className="text-sm text-slate-500">({results!.products.length})</span>
                                    </div>
                                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                        {results!.products.map((p) => {
                                            const categoryColor = getCategoryColor(p.category)
                                            const categoryName = getCategoryName(p.category)
                                            const discountPercent = p.onSale && p.price && p.salePrice
                                                ? Math.round((1 - parseFloat(String(p.salePrice)) / parseFloat(String(p.price))) * 100)
                                                : 0
                                            return (
                                            <Link
                                                key={p.id}
                                                href={`/products/${p.slug}`}
                                                className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
                                            >
                                                {p.image ? (
                                                    <div className="relative h-40 overflow-hidden">
                                                        <img src={p.image} alt={getName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                                        {p.onSale && (
                                                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">{t.onSale}</span>
                                                                {discountPercent > 0 && (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">-{discountPercent}%</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-40 bg-white/5 flex items-center justify-center">
                                                        <Package className="w-12 h-12 text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    {p.category && (
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"}`}>
                                                            {categoryName}
                                                        </span>
                                                    )}
                                                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                                                        {getName(p)}
                                                    </h3>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        {p.onSale && p.salePrice != null ? (
                                                            <>
                                                                <span className="text-sm font-bold text-emerald-400">{parseFloat(String(p.salePrice)).toFixed(2)} {p.currency}</span>
                                                                {p.price != null && <span className="text-xs text-gray-500 line-through">{parseFloat(String(p.price)).toFixed(2)} {p.currency}</span>}
                                                            </>
                                                        ) : p.price != null ? (
                                                            <span className="text-sm font-bold text-white">
                                                                {p.priceType === "from" ? `${t.from} ` : ""}{parseFloat(String(p.price)).toFixed(2)} {p.currency}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* News */}
                            {newsContent.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <FileText className="w-5 h-5 text-cyan-400" />
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">{t.news}</h2>
                                        <span className="text-sm text-slate-500">({newsContent.length})</span>
                                    </div>
                                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                        {newsContent.map((c) => (
                                            <Link
                                                key={c.id}
                                                href={getContentUrl(c)}
                                                className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                                            >
                                                {c.image ? (
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img src={c.image} alt={getTitle(c)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                                    </div>
                                                ) : (
                                                    <div className="h-48 bg-white/5 flex items-center justify-center">
                                                        <FileText className="w-12 h-12 text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="p-4 sm:p-6">
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-cyan-500/20 text-cyan-400">
                                                        {t.news}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                                                        {getTitle(c)}
                                                    </h3>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Services */}
                            {servicesContent.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <FileText className="w-5 h-5 text-purple-400" />
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">{t.services}</h2>
                                        <span className="text-sm text-slate-500">({servicesContent.length})</span>
                                    </div>
                                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                        {servicesContent.map((c) => (
                                            <Link
                                                key={c.id}
                                                href={getContentUrl(c)}
                                                className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                                            >
                                                {c.image ? (
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img src={c.image} alt={getTitle(c)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                                                    </div>
                                                ) : (
                                                    <div className="h-48 bg-white/5 flex items-center justify-center">
                                                        <FileText className="w-12 h-12 text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="p-4 sm:p-6">
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-500/20 text-purple-400">
                                                        {t.services}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                                                        {getTitle(c)}
                                                    </h3>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pages */}
                            {results!.menu.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <MenuIcon className="w-5 h-5 text-amber-400" />
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">{t.pages}</h2>
                                        <span className="text-sm text-slate-500">({results!.menu.length})</span>
                                    </div>
                                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                        {results!.menu.map((m) => (
                                            <Link
                                                key={m.id}
                                                href={`/${m.slug}`}
                                                className="group glass rounded-2xl overflow-hidden border border-white/10 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/10 p-6 flex items-center gap-4"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                    <MenuIcon className="w-6 h-6 text-amber-400" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                                                    {getTitle(m)}
                                                </h3>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d</p>
                </div>
            </footer>
        </div>
    )
}
