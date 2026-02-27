"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import {
  BellRing,
  Send,
  Trash2,
  Search,
  MessageSquare,
  Ticket,
  ShieldOff,
  Loader2,
  X,
  User,
  Users,
  Cake,
  Shield,
  Clock,
  ChevronDown,
  CalendarClock,
  Gift,
  Sparkles,
} from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { RichTextEditor } from "@/app/components/admin/RichTextEditor"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface NotificationUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface NotificationCoupon {
  id: string
  code: string
  type: string
  value: number
}

interface Notification {
  id: string
  type: "quote_offer" | "admin_message" | "coupon" | "auto_birthday" | "auto_christmas" | "auto_new_year" | "auto_easter" | "auto_custom" | "wishlist_price_drop" | "wishlist_coupon"
  title: string
  message: string
  link: string | null
  read: boolean
  readAt: string | null
  scheduledAt: string | null
  createdById: string | null
  createdAt: string
  user: NotificationUser
  coupon: NotificationCoupon | null
}

interface SearchUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface SearchCoupon {
  id: string
  code: string
  type: string
  value: number
}

const TYPE_BADGES: Record<string, { labelKey: string; color: string }> = {
  admin_message: { labelKey: "adminMessage", color: "bg-purple-500/20 text-purple-400" },
  coupon: { labelKey: "couponNotification", color: "bg-amber-500/20 text-amber-400" },
  quote_offer: { labelKey: "quoteOffer", color: "bg-blue-500/20 text-blue-400" },
  auto_birthday: { labelKey: "autoBirthday", color: "bg-pink-500/20 text-pink-400" },
  auto_christmas: { labelKey: "autoChristmas", color: "bg-red-500/20 text-red-400" },
  auto_new_year: { labelKey: "autoNewYear", color: "bg-amber-500/20 text-amber-400" },
  auto_easter: { labelKey: "autoEaster", color: "bg-purple-500/20 text-purple-400" },
  auto_custom: { labelKey: "autoCustom", color: "bg-blue-500/20 text-blue-400" },
}

const ROLES = ["ADMIN", "EDITOR", "AUTHOR", "SUBSCRIBER"] as const

export default function NotificationsPage() {
  const t = useTranslations("admin.notifications")
  const tAdmin = useTranslations("admin")
  const tTemplates = useTranslations("admin.notificationTemplates")
  const router = useRouter()
  const locale = useLocale()
  const { can } = useAdminPermissions()

  // Helper to parse JSON title/message and extract localized value
  const tryParseJson = (str: string): Record<string, string> | null => {
    try {
      const parsed = JSON.parse(str)
      if (parsed && typeof parsed === "object") return parsed
    } catch { /* not JSON */ }
    return null
  }

  const getLocalizedText = (text: string): string => {
    const parsed = tryParseJson(text)
    if (parsed) {
      return parsed[locale] || parsed.en || parsed.bg || text
    }
    return text
  }

  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
  }

  // List state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Delete state
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendForm, setSendForm] = useState({
    type: "admin_message" as "admin_message" | "coupon",
    title: "",
    message: "",
    link: "",
    couponExpiresAt: "",
  })
  const [sending, setSending] = useState(false)

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")

  // User selector state
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([])
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const userSearchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [allUsers, setAllUsers] = useState<SearchUser[]>([])
  const allUsersLoadedRef = useRef(false)

  // Quick filter state
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterLoading, setFilterLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  // Coupon selector state
  const [couponSearch, setCouponSearch] = useState("")
  const [couponResults, setCouponResults] = useState<SearchCoupon[]>([])
  const [couponSearchLoading, setCouponSearchLoading] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<SearchCoupon | null>(null)
  const [showCouponDropdown, setShowCouponDropdown] = useState(false)
  const couponSearchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Permission check
  if (!can("notifications", "view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">{t("noPermission")}</h2>
          <p className="text-sm text-gray-400 mt-1">{tAdmin("noPermissionDesc")}</p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white transition-colors"
        >
          {tAdmin("backToDashboard")}
        </button>
      </div>
    )
  }

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (selectedType === "scheduled") {
        params.set("status", "scheduled")
      } else if (selectedType) {
        params.set("type", selectedType)
      }
      params.set("page", String(page))
      params.set("limit", "10")

      const res = await fetch(`/api/admin/notifications?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setNotifications(data.notifications || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      toast.error(t("loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedType, page])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Close role dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load all users (cached, only fetches once)
  const loadAllUsers = useCallback(async () => {
    if (allUsersLoadedRef.current) {
      setUserResults(allUsers)
      return
    }
    setUserSearchLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to load users")
      const data = await res.json()
      const users = Array.isArray(data) ? data : data.users || []
      setAllUsers(users)
      allUsersLoadedRef.current = true
      setUserResults(users)
    } catch {
      setUserResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }, [allUsers])

  // Search users for the send modal
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      // When query is cleared, show all users from cache
      if (allUsersLoadedRef.current) {
        setUserResults(allUsers)
      } else {
        setUserResults([])
      }
      return
    }
    setUserSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Failed to search users")
      const data = await res.json()
      const users = Array.isArray(data) ? data : data.users || []
      setUserResults(users)
    } catch {
      setUserResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }, [allUsers])

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value)
    setActiveFilter(null)
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current)
    if (!value.trim()) {
      // Show all users from cache immediately when clearing
      if (allUsersLoadedRef.current) {
        setUserResults(allUsers)
      }
      return
    }
    userSearchTimeout.current = setTimeout(() => {
      searchUsers(value)
    }, 300)
  }

  // Quick filter: fetch users by filter
  const fetchFilteredUsers = useCallback(async (filter: string, role?: string) => {
    setFilterLoading(true)
    setActiveFilter(filter)
    setUserSearch("")
    try {
      const params = new URLSearchParams()
      if (filter.startsWith("birthday_")) {
        params.set("filter", filter)
      } else if (filter === "all") {
        // Fetch all users
      } else if (filter === "role" && role) {
        params.set("role", role)
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      const users = Array.isArray(data) ? data : data.users || []
      setUserResults(users)

      if (users.length === 0) {
        if (filter.startsWith("birthday_")) {
          toast.info(t("noBirthdayUsers"))
        } else if (filter === "role") {
          toast.info(t("noUsersInRole"))
        }
      }
    } catch {
      setUserResults([])
      toast.error(t("loadFailed"))
    } finally {
      setFilterLoading(false)
    }
  }, [t])

  // Quick filter: All Users with count confirmation
  const handleAllUsersFilter = useCallback(async () => {
    setFilterLoading(true)
    try {
      const res = await fetch("/api/admin/users?countOnly=true")
      if (!res.ok) throw new Error("Failed to count users")
      const data = await res.json()
      const count = data.count || 0

      if (count === 0) {
        toast.info(t("noUsersFound"))
        setFilterLoading(false)
        return
      }

      // Confirm before loading all users
      if (confirm(t("allUsersConfirm", { count }))) {
        await fetchFilteredUsers("all")
      } else {
        setFilterLoading(false)
      }
    } catch {
      toast.error(t("loadFailed"))
      setFilterLoading(false)
    }
  }, [t, fetchFilteredUsers])

  // Search coupons for the send modal
  const searchCoupons = useCallback(async (query: string) => {
    setCouponSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/coupons?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Failed to search coupons")
      const data = await res.json()
      const coupons = Array.isArray(data) ? data : data.coupons || []
      setCouponResults(coupons)
    } catch {
      setCouponResults([])
    } finally {
      setCouponSearchLoading(false)
    }
  }, [])

  const handleCouponSearchChange = (value: string) => {
    setCouponSearch(value)
    if (couponSearchTimeout.current) clearTimeout(couponSearchTimeout.current)
    couponSearchTimeout.current = setTimeout(() => {
      searchCoupons(value)
    }, 300)
  }

  // Toggle user selection
  const toggleUserSelection = (user: SearchUser) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id)
      if (exists) {
        return prev.filter((u) => u.id !== user.id)
      }
      return [...prev, user]
    })
  }

  // Remove selected user
  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  // Select all visible users
  const handleSelectAll = () => {
    if (selectAllChecked) {
      // Deselect all visible results
      const resultIds = new Set(userResults.map((u) => u.id))
      setSelectedUsers((prev) => prev.filter((u) => !resultIds.has(u.id)))
      setSelectAllChecked(false)
    } else {
      // Select all visible results
      setSelectedUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id))
        const newUsers = userResults.filter((u) => !existingIds.has(u.id))
        return [...prev, ...newUsers]
      })
      setSelectAllChecked(true)
    }
  }

  // Update select-all state when results or selection changes
  useEffect(() => {
    if (userResults.length === 0) {
      setSelectAllChecked(false)
      return
    }
    const allSelected = userResults.every((u) => selectedUsers.some((s) => s.id === u.id))
    setSelectAllChecked(allSelected)
  }, [userResults, selectedUsers])

  // Send notification
  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error(t("noUsersSelected"))
      return
    }
    if (!sendForm.title.trim()) {
      toast.error(t("titleRequired"))
      return
    }
    const plainMessage = sendForm.message.replace(/<[^>]*>/g, "").trim()
    if (!plainMessage) {
      toast.error(t("messageRequired"))
      return
    }

    setSending(true)
    try {
      const body: Record<string, unknown> = {
        userIds: selectedUsers.map((u) => u.id),
        type: sendForm.type,
        title: sendForm.title.trim(),
        message: sendForm.message,
      }
      if (sendForm.link.trim()) body.link = sendForm.link.trim()
      if (sendForm.type === "coupon" && selectedCoupon) body.couponId = selectedCoupon.id
      if (sendForm.type === "coupon" && selectedCoupon && sendForm.couponExpiresAt) {
        body.couponExpiresAt = new Date(sendForm.couponExpiresAt).toISOString()
      }
      if (scheduleEnabled && scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString()

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "An error occurred" }))
        toast.error(err.error || t("sendFailed"))
        setSending(false)
        return
      }

      toast.success(scheduleEnabled ? t("scheduledSuccess") : t("sentSuccess"))
      resetSendForm()
      setShowSendModal(false)
      fetchNotifications()
    } catch {
      toast.error(t("sendFailed"))
    } finally {
      setSending(false)
    }
  }

  // Reset form
  const resetSendForm = () => {
    setSendForm({ type: "admin_message", title: "", message: "", link: "", couponExpiresAt: "" })
    setSelectedUsers([])
    setUserSearch("")
    setUserResults([])
    setSelectedCoupon(null)
    setCouponSearch("")
    setCouponResults([])
    setShowCouponDropdown(false)
    setScheduleEnabled(false)
    setScheduledAt("")
    setActiveFilter(null)
    setShowRoleDropdown(false)
  }

  // Delete notification
  const handleDelete = (id: string, title: string) => {
    setDeleteItem({ id, name: title })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    try {
      const res = await fetch(`/api/admin/notifications?id=${deleteItem.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "An error occurred" }))
        toast.error(err.error || t("deleteFailed"))
        setDeleteItem(null)
        return
      }
      setDeleteItem(null)
      toast.success(t("deletedSuccess"))
      fetchNotifications()
    } catch {
      toast.error(t("deleteFailed"))
      setDeleteItem(null)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Format coupon value display
  const formatCouponValue = (coupon: SearchCoupon | NotificationCoupon) => {
    if (coupon.type === "percentage") return `${coupon.value}%`
    return `${coupon.value}`
  }

  // Check if notification is scheduled (future)
  const isScheduled = (item: Notification) => {
    return item.scheduledAt && new Date(item.scheduledAt) > new Date()
  }

  // Table columns
  const columns = [
    {
      key: "recipient",
      header: t("recipients"),
      className: "w-[200px]",
      render: (item: Notification) => (
        <div className="flex items-center gap-2.5">
          {item.user.image ? (
            <img
              src={item.user.image}
              alt={item.user.name || ""}
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {item.user.name?.charAt(0) || item.user.email?.charAt(0) || "U"}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-white text-sm truncate">{item.user.name || t("anonymous")}</p>
            <p className="text-xs text-gray-500 truncate">{item.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: t("type"),
      className: "w-[110px]",
      render: (item: Notification) => {
        const badge = TYPE_BADGES[item.type] || TYPE_BADGES.admin_message
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color} inline-block w-fit whitespace-nowrap`}>
              {t(badge.labelKey)}
            </span>
            {isScheduled(item) && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 inline-flex items-center gap-1 w-fit whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {t("scheduled")}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "title",
      header: t("titleField"),
      className: "min-w-[120px] max-w-[180px]",
      render: (item: Notification) => {
        const localized = stripHtml(getLocalizedText(item.title))
        return (
          <p className="text-white text-sm truncate" title={localized}>
            {localized}
          </p>
        )
      },
    },
    {
      key: "message",
      header: t("messageField"),
      className: "min-w-[140px] max-w-[220px] hidden md:table-cell",
      render: (item: Notification) => {
        const localized = stripHtml(getLocalizedText(item.message))
        return (
          <p className="text-gray-400 text-sm truncate" title={localized}>
            {localized}
          </p>
        )
      },
    },
    {
      key: "coupon",
      header: t("couponNotification"),
      className: "w-[140px] hidden lg:table-cell",
      render: (item: Notification) =>
        item.coupon ? (
          <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded whitespace-nowrap">
            {item.coupon.code}
          </span>
        ) : (
          <span className="text-gray-600 text-sm">-</span>
        ),
    },
    {
      key: "read",
      header: t("readStatus"),
      className: "w-[100px]",
      render: (item: Notification) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isScheduled(item) ? "bg-cyan-400" : item.read ? "bg-emerald-400" : "bg-gray-500"
            }`}
          />
          <span className={`text-xs whitespace-nowrap ${
            isScheduled(item) ? "text-cyan-400" : item.read ? "text-emerald-400" : "text-gray-500"
          }`}>
            {isScheduled(item) ? t("scheduled") : item.read ? t("read") : t("unread")}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: t("sentAt"),
      className: "w-[160px] hidden lg:table-cell",
      render: (item: Notification) => (
        <div>
          <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(item.createdAt)}</span>
          {isScheduled(item) && item.scheduledAt && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400 text-xs whitespace-nowrap">{formatDate(item.scheduledAt)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      render: (item: Notification) => (
        <div className="flex items-center gap-1">
          {can("notifications", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, stripHtml(getLocalizedText(item.title)))
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              title={t("delete")}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      ),
    },
  ]

  // Filter tabs — added "scheduled" and "auto"
  const typeFilters = [
    { key: null, label: t("all"), icon: null },
    { key: "admin_message", label: t("adminMessage"), icon: MessageSquare },
    { key: "coupon", label: t("couponNotification"), icon: Ticket },
    { key: "quote_offer", label: t("quoteOffer"), icon: BellRing },
    { key: "auto", label: t("auto"), icon: Sparkles },
    { key: "scheduled", label: t("scheduled"), icon: Clock },
  ]

  // Minimum datetime for schedule picker (now + 5 minutes)
  const minScheduleDate = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    return d.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30">
          <BellRing className="w-4 h-4" />
          {t("title")}
        </div>
        <Link
          href="/admin/notification-templates"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <CalendarClock className="w-4 h-4" />
          {tTemplates("title")}
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">{t("subtitle")}</p>
        </div>
        {can("notifications", "create") && (
          <button
            onClick={() => {
              resetSendForm()
              setShowSendModal(true)
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all text-sm sm:text-base"
          >
            <Send className="w-5 h-5" />
            {t("sendNotification")}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {typeFilters.map((filter) => (
          <button
            key={filter.key || "all"}
            onClick={() => {
              setSelectedType(filter.key)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedType === filter.key
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {filter.icon && <filter.icon className="w-4 h-4" />}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonDataTable columns={7} />
      ) : (
        <DataTable
          data={notifications}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noNotifications")}
          renderMobileCard={(item: Notification) => {
            const badge = TYPE_BADGES[item.type] || TYPE_BADGES.admin_message
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.user.image ? (
                      <img src={item.user.image} alt={item.user.name || ""} className="w-8 h-8 rounded-full shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {item.user.name?.charAt(0) || item.user.email?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.user.name || t("anonymous")}</p>
                      <p className="text-xs text-gray-500 truncate">{item.user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(item.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                    {t(badge.labelKey)}
                  </span>
                  {isScheduled(item) && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("scheduled")}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isScheduled(item) ? "bg-cyan-400" : item.read ? "bg-emerald-400" : "bg-gray-500"}`} />
                    <span className={`text-xs ${isScheduled(item) ? "text-cyan-400" : item.read ? "text-emerald-400" : "text-gray-500"}`}>
                      {isScheduled(item) ? t("scheduled") : item.read ? t("read") : t("unread")}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white truncate">{stripHtml(getLocalizedText(item.title))}</p>
                <p className="text-sm text-gray-400 truncate">{stripHtml(getLocalizedText(item.message))}</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {item.coupon && (
                      <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {item.coupon.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {can("notifications", "delete") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, stripHtml(getLocalizedText(item.title))) }}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )
          }}
        />
      )}

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-white/10 w-full max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-emerald-400" />
                {t("sendNotification")}
              </h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t("recipients")}
                </label>

                {/* Selected Users Tags */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedUsers.length <= 10 ? (
                      selectedUsers.map((user) => (
                        <span
                          key={user.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
                        >
                          {user.image ? (
                            <img src={user.image} alt="" className="w-4 h-4 rounded-full" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                          {user.name || user.email}
                          <button
                            onClick={() => removeSelectedUser(user.id)}
                            className="hover:text-red-400 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                        <Users className="w-4 h-4" />
                        {t("selectedCount", { count: selectedUsers.length })}
                        <button
                          onClick={() => setSelectedUsers([])}
                          className="hover:text-red-400 transition-colors ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                )}

                {/* Quick Filter Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Birthday Today */}
                  <button
                    type="button"
                    onClick={() => fetchFilteredUsers("birthday_today")}
                    disabled={filterLoading}
                    className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === "birthday_today"
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Cake className="w-3.5 h-3.5" />
                    {t("birthdayToday")}
                  </button>

                  {/* Birthday This Week */}
                  <button
                    type="button"
                    onClick={() => fetchFilteredUsers("birthday_week")}
                    disabled={filterLoading}
                    className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === "birthday_week"
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Cake className="w-3.5 h-3.5" />
                    {t("birthdayThisWeek")}
                  </button>

                  {/* Birthday This Month */}
                  <button
                    type="button"
                    onClick={() => fetchFilteredUsers("birthday_month")}
                    disabled={filterLoading}
                    className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === "birthday_month"
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Cake className="w-3.5 h-3.5" />
                    {t("birthdayThisMonth")}
                  </button>

                  {/* All Users */}
                  <button
                    type="button"
                    onClick={handleAllUsersFilter}
                    disabled={filterLoading}
                    className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === "all"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {t("allUsers")}
                  </button>

                  {/* By Role Dropdown */}
                  <div className="relative" ref={roleDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      disabled={filterLoading}
                      className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeFilter?.startsWith("role_")
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {t("byRole")}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showRoleDropdown && (
                      <div className="absolute z-20 mt-1 w-40 rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
                        {ROLES.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setShowRoleDropdown(false)
                              setActiveFilter(`role_${role}`)
                              fetchFilteredUsers("role", role)
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Filter Indicator */}
                {activeFilter && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">{t("filterActive")}:</span>
                    <span className="text-xs text-emerald-400 font-medium">
                      {activeFilter === "birthday_today" && t("birthdayToday")}
                      {activeFilter === "birthday_week" && t("birthdayThisWeek")}
                      {activeFilter === "birthday_month" && t("birthdayThisMonth")}
                      {activeFilter === "all" && t("allUsers")}
                      {activeFilter?.startsWith("role_") && activeFilter.replace("role_", "")}
                    </span>
                    <span className="text-xs text-gray-500">({userResults.length})</span>
                    <button
                      onClick={() => {
                        setActiveFilter(null)
                        setUserResults([])
                      }}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* User Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleUserSearchChange(e.target.value)}
                    onFocus={() => {
                      if (!activeFilter) {
                        loadAllUsers()
                      }
                    }}
                    placeholder={t("searchUsers")}
                    className="w-full pl-9 pr-9 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  {userSearchLoading || filterLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                  ) : userSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSearch("")
                        setActiveFilter(null)
                        // Show all users from cache when clearing
                        if (allUsersLoadedRef.current) {
                          setUserResults(allUsers)
                        } else {
                          setUserResults([])
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                {/* User Results */}
                {userResults.length > 0 && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-white/5">
                    {/* Select All / Deselect All */}
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="flex items-center gap-3 px-3 py-2 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors w-full text-left"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectAllChecked
                          ? "bg-emerald-500 border-emerald-500"
                          : userResults.some(u => selectedUsers.some(s => s.id === u.id))
                            ? "bg-emerald-500/50 border-emerald-500"
                            : "border-gray-500"
                      }`}>
                        {selectAllChecked ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : userResults.some(u => selectedUsers.some(s => s.id === u.id)) ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                        ) : null}
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {selectAllChecked ? t("deselectAll") : t("selectAll")} ({userResults.length})
                      </span>
                    </button>

                    {/* User List */}
                    {userResults.map((user) => {
                      const isSelected = selectedUsers.some((u) => u.id === user.id)
                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors ${
                            isSelected ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(user)}
                            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            {user.image ? (
                              <img src={user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{user.name || t("anonymous")}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                {selectedUsers.length === 0 && userSearch && userResults.length === 0 && !userSearchLoading && (
                  <p className="text-xs text-gray-500 mt-2">{t("noUsersFound")}</p>
                )}
              </div>

              {/* Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("type")}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSendForm({ ...sendForm, type: "admin_message" })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all ${
                      sendForm.type === "admin_message"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t("adminMessage")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendForm({ ...sendForm, type: "coupon" })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all ${
                      sendForm.type === "coupon"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    {t("couponNotification")}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("titleField")}
                </label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder={t("titleField")}
                  className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("messageField")}
                </label>
                <RichTextEditor
                  value={sendForm.message}
                  onChange={(html) => setSendForm({ ...sendForm, message: html })}
                />
              </div>

              {/* Coupon Picker (when type=coupon) */}
              {sendForm.type === "coupon" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("attachCoupon")}
                  </label>

                  {/* Selected Coupon Tag */}
                  {selectedCoupon && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                        <Ticket className="w-3.5 h-3.5" />
                        <span className="font-mono font-medium">{selectedCoupon.code}</span>
                        <span className="text-amber-400/60">
                          ({selectedCoupon.type === "percentage" ? `${selectedCoupon.value}%` : selectedCoupon.value})
                        </span>
                        <button
                          onClick={() => setSelectedCoupon(null)}
                          className="hover:text-red-400 transition-colors ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  )}

                  {!selectedCoupon && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={couponSearch}
                        onChange={(e) => {
                          handleCouponSearchChange(e.target.value)
                          setShowCouponDropdown(true)
                        }}
                        onFocus={() => {
                          setShowCouponDropdown(true)
                          if (!couponSearch) searchCoupons("")
                        }}
                        placeholder={t("searchCoupons")}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      {couponSearchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                      )}

                      {/* Coupon Dropdown */}
                      {showCouponDropdown && couponResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
                          {couponResults.map((coupon) => (
                            <button
                              key={coupon.id}
                              onClick={() => {
                                setSelectedCoupon(coupon)
                                setShowCouponDropdown(false)
                                setCouponSearch("")
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                            >
                              <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="font-mono text-sm text-amber-400">{coupon.code}</span>
                              <span className="text-xs text-gray-500">
                                {coupon.type} - {formatCouponValue(coupon)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Coupon Expiration Date */}
              {sendForm.type === "coupon" && selectedCoupon && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("couponExpiresAtLabel")}
                  </label>
                  <input
                    type="datetime-local"
                    value={sendForm.couponExpiresAt}
                    onChange={(e) => setSendForm({ ...sendForm, couponExpiresAt: e.target.value })}
                    min={minScheduleDate()}
                    className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("couponExpiresAtHint")}</p>
                </div>
              )}

              {/* Optional Link */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("linkUrl")}
                  <span className="text-gray-600 ml-1">({t("optionalLink")})</span>
                </label>
                <input
                  type="url"
                  value={sendForm.link}
                  onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Schedule Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      scheduleEnabled ? "bg-cyan-500" : "bg-white/10"
                    }`}
                    onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        scheduleEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("scheduleForLater")}
                  </span>
                </label>

                {scheduleEnabled && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={minScheduleDate()}
                      className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]"
                    />
                    {scheduledAt && (
                      <p className="text-xs text-cyan-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t("scheduledFor")}: {formatDate(scheduledAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || selectedUsers.length === 0 || !sendForm.title.trim() || !sendForm.message.replace(/<[^>]*>/g, "").trim() || (scheduleEnabled && !scheduledAt)}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    scheduleEnabled
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-cyan-500/30"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-emerald-500/30"
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : scheduleEnabled ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {selectedUsers.length > 0
                    ? `${scheduleEnabled ? t("schedule") : t("send")} (${selectedUsers.length})`
                    : scheduleEnabled ? t("schedule") : t("send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { name: deleteItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}
