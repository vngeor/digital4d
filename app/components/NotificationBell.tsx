"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Bell, X, MessageSquare, Ticket, Copy, Check, Heart, TrendingDown, Cake, Gift, ExternalLink, Percent, Clock, TreePine, PartyPopper, Egg, CalendarDays } from "lucide-react"

interface Notification {
  id: string
  type: "quote_offer" | "admin_message" | "coupon" | "wishlist_price_drop" | "wishlist_coupon" | "auto_birthday" | "auto_christmas" | "auto_new_year" | "auto_easter" | "auto_custom" | "coupon_reminder"
  title: string
  message: string
  link: string | null
  read: boolean
  quotedPrice: string | null
  quotedAt: string | null
  viewedAt: string | null
  productName: string | null
  productSlug: string | null
  productImage: string | null
  couponCode: string | null
  couponType: string | null
  couponValue: string | null
  couponCurrency: string | null
  couponExpiresAt: string | null
  createdAt: string
  isLegacy: boolean
  quoteId: string | null
}

interface NotificationBellProps {
  translations: {
    notifications: string
    noNotifications: string
    newQuoteReceived: string
    viewAllInOrders: string
    justNow: string
    minutesAgo: string
    hoursAgo: string
    daysAgo: string
    wishlistPriceDrop: string
    wishlistPriceDropMessage: string
    wishlistOnSale: string
    wishlistCoupon: string
    wishlistCouponPercentage: string
    wishlistCouponFixed: string
    quoteOfferTitle: string
    quoteOfferWithCouponTitle: string
    quoteOfferMessage: string
    quoteOfferMessageWithCoupon: string
    quoteOfferMessageGeneric: string
    quotePriceMessage: string
    autoBirthday: string
    autoHoliday: string
    autoCustom: string
    notificationDetails: string
    visitLink: string
    couponExpires: string
    couponTimeLeft: string
    couponExpired: string
    couponReminder: string
    closeModal: string
  }
  locale?: string
}

function isAutoNotification(type: string): boolean {
  return type.startsWith("auto_") || type === "coupon_reminder"
}

export function NotificationBell({ translations: t, locale = "en" }: NotificationBellProps) {
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [countdownKey, setCountdownKey] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const portalDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
          setNotifications(data.notifications || [])
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    fetchNotifications()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        (!portalDropdownRef.current || !portalDropdownRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedNotification) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNotification(null)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [selectedNotification])

  // Prevent body scroll when modal is open (iOS-safe pattern)
  useEffect(() => {
    if (selectedNotification) {
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
  }, [selectedNotification])

  // Live countdown timer for coupon expiry in modal
  useEffect(() => {
    if (!selectedNotification?.couponExpiresAt) return
    const interval = setInterval(() => setCountdownKey(k => k + 1), 1000)
    return () => clearInterval(interval)
  }, [selectedNotification])

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (notification.isLegacy) {
        // Legacy quote notification — mark as viewed via old endpoint
        await fetch(`/api/quotes/${notification.id}/view`, { method: "POST" })
      } else {
        // New notification — mark as read
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        })
      }
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true, viewedAt: new Date().toISOString() } : n
        )
      )
      setCount(prev => Math.max(prev - 1, 0))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleAutoNotificationClick = (notification: Notification) => {
    handleNotificationClick(notification)
    setIsOpen(false)
    setSelectedNotification(notification)
  }

  const handleRegularNotificationClick = (notification: Notification) => {
    handleNotificationClick(notification)
    setIsOpen(false)
  }

  const handleCopyCode = async (code: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback
    }
  }

  const handleCopyCodeModal = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t.justNow
    if (diffMins < 60) return t.minutesAgo.replace("{minutes}", String(diffMins))
    if (diffHours < 24) return t.hoursAgo.replace("{hours}", String(diffHours))
    if (diffDays < 7) return t.daysAgo.replace("{days}", String(diffDays))
    return date.toLocaleDateString()
  }

  const tryParseJson = (str: string) => {
    try { return JSON.parse(str) } catch { return null }
  }

  const getLocalizedTitle = (notification: Notification): string => {
    if (notification.type === "wishlist_price_drop") {
      const names = tryParseJson(notification.title)
      const msgData = tryParseJson(notification.message)
      if (names) {
        const productName = names[locale] || names.en || notification.title
        if (msgData && !msgData.newPrice && msgData.onSale) {
          return t.wishlistOnSale.replace("{product}", productName)
        }
        return t.wishlistPriceDrop.replace("{product}", productName)
      }
    }
    if (notification.type === "wishlist_coupon") {
      const data = tryParseJson(notification.title)
      if (data?.code) {
        return t.wishlistCoupon.replace("{code}", data.code)
      }
    }
    // Quote offer notifications
    if (notification.type === "quote_offer") {
      return t.quoteOfferTitle
    }
    // Coupon-type notifications (quote offer + coupon)
    if (notification.type === "coupon") {
      return t.quoteOfferWithCouponTitle
    }
    // Auto-scheduled notifications (birthday, holiday, custom) and coupon reminders
    if (notification.type.startsWith("auto_") || notification.type === "coupon_reminder") {
      const parsed = tryParseJson(notification.title)
      if (parsed && parsed[locale]) return parsed[locale]
      if (parsed && parsed.en) return parsed.en
      // Fallback to label
      if (notification.type === "auto_birthday") return t.autoBirthday
      if (notification.type === "auto_christmas" || notification.type === "auto_new_year" || notification.type === "auto_easter") return t.autoHoliday
      if (notification.type === "coupon_reminder") return t.couponReminder
      if (notification.type === "auto_custom") return t.autoCustom
    }
    return notification.title
  }

  const getLocalizedMessage = (notification: Notification): string => {
    if (notification.type === "wishlist_price_drop") {
      const msgData = tryParseJson(notification.message)
      if (msgData && msgData.newPrice) {
        return t.wishlistPriceDropMessage
          .replace("{newPrice}", msgData.newPrice)
          .replace("{oldPrice}", msgData.oldPrice || "")
          .replace(/\{currency\}/g, msgData.currency || "")
      }
      if (msgData && msgData.onSale) {
        const names = tryParseJson(notification.title)
        const productName = names ? (names[locale] || names.en) : ""
        return t.wishlistOnSale.replace("{product}", productName)
      }
    }
    if (notification.type === "wishlist_coupon") {
      const data = tryParseJson(notification.title)
      if (data?.code) {
        if (data.type === "percentage") {
          return t.wishlistCouponPercentage
            .replace("{code}", data.code)
            .replace("{value}", String(data.value))
        }
        return t.wishlistCouponFixed
          .replace("{code}", data.code)
          .replace("{value}", String(data.value))
          .replace("{currency}", data.currency || "")
      }
    }
    // Quote offer notifications
    if (notification.type === "quote_offer" || notification.type === "coupon") {
      const msgData = tryParseJson(notification.message)
      // Prefer admin message as preview text
      if (msgData?.adminMessage) {
        return msgData.adminMessage
      }
      if (msgData?.price) {
        if (msgData.hasCoupon) {
          return t.quoteOfferMessageWithCoupon.replace("{price}", msgData.price)
        }
        return t.quoteOfferMessage.replace("{price}", msgData.price)
      }
      // Legacy quote with quotedPrice field
      if (notification.quotedPrice) {
        const price = `€${parseFloat(notification.quotedPrice).toFixed(2)}`
        if (notification.type === "coupon") {
          return t.quoteOfferMessageWithCoupon.replace("{price}", price)
        }
        return t.quoteOfferMessage.replace("{price}", price)
      }
      return t.quoteOfferMessageGeneric
    }
    // Auto-scheduled notifications and coupon reminders
    if (notification.type.startsWith("auto_") || notification.type === "coupon_reminder") {
      const parsed = tryParseJson(notification.message)
      if (parsed && parsed[locale]) return parsed[locale]
      if (parsed && parsed.en) return parsed.en
    }
    return notification.message
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === "coupon") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-amber-400" />
        </div>
      )
    }
    if (notification.type === "admin_message") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-purple-400" />
        </div>
      )
    }
    if (notification.type === "wishlist_price_drop") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-red-400" />
        </div>
      )
    }
    if (notification.type === "wishlist_coupon") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-pink-400" />
        </div>
      )
    }
    if (notification.type === "auto_birthday") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
          <Cake className="w-5 h-5 text-pink-400" />
        </div>
      )
    }
    if (notification.type === "auto_christmas") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <TreePine className="w-5 h-5 text-red-400" />
        </div>
      )
    }
    if (notification.type === "auto_new_year") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <PartyPopper className="w-5 h-5 text-amber-400" />
        </div>
      )
    }
    if (notification.type === "auto_easter") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Egg className="w-5 h-5 text-purple-400" />
        </div>
      )
    }
    if (notification.type === "auto_custom") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-400" />
        </div>
      )
    }
    if (notification.type === "coupon_reminder") {
      return (
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-400" />
        </div>
      )
    }
    // quote_offer
    if (notification.productImage) {
      return (
        <img
          src={notification.productImage}
          alt={notification.productName || ""}
          className="shrink-0 w-10 h-10 rounded-lg object-cover"
        />
      )
    }
    return (
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-blue-400" />
      </div>
    )
  }

  const getNotificationLink = (notification: Notification) => {
    // For quote notifications, append quoteId to scroll to the quote on my-orders
    if ((notification.type === "quote_offer" || notification.type === "coupon") && notification.quoteId) {
      const baseLink = notification.link || "/my-orders"
      const separator = baseLink.includes("?") ? "&" : "?"
      return `${baseLink}${separator}quoteId=${notification.quoteId}`
    }
    if (notification.link) return notification.link
    if (notification.type === "coupon") return "/products"
    return "/my-orders"
  }

  const getModalGradient = (type: string) => {
    if (type === "auto_birthday") return "from-pink-500 to-rose-500"
    if (type === "auto_christmas") return "from-red-500 to-rose-600"
    if (type === "auto_new_year") return "from-amber-500 to-orange-500"
    if (type === "auto_easter") return "from-purple-500 to-violet-500"
    if (type === "auto_custom") return "from-blue-500 to-cyan-500"
    if (type === "coupon_reminder") return "from-amber-500 to-orange-500"
    return "from-indigo-500 to-purple-500"
  }

  const getModalContainerClasses = (type: string) => {
    const base = "relative w-full max-w-md max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl animate-fade-in-up overflow-hidden"
    if (type === "auto_birthday") return `${base} bg-[#231620] border border-pink-900/40`
    if (type === "auto_christmas") return `${base} bg-[#1c1214] border border-red-900/40`
    if (type === "auto_new_year") return `${base} bg-[#1c1710] border border-amber-900/40`
    if (type === "auto_easter") return `${base} bg-[#1a1420] border border-purple-900/40`
    if (type === "auto_custom") return `${base} bg-[#121720] border border-blue-900/40`
    if (type === "coupon_reminder") return `${base} bg-[#1c1710] border border-amber-900/40`
    return `${base} bg-[#14121e] border border-indigo-900/40`
  }

  const getModalIconBg = (type: string) => {
    if (type === "auto_birthday") return "bg-pink-500/15"
    if (type === "auto_christmas") return "bg-red-500/15"
    if (type === "auto_new_year") return "bg-amber-500/15"
    if (type === "auto_easter") return "bg-purple-500/15"
    if (type === "auto_custom") return "bg-blue-500/15"
    if (type === "coupon_reminder") return "bg-amber-500/15"
    return "bg-indigo-500/15"
  }

  const getModalIconColor = (type: string) => {
    if (type === "auto_birthday") return "text-pink-400"
    if (type === "auto_christmas") return "text-red-400"
    if (type === "auto_new_year") return "text-amber-400"
    if (type === "auto_easter") return "text-purple-400"
    if (type === "auto_custom") return "text-blue-400"
    if (type === "coupon_reminder") return "text-amber-400"
    return "text-indigo-400"
  }

  const getModalBadgeStyle = (type: string) => {
    if (type === "auto_birthday") return "bg-pink-500/20 text-pink-400"
    if (type === "auto_christmas") return "bg-red-500/20 text-red-400"
    if (type === "auto_new_year") return "bg-amber-500/20 text-amber-400"
    if (type === "auto_easter") return "bg-purple-500/20 text-purple-400"
    if (type === "auto_custom") return "bg-blue-500/20 text-blue-400"
    if (type === "coupon_reminder") return "bg-amber-500/20 text-amber-400"
    return "bg-indigo-500/20 text-indigo-400"
  }

  const getTypeLabel = (type: string) => {
    if (type === "auto_birthday") return t.autoBirthday
    if (type === "auto_christmas" || type === "auto_new_year" || type === "auto_easter") return t.autoHoliday
    if (type === "coupon_reminder") return t.couponReminder
    return t.autoCustom
  }

  const formatCouponExpiry = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getCountdownText = (expiresAt: string | null): string | null => {
    void countdownKey
    if (!expiresAt) return null
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    if (diffMs <= 0) return null

    const totalSeconds = Math.floor(diffMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, "0")

    if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return `${pad(minutes)}:${pad(seconds)}`
  }

  const isCouponExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() <= Date.now()
  }

  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
  }

  const hasUnread = notifications.some(n => !n.read)

  const renderNotificationItem = (notification: Notification) => {
    const content = (
      <>
        {getNotificationIcon(notification)}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${!notification.read ? "text-white" : "text-slate-300"}`}>
            {getLocalizedTitle(notification)}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {stripHtml(getLocalizedMessage(notification))}
          </p>

          {/* Coupon code with copy button */}
          {notification.couponCode && (
            <div className="flex items-center gap-1.5 mt-1">
              <code className="text-xs font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded whitespace-nowrap truncate">
                {notification.couponCode}
              </code>
              <button
                onClick={(e) => handleCopyCode(notification.couponCode!, e)}
                className="shrink-0 p-1.5 sm:p-1 rounded hover:bg-white/10 transition-colors touch-manipulation"
                title="Copy code"
              >
                {copiedCode === notification.couponCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </div>
          )}

          {/* Quote price */}
          {notification.quotedPrice && (
            <p className="text-sm text-emerald-400 font-semibold mt-1">
              €{parseFloat(notification.quotedPrice).toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-slate-500 shrink-0">
            {formatDate(notification.createdAt)}
          </span>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </div>
      </>
    )

    const className = `flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${!notification.read ? "bg-white/[0.02]" : ""}`

    // Auto notifications open modal instead of navigating
    if (isAutoNotification(notification.type)) {
      return (
        <div
          key={notification.id}
          role="button"
          tabIndex={0}
          onClick={() => handleAutoNotificationClick(notification)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleAutoNotificationClick(notification) } }}
          className={`${className} w-full text-left cursor-pointer`}
        >
          {content}
        </div>
      )
    }

    // All other notifications navigate via Link
    return (
      <Link
        key={notification.id}
        href={getNotificationLink(notification)}
        onClick={() => handleRegularNotificationClick(notification)}
        className={className}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 sm:p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
        title={t.notifications}
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {count > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold${hasUnread ? " animate-pulse" : ""}`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Menu — portaled to body to escape Header's backdrop-filter containing block */}
      {isOpen && createPortal(
        <div ref={portalDropdownRef} className="fixed left-1/2 -translate-x-1/2 top-[4.5rem] w-[calc(100vw-2rem)] max-w-80 sm:fixed sm:right-4 sm:left-auto sm:translate-x-0 sm:top-[4.5rem] sm:w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-[60] overflow-hidden max-h-[calc(100dvh-6rem)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-white">{t.notifications}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 sm:p-1 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{t.noNotifications}</p>
              </div>
            ) : (
              notifications.map((notification) => renderNotificationItem(notification))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/10">
              <Link
                href="/my-orders"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {t.viewAllInOrders}
              </Link>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Notification Detail Modal — portaled to body to escape Header's backdrop-filter containing block */}
      {selectedNotification && isAutoNotification(selectedNotification.type) && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-safe pb-safe"
          onClick={() => setSelectedNotification(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className={getModalContainerClasses(selectedNotification.type)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient line at top */}
            <div className={`h-1 w-full flex-shrink-0 bg-gradient-to-r ${getModalGradient(selectedNotification.type)}`} />

            {/* Close button */}
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-10 sm:h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all z-20 touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Icon + Type badge */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${getModalIconBg(selectedNotification.type)} flex items-center justify-center`}>
                  {(() => {
                    const iconClass = `w-6 h-6 sm:w-7 sm:h-7 ${getModalIconColor(selectedNotification.type)}`
                    switch (selectedNotification.type) {
                      case "auto_birthday": return <Cake className={iconClass} />
                      case "auto_christmas": return <TreePine className={iconClass} />
                      case "auto_new_year": return <PartyPopper className={iconClass} />
                      case "auto_easter": return <Egg className={iconClass} />
                      case "auto_custom": return <CalendarDays className={iconClass} />
                      case "coupon_reminder": return <Clock className={iconClass} />
                      default: return <Gift className={iconClass} />
                    }
                  })()}
                </div>
                <div className="min-w-0">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getModalBadgeStyle(selectedNotification.type)}`}>
                    {getTypeLabel(selectedNotification.type)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(selectedNotification.createdAt)}
                  </p>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 break-words">
                {getLocalizedTitle(selectedNotification)}
              </h2>

              {/* Full message */}
              <div
                className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5 sm:mb-6 prose prose-invert max-w-none prose-a:text-emerald-400 prose-a:underline prose-a:hover:text-emerald-300 prose-p:my-2 prose-headings:text-white"
                dangerouslySetInnerHTML={{ __html: getLocalizedMessage(selectedNotification) }}
              />

              {/* Coupon section */}
              {selectedNotification.couponCode && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 sm:p-4 mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                      {selectedNotification.couponType === "percentage" ? (
                        <span className="inline-flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {selectedNotification.couponValue}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          €{selectedNotification.couponValue}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Coupon code + copy */}
                  <div className="flex items-center gap-2">
                    <code className={`flex-1 text-base sm:text-lg font-mono font-bold text-amber-400 bg-amber-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-center sm:tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                      isCouponExpired(selectedNotification.couponExpiresAt) ? "opacity-50 line-through" : ""
                    }`}>
                      {selectedNotification.couponCode}
                    </code>
                    <button
                      onClick={() => handleCopyCodeModal(selectedNotification.couponCode!)}
                      className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors touch-manipulation"
                      title="Copy code"
                    >
                      {copiedCode === selectedNotification.couponCode ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-amber-400" />
                      )}
                    </button>
                  </div>

                  {/* Expiry countdown + date */}
                  {selectedNotification.couponExpiresAt && (() => {
                    const expired = isCouponExpired(selectedNotification.couponExpiresAt)
                    const countdownText = expired ? null : getCountdownText(selectedNotification.couponExpiresAt)
                    return (
                      <div className="mt-3 space-y-1">
                        {expired ? (
                          <div className="flex items-center justify-center gap-1.5 text-sm text-red-400 font-medium">
                            <X className="w-4 h-4" />
                            <span>{t.couponExpired}</span>
                          </div>
                        ) : countdownText ? (
                          <div className="flex items-center justify-center gap-1.5 text-sm text-red-400 font-mono font-bold animate-sale-blink">
                            <Clock className="w-4 h-4" />
                            <span>{countdownText}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                          <span>{t.couponExpires.replace("{date}", formatCouponExpiry(selectedNotification.couponExpiresAt))}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {selectedNotification.link && (
                  <Link
                    href={selectedNotification.link}
                    onClick={() => setSelectedNotification(null)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all touch-manipulation"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t.visitLink}
                  </Link>
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className={`flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium touch-manipulation ${
                    !selectedNotification.link ? "w-full" : ""
                  }`}
                >
                  {t.closeModal}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
