"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations, useLocale } from "next-intl"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { ChevronDown, Menu, X } from "lucide-react"

interface MenuContent {
    id: string
    slug: string | null
    type: string
    titleBg: string
    titleEn: string
    titleEs: string
    image: string | null
}

interface MenuItem {
    id: string
    slug: string
    titleBg: string
    titleEn: string
    titleEs: string
    contents: MenuContent[]
}

export function Header() {
    const { data: session, status } = useSession()
    const t = useTranslations("nav")
    const locale = useLocale()
    const pathname = usePathname()
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [expandedItem, setExpandedItem] = useState<string | null>(null)
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const userDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await fetch("/api/menu")
                if (res.ok) {
                    const data = await res.json()
                    setMenuItems(data)
                }
            } catch (error) {
                console.error("Failed to fetch menu:", error)
            }
        }
        fetchMenu()
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
        setExpandedItem(null)
    }, [pathname])

    // Close user dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const getLocalizedTitle = (item: { titleBg: string; titleEn: string; titleEs: string }) => {
        switch (locale) {
            case "bg":
                return item.titleBg || item.titleEn
            case "es":
                return item.titleEs || item.titleEn
            default:
                return item.titleEn
        }
    }

    const toggleExpanded = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id)
    }

    return (
        <header className="glass sticky top-0 z-50 border-b border-white/10 relative">
            <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
                <Link href="/" className="text-2xl font-bold tracking-tight">
                    digital<span className="text-emerald-400">4d</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden gap-4 text-sm lg:flex items-center">
                    {menuItems.map((item) => (
                        <div key={item.id} className="relative group">
                            <Link
                                href={`/${item.slug}`}
                                className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors py-2"
                            >
                                {getLocalizedTitle(item)}
                                {item.contents.length > 0 && (
                                    <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                                )}
                            </Link>
                            {item.contents.length > 0 && (
                                <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <div className="glass-strong rounded-xl border border-white/10 py-2 min-w-[200px] shadow-xl">
                                        {item.contents.map((content) => {
                                            const href = content.slug
                                                ? `/${item.slug}/${content.slug}`
                                                : `/${item.slug}`
                                            return (
                                                <Link
                                                    key={content.id}
                                                    href={href}
                                                    className="block px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-emerald-400 transition-colors"
                                                >
                                                    {getLocalizedTitle(content)}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <Link href="/products" className="text-slate-300 hover:text-emerald-400 transition-colors">{t("products")}</Link>
                    <Link href="/#news" className="text-slate-300 hover:text-emerald-400 transition-colors">{t("news")}</Link>
                    <Link href="/#contact" className="text-slate-300 hover:text-emerald-400 transition-colors">{t("contact")}</Link>
                </nav>

                <div className="flex items-center gap-3">
                    {/* Social Icons - Desktop only */}
                    <div className="hidden lg:flex items-center gap-3">
                        <a href="https://www.facebook.com/VeZzo0" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 hover:scale-110 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                        <a href="https://www.instagram.com/vezzo_georgiev/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 hover:scale-110 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 hover:scale-110 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>
                        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 hover:scale-110 transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </a>
                    </div>

                    {/* Language Switcher */}
                    <LanguageSwitcher />

                    {/* Auth Button */}
                    {status === "loading" ? (
                        <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
                    ) : session ? (
                        <div className="relative" ref={userDropdownRef}>
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-full glass hover:bg-white/10 transition-all"
                            >
                                {session.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-bold">
                                        {session.user?.name?.charAt(0) || "U"}
                                    </div>
                                )}
                                <span className="hidden lg:block text-sm max-w-[100px] truncate">
                                    {session.user?.name?.split(" ")[0]}
                                </span>
                                <svg className={`w-4 h-4 text-slate-400 hidden lg:block transition-transform ${userDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {/* Dropdown */}
                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 py-2 glass-strong rounded-xl border border-white/10 shadow-xl">
                                    <div className="px-4 py-2 border-b border-white/10">
                                        <p className="text-sm font-medium truncate">{session.user?.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setUserDropdownOpen(false)
                                            signOut()
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        {t("logout")}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden lg:block px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105 transition-all"
                        >
                            {t("login")}
                        </Link>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6 text-white" />
                        ) : (
                            <Menu className="w-6 h-6 text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`lg:hidden bg-slate-900/98 backdrop-blur-xl border-t border-white/10 absolute left-0 right-0 top-full overflow-y-auto z-50 transition-all duration-300 ${
                    mobileMenuOpen
                        ? 'max-h-[calc(100vh-100%)] opacity-100 visible'
                        : 'max-h-0 opacity-0 invisible overflow-hidden'
                }`}
                style={{ maxHeight: mobileMenuOpen ? 'calc(100vh - 73px)' : '0' }}
            >
                <nav className="flex flex-col p-4 space-y-1 pb-safe">
                        {menuItems.map((item) => (
                            <div key={item.id}>
                                {item.contents.length > 0 ? (
                                    <>
                                        <button
                                            onClick={() => toggleExpanded(item.id)}
                                            className="w-full flex items-center justify-between py-3 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation"
                                        >
                                            <span>{getLocalizedTitle(item)}</span>
                                            <ChevronDown className={`w-5 h-5 transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`} />
                                        </button>
                                        {expandedItem === item.id && (
                                            <div className="pl-4 pb-2 space-y-1 border-l border-white/10 ml-2">
                                                {item.contents.map((content) => {
                                                    const href = content.slug
                                                        ? `/${item.slug}/${content.slug}`
                                                        : `/${item.slug}`
                                                    return (
                                                        <Link
                                                            key={content.id}
                                                            href={href}
                                                            className="block py-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                                                        >
                                                            {getLocalizedTitle(content)}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={`/${item.slug}`}
                                        className="block py-3 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation"
                                    >
                                        {getLocalizedTitle(item)}
                                    </Link>
                                )}
                            </div>
                        ))}
                        <Link
                            href="/products"
                            className="py-3 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation"
                        >
                            {t("products")}
                        </Link>
                        <Link
                            href="/#news"
                            className="py-3 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation"
                        >
                            {t("news")}
                        </Link>
                        <Link
                            href="/#contact"
                            className="py-3 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation"
                        >
                            {t("contact")}
                        </Link>

                        {/* Mobile Login Button */}
                        {!session && (
                            <Link
                                href="/login"
                                className="mt-4 py-3 text-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-white touch-manipulation"
                            >
                                {t("login")}
                            </Link>
                        )}

                        {/* Mobile Social Links */}
                        <div className="flex items-center justify-center gap-6 pt-4 mt-4 border-t border-white/10">
                            <a href="https://www.facebook.com/VeZzo0" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                            <a href="https://www.instagram.com/vezzo_georgiev/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                </svg>
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </a>
                            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                </svg>
                            </a>
                        </div>
                    </nav>
                </div>
        </header>
    )
}
