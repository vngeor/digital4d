"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Bell, X, MessageSquare, Ticket, Copy, Check } from "lucide-react"

interface Notification {
  id: string
  type: "quote_offer" | "admin_message" | "coupon"
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
  createdAt: string
  isLegacy: boolean
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
  }
}

export function NotificationBell({ translations: t }: NotificationBellProps) {
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
    if (notification.link) return notification.link
    if (notification.type === "coupon") return "/products"
    return "/my-orders"
  }

  const hasUnread = notifications.some(n => !n.read)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title={t.notifications}
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {count > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold${hasUnread ? " animate-pulse" : ""}`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-80 sm:absolute sm:right-0 sm:left-auto sm:translate-x-0 sm:top-auto sm:mt-2 sm:w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-white">{t.notifications}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{t.noNotifications}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${!notification.read ? "bg-white/[0.02]" : ""}`}
                >
                  {getNotificationIcon(notification)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!notification.read ? "text-white" : "text-slate-300"}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {notification.message}
                    </p>

                    {/* Coupon code with copy button */}
                    {notification.couponCode && (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                          {notification.couponCode}
                        </code>
                        <button
                          onClick={(e) => handleCopyCode(notification.couponCode!, e)}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors"
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
                </Link>
              ))
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
        </div>
      )}
    </div>
  )
}
