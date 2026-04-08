"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations, useLocale } from "next-intl"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { GlobalSearch } from "./GlobalSearch"
import { locales, localeFlags, type Locale } from "@/i18n/config"
import { NotificationBell } from "./NotificationBell"
import { ChevronDown, X, Heart, Cake, ShoppingCart } from "lucide-react"
import { getCartCount, CART_KEY } from "@/lib/cart"
import { CartDrawer } from "./CartDrawer"
import { GlobalPromoStrip } from "./GlobalPromoStrip"

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
    const tLang = useTranslations("language")
    const locale = useLocale() as Locale
    const pathname = usePathname()
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [productCategories, setProductCategories] = useState<Array<{
        id: string; slug: string; nameBg: string; nameEn: string; nameEs: string; productCount: number;
        children: Array<{ id: string; slug: string; nameBg: string; nameEn: string; nameEs: string; productCount: number }>
    }>>([])
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [cartOpen, setCartOpen] = useState(false)
    const [cartCount, setCartCount] = useState(0)
    const [expandedItem, setExpandedItem] = useState<string | null>(null)
    const [expandedCategoryDesktop, setExpandedCategoryDesktop] = useState<string | null>(null)
    const [expandedCategoryMobile, setExpandedCategoryMobile] = useState<string | null>(null)
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const [missingBirthDate, setMissingBirthDate] = useState(false)
    const [loadingTimedOut, setLoadingTimedOut] = useState(false)
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

        // Fetch product categories for dropdown
        fetch("/api/categories").then(res => res.ok ? res.json() : []).then(setProductCategories).catch(() => {})
    }, [])

    // Check if logged-in user has birthDate set
    useEffect(() => {
        if (status !== "authenticated") {
            setMissingBirthDate(false)
            return
        }
        const checkBirthDate = async () => {
            try {
                const res = await fetch("/api/user/profile")
                if (res.ok) {
                    const data = await res.json()
                    setMissingBirthDate(!data.birthDate)
                }
            } catch {
                // Silently ignore
            }
        }
        checkBirthDate()
    }, [status])

    // Sync cart badge count
    useEffect(() => {
        const update = () => setCartCount(getCartCount())
        update()
        window.addEventListener("cart-updated", update)
        return () => window.removeEventListener("cart-updated", update)
    }, [])

    // After login: restore cart from sessionStorage backup (saved before OAuth redirect)
    // and auto-open CartDrawer if redirected from a checkout attempt
    useEffect(() => {
        if (status !== "authenticated") return
        try {
            const backup = sessionStorage.getItem("d4d-cart-backup")
            if (backup && backup !== "[]") {
                const existing = localStorage.getItem(CART_KEY)
                if (!existing || existing === "[]") {
                    localStorage.setItem(CART_KEY, backup)
                    window.dispatchEvent(new Event("cart-updated"))
                }
                sessionStorage.removeItem("d4d-cart-backup")
            }
        } catch {}
        // Auto-open CartDrawer if user was redirected from cart checkout
        if (window.location.search.includes("openCart=1")) {
            setCartOpen(true)
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [status])

    // Cart open/close via window events
    useEffect(() => {
        const openHandler = () => setCartOpen(true)
        const closeHandler = () => setCartOpen(false)
        const openUpsellHandler = () => setCartOpen(true)
        window.addEventListener("open-cart", openHandler)
        window.addEventListener("close-cart", closeHandler)
        window.addEventListener("open-cart-upsell", openUpsellHandler)
        return () => {
            window.removeEventListener("open-cart", openHandler)
            window.removeEventListener("close-cart", closeHandler)
            window.removeEventListener("open-cart-upsell", openUpsellHandler)
        }
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
        setExpandedItem(null)
        setExpandedCategoryMobile(null)
    }, [pathname])

    // Lock body scroll while mobile menu is open
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileMenuOpen])

    // Fallback: if session loading takes > 3s, treat as unauthenticated
    useEffect(() => {
        if (status !== "loading") {
            setLoadingTimedOut(false)
            return
        }
        const timer = setTimeout(() => setLoadingTimedOut(true), 3000)
        return () => clearTimeout(timer)
    }, [status])

    // Close user dropdown when clicking outside
    useEffect(() => {
        if (!userDropdownOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside, { passive: true })
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [userDropdownOpen])

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

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg || item.nameEn
            case "es": return item.nameEs || item.nameEn
            default: return item.nameEn
        }
    }

    const toggleExpanded = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id)
    }

    return (
        <>
        {/* Main Header - sticky */}
        <header className="bg-slate-950 sticky top-0 z-50 border-b border-white/10 relative">
            <GlobalPromoStrip />
            {/* Row 1: Logo + actions */}
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 lg:gap-6 px-4 py-3">
                <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap shrink-0">
                    digital<span className="text-emerald-400">4d</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3 lg:flex-1 lg:justify-end">
                    {/* Social Icons - Desktop only */}
                    <div className="hidden lg:flex items-center gap-3">
                        <a href="https://www.facebook.com/VeZzo0" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#1877F2] hover:scale-110 transition-[transform,color] duration-200">
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                        <a href="https://www.instagram.com/vezzo_georgiev/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#C32AA3] hover:scale-110 transition-[transform,color] duration-200">
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#FF0000] hover:scale-110 transition-[transform,color] duration-200">
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>
                        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#69C9D0] hover:scale-110 transition-[transform,color] duration-200">
                            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </a>
                    </div>

                    {/* Language Switcher */}
                    <LanguageSwitcher />

                    {/* Global Site Search */}
                    <GlobalSearch />

                    {/* Notification Bell - Only for logged-in users */}
                    {session && (
                        <NotificationBell
                            locale={locale}
                            translations={{
                                notifications: t("notifications"),
                                noNotifications: t("noNotifications"),
                                newQuoteReceived: t("newQuoteReceived"),
                                viewAllInOrders: t("viewAllInOrders"),
                                justNow: t("justNow"),
                                minutesAgo: t.raw("minutesAgo"),
                                hoursAgo: t.raw("hoursAgo"),
                                daysAgo: t.raw("daysAgo"),
                                wishlistPriceDrop: t.raw("wishlistPriceDrop"),
                                wishlistPriceDropMessage: t.raw("wishlistPriceDropMessage"),
                                wishlistOnSale: t.raw("wishlistOnSale"),
                                wishlistCoupon: t.raw("wishlistCoupon"),
                                wishlistCouponPercentage: t.raw("wishlistCouponPercentage"),
                                wishlistCouponFixed: t.raw("wishlistCouponFixed"),
                                quoteOfferTitle: t("quoteOfferTitle"),
                                quoteOfferWithCouponTitle: t("quoteOfferWithCouponTitle"),
                                quoteOfferMessage: t.raw("quoteOfferMessage"),
                                quoteOfferMessageWithCoupon: t.raw("quoteOfferMessageWithCoupon"),
                                quoteOfferMessageGeneric: t("quoteOfferMessageGeneric"),
                                quotePriceMessage: t.raw("quotePriceMessage"),
                                autoBirthday: t("autoBirthday"),
                                autoHoliday: t("autoHoliday"),
                                autoCustom: t("autoCustom"),
                                notificationDetails: t("notificationDetails"),
                                visitLink: t("visitLink"),
                                couponExpires: t.raw("couponExpires"),
                                couponTimeLeft: t("couponTimeLeft"),
                                couponExpired: t("couponExpired"),
                                couponReminder: t("couponReminder"),
                                stockAvailable: t.raw("stockAvailable"),
                                closeModal: t("closeModal"),
                            }}
                        />
                    )}

                    {/* Cart Icon */}
                    <button
                        onClick={() => setCartOpen(true)}
                        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                        aria-label="Shopping cart"
                    >
                        <ShoppingCart className="w-5 h-5 text-white" />
                        {cartCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                                {cartCount > 99 ? "99+" : cartCount}
                            </span>
                        )}
                    </button>

                    {/* Auth Button */}
                    {(status === "loading" && !loadingTimedOut) ? (
                        <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
                    ) : session ? (
                        <div className="relative" ref={userDropdownRef}>
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="rounded-full hover:opacity-80 transition-opacity lg:flex lg:items-center lg:gap-2 lg:px-3 lg:py-2 lg:glass lg:hover:opacity-100 lg:hover:bg-white/10 touch-manipulation"
                            >
                                <div className="relative">
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
                                    {missingBirthDate && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500 border border-slate-900" />
                                        </span>
                                    )}
                                </div>
                                <span className="hidden lg:block text-sm max-w-[100px] truncate">
                                    {session.user?.name?.split(" ")[0]}
                                </span>
                                <svg className={`w-4 h-4 text-slate-400 hidden lg:block transition-transform ${userDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {/* Dropdown */}
                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] py-2 bg-slate-900 rounded-xl border border-white/10 shadow-xl z-50">
                                    <div className="px-4 py-2 border-b border-white/10">
                                        <p className="text-sm font-medium truncate">{session.user?.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
                                    </div>
                                    <Link
                                        href="/profile"
                                        onClick={() => setUserDropdownOpen(false)}
                                        className="flex items-center justify-between w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        <span>{t("profile")}</span>
                                        {missingBirthDate && (
                                            <span className="flex items-center gap-1.5">
                                                <Cake className="w-3.5 h-3.5 text-pink-400" />
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
                                                </span>
                                            </span>
                                        )}
                                    </Link>
                                    <Link
                                        href="/my-orders"
                                        onClick={() => setUserDropdownOpen(false)}
                                        className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        {t("myOrders")}
                                    </Link>
                                    <Link
                                        href="/wishlist"
                                        onClick={() => setUserDropdownOpen(false)}
                                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        <Heart className="w-3.5 h-3.5" />
                                        {t("myWishlist")}
                                    </Link>
                                    <div className="border-t border-white/10 my-1" />
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
                        <>
                            <Link
                                href="/login"
                                className="hidden lg:block px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-sm hover:scale-105 transition-transform"
                            >
                                {t("login")}
                            </Link>
                            <Link
                                href="/login"
                                className="lg:hidden px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-xs font-semibold touch-manipulation"
                            >
                                {t("login")}
                            </Link>
                        </>
                    )}

                    {/* Mobile Menu Button — 3 lines morph to X */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 transition-colors touch-manipulation flex flex-col items-center justify-center gap-1"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileMenuOpen}
                    >
                        <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                        <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                        <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Row 2: Desktop Navigation */}
            <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 px-4 py-2.5 border-t border-white/5 max-w-6xl mx-auto text-[15px]">
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(`/${item.slug}`)
                    return (
                    <div key={item.id} className="relative group">
                        <Link
                            href={`/${item.slug}`}
                            className={`flex items-center gap-1 transition-colors py-2 whitespace-nowrap border-b-2 ${isActive ? "text-emerald-400 border-emerald-400" : "text-slate-300 border-transparent hover:text-emerald-400"}`}
                        >
                            {getLocalizedTitle(item)}
                            {item.contents.length > 0 && (
                                <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                            )}
                        </Link>
                        {item.contents.length > 0 && (
                            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] z-50">
                                <div className="bg-slate-900 rounded-xl border border-white/10 py-2 min-w-[200px] shadow-xl">
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
                    )
                })}
                <div className="relative group">
                    <Link href="/products" className={`flex items-center gap-1 transition-colors whitespace-nowrap py-2 border-b-2 ${pathname.startsWith("/products") ? "text-emerald-400 border-emerald-400" : "text-slate-300 border-transparent hover:text-emerald-400"}`}>
                        {t("products")}
                        {productCategories.length > 0 && (
                            <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                        )}
                    </Link>
                    {productCategories.length > 0 && (
                        <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] z-50">
                            <div className="bg-slate-900 rounded-xl border border-white/10 py-2 min-w-[220px] max-h-80 overflow-y-auto shadow-xl">
                                <Link href="/products" className="block px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-emerald-400 transition-colors font-medium">
                                    {t("allProducts")}
                                </Link>
                                <div className="border-t border-white/10 my-1" />
                                {productCategories.map(cat => (
                                    <div key={cat.id}>
                                        {cat.children.length > 0 ? (
                                            <>
                                                <div className={`flex items-center px-4 py-2 ${pathname.startsWith(`/products/category/${cat.slug}`) ? "text-emerald-400 bg-emerald-500/10" : "text-slate-300"}`}>
                                                    <Link
                                                        href={`/products/category/${cat.slug}`}
                                                        className="flex-1 hover:text-emerald-400 transition-colors font-medium"
                                                    >
                                                        {getLocalizedName(cat)}
                                                        <span className="text-xs text-gray-500 ml-1">({cat.productCount})</span>
                                                    </Link>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setExpandedCategoryDesktop(expandedCategoryDesktop === cat.id ? null : cat.id) }}
                                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                                    >
                                                        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedCategoryDesktop === cat.id ? "rotate-180" : ""}`} />
                                                    </button>
                                                </div>
                                                {expandedCategoryDesktop === cat.id && cat.children.map(child => (
                                                    <Link
                                                        key={child.id}
                                                        href={`/products/category/${cat.slug}/${child.slug}`}
                                                        className={`block pl-8 pr-4 py-1.5 text-sm transition-colors ${pathname === `/products/category/${cat.slug}/${child.slug}` ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 hover:bg-white/10 hover:text-emerald-400"}`}
                                                    >
                                                        <span className="text-gray-600 mr-1">·</span>
                                                        {getLocalizedName(child)}
                                                        <span className="text-xs text-gray-600 ml-1">({child.productCount})</span>
                                                    </Link>
                                                ))}
                                            </>
                                        ) : (
                                            <Link
                                                href={`/products/category/${cat.slug}`}
                                                className={`block px-4 py-2 transition-colors font-medium ${pathname === `/products/category/${cat.slug}` ? "text-emerald-400 bg-emerald-500/10" : "text-slate-300 hover:bg-white/10 hover:text-emerald-400"}`}
                                            >
                                                {getLocalizedName(cat)}
                                                <span className="text-xs text-gray-500 ml-1">({cat.productCount})</span>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <Link href="/brands" className={`transition-colors whitespace-nowrap py-2 border-b-2 ${pathname.startsWith("/brands") ? "text-emerald-400 border-emerald-400" : "text-slate-300 border-transparent hover:text-emerald-400"}`}>{t("brands")}</Link>
                <Link href="/#news" className="text-slate-300 border-b-2 border-transparent hover:text-emerald-400 transition-colors whitespace-nowrap py-2">{t("news")}</Link>
                <Link href="/#contact" className="text-slate-300 border-b-2 border-transparent hover:text-emerald-400 transition-colors whitespace-nowrap py-2">{t("contact")}</Link>
            </nav>

            {/* Gradient accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </header>

        {/* Cart Drawer */}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} locale={locale} />

        {/* ===== MOBILE MENU OVERLAY (fixed, outside header) ===== */}

        {/* Backdrop — tap to close */}
        <div
            className={`lg:hidden fixed inset-0 z-[49] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
        />

        {/* Full-screen panel */}
        <div
            className={`lg:hidden fixed inset-0 z-50 flex flex-col bg-slate-950/97 backdrop-blur-xl transition-all duration-300 ease-out ${mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
        >
            {/* Top bar: logo + close */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold tracking-tight">
                    digital<span className="text-emerald-400">4d</span>
                </Link>
                <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Scrollable nav area */}
            <nav className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-5 py-2">
                    {/* CMS menu items */}
                    {menuItems.map((item) => (
                        <div key={item.id} className="border-b border-white/5">
                            {item.contents.length > 0 ? (
                                <>
                                    <button
                                        onClick={() => toggleExpanded(item.id)}
                                        className="w-full flex items-center justify-between py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation"
                                    >
                                        <span>{getLocalizedTitle(item)}</span>
                                        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`} />
                                    </button>
                                    {expandedItem === item.id && (
                                        <div className="pb-3 pl-4 space-y-0.5 border-l-2 border-emerald-500/30 ml-1">
                                            {item.contents.map((content) => {
                                                const href = content.slug ? `/${item.slug}/${content.slug}` : `/${item.slug}`
                                                return (
                                                    <Link
                                                        key={content.id}
                                                        href={href}
                                                        className="block py-2.5 text-slate-400 hover:text-emerald-400 transition-colors touch-manipulation"
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
                                    className="block py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation"
                                >
                                    {getLocalizedTitle(item)}
                                </Link>
                            )}
                        </div>
                    ))}

                    {/* Products */}
                    <div className="border-b border-white/5">
                        {productCategories.length > 0 ? (
                            <>
                                <button
                                    onClick={() => toggleExpanded("_products")}
                                    className="w-full flex items-center justify-between py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation"
                                >
                                    <span>{t("products")}</span>
                                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${expandedItem === "_products" ? "rotate-180" : ""}`} />
                                </button>
                                {expandedItem === "_products" && (
                                    <div className="pb-3 pl-4 space-y-0.5 border-l-2 border-emerald-500/30 ml-1">
                                        <Link href="/products" className="block py-2.5 text-slate-400 hover:text-emerald-400 transition-colors touch-manipulation font-medium">
                                            {t("allProducts")}
                                        </Link>
                                        {productCategories.map(cat => (
                                            <div key={cat.id}>
                                                {cat.children.length > 0 ? (
                                                    <>
                                                        <div className="flex items-center py-2.5">
                                                            <Link
                                                                href={`/products/category/${cat.slug}`}
                                                                className="flex-1 text-slate-400 hover:text-emerald-400 transition-colors touch-manipulation font-medium"
                                                            >
                                                                {getLocalizedName(cat)}
                                                                <span className="text-xs text-gray-600 ml-1">({cat.productCount})</span>
                                                            </Link>
                                                            <button
                                                                onClick={() => setExpandedCategoryMobile(expandedCategoryMobile === cat.id ? null : cat.id)}
                                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation min-w-[36px] flex items-center justify-center"
                                                                style={{ WebkitTapHighlightColor: 'transparent' }}
                                                            >
                                                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedCategoryMobile === cat.id ? "rotate-180" : ""}`} />
                                                            </button>
                                                        </div>
                                                        {expandedCategoryMobile === cat.id && cat.children.map(child => (
                                                            <Link
                                                                key={child.id}
                                                                href={`/products/category/${cat.slug}/${child.slug}`}
                                                                className="block py-2 pl-4 text-sm text-slate-500 hover:text-emerald-400 transition-colors touch-manipulation"
                                                            >
                                                                <span className="text-gray-600 mr-1">·</span>
                                                                {getLocalizedName(child)}
                                                                <span className="text-xs text-gray-600 ml-1">({child.productCount})</span>
                                                            </Link>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <Link
                                                        href={`/products/category/${cat.slug}`}
                                                        className="block py-2.5 text-slate-400 hover:text-emerald-400 transition-colors touch-manipulation font-medium"
                                                    >
                                                        {getLocalizedName(cat)}
                                                        <span className="text-xs text-gray-600 ml-1">({cat.productCount})</span>
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link href="/products" className="block py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation">
                                {t("products")}
                            </Link>
                        )}
                    </div>

                    {/* Brands */}
                    <div className="border-b border-white/5">
                        <Link href="/brands" className="block py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation">
                            {t("brands")}
                        </Link>
                    </div>

                    {/* News */}
                    <div className="border-b border-white/5">
                        <Link href="/#news" className="block py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation">
                            {t("news")}
                        </Link>
                    </div>

                    {/* Contact */}
                    <div>
                        <Link href="/#contact" className="block py-4 text-lg font-semibold text-white hover:text-emerald-400 transition-colors touch-manipulation">
                            {t("contact")}
                        </Link>
                    </div>

                    {/* Login button for guests */}
                    {!session && (
                        <Link
                            href="/login"
                            className="block mt-4 py-3 text-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-white touch-manipulation"
                        >
                            {t("login")}
                        </Link>
                    )}
                </div>
            </nav>

            {/* Footer: Language + Socials */}
            <div className="shrink-0 border-t border-white/10 px-5 py-4 space-y-4 pb-safe">
                {/* Language selector */}
                <div>
                    <p className="text-xs text-slate-500 mb-2 text-center">{tLang("select")}</p>
                    <div className="flex items-center justify-center gap-2">
                        {locales.map((loc) => (
                            <button
                                key={loc}
                                onClick={() => {
                                    document.cookie = `NEXT_LOCALE=${loc};path=/;max-age=${60 * 60 * 24 * 365}`
                                    window.location.reload()
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                                    locale === loc
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <span>{localeFlags[loc]}</span>
                                <span>{loc.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Social icons */}
                <div className="flex items-center justify-center gap-5">
                    <a href="https://www.facebook.com/VeZzo0" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#1877F2] transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                    <a href="https://www.instagram.com/vezzo_georgiev/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#C32AA3] transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#FF0000] transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </a>
                    <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#69C9D0] transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    </a>
                </div>
            </div>
        </div>
        </>
    )
}
