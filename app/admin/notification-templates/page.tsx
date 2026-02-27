"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  CalendarClock,
  BellRing,
  Plus,
  Pencil,
  Trash2,
  Send,
  Loader2,
  X,
  Search,
  Cake,
  TreePine,
  PartyPopper,
  Egg,
  CalendarDays,
  Ticket,
  ShieldOff,
  ChevronDown,
  Check,
  Gift,
} from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { RichTextEditor } from "@/app/components/admin/RichTextEditor"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

type Locale = "bg" | "en" | "es"

interface Template {
  id: string
  name: string
  trigger: string
  daysBefore: number
  customMonth: number | null
  customDay: number | null
  recurring: boolean
  titleBg: string
  titleEn: string
  titleEs: string
  messageBg: string
  messageEn: string
  messageEs: string
  link: string | null
  couponEnabled: boolean
  couponType: string | null
  couponValue: number | null
  couponCurrency: string | null
  couponDuration: number | null
  couponPerUser: number
  couponProductIds: string[]
  couponAllowOnSale: boolean
  couponMinPurchase: number | null
  couponExpiryMode: string | null
  couponExpiresAt: string | null
  active: boolean
  lastRunAt: string | null
  lastRunCount: number
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
  _count: { sendLogs: number }
}

interface ProductOption {
  id: string
  nameEn: string
  nameBg: string
  image: string | null
}

interface SearchUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

const TRIGGER_BADGES: Record<string, { icon: LucideIcon; color: string }> = {
  birthday: { icon: Cake, color: "bg-pink-500/20 text-pink-400" },
  christmas: { icon: TreePine, color: "bg-red-500/20 text-red-400" },
  new_year: { icon: PartyPopper, color: "bg-amber-500/20 text-amber-400" },
  orthodox_easter: { icon: Egg, color: "bg-purple-500/20 text-purple-400" },
  custom_date: { icon: CalendarDays, color: "bg-blue-500/20 text-blue-400" },
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const emptyForm = {
  name: "",
  trigger: "birthday",
  daysBefore: 7,
  customMonth: 1,
  customDay: 1,
  recurring: true,
  titleBg: "",
  titleEn: "",
  titleEs: "",
  messageBg: "",
  messageEn: "",
  messageEs: "",
  link: "",
  couponEnabled: false,
  couponType: "percentage",
  couponValue: "",
  couponCurrency: "EUR",
  couponDuration: 30,
  couponExpiryMode: "duration",
  couponExpiresAt: "",
  couponPerUser: 1,
  couponProductIds: [] as string[],
  couponAllowOnSale: false,
  couponMinPurchase: "",
  active: true,
}

export default function NotificationTemplatesPage() {
  const t = useTranslations("admin.notificationTemplates")
  const tNotif = useTranslations("admin.notifications")
  const tAdmin = useTranslations("admin")
  const locale = useLocale() as Locale
  const { can } = useAdminPermissions()

  // List state
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("en")

  // Delete state
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  // Test send state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testTemplateId, setTestTemplateId] = useState<string | null>(null)
  const [testUserId, setTestUserId] = useState("")
  const [testUserSearch, setTestUserSearch] = useState("")
  const [testUserResults, setTestUserResults] = useState<SearchUser[]>([])
  const [testSearching, setTestSearching] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const testSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Product picker state
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<ProductOption[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const allProductsLoadedRef = useRef(false)
  const productSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Test user picker cache
  const [allTestUsers, setAllTestUsers] = useState<SearchUser[]>([])
  const allTestUsersLoadedRef = useRef(false)

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notification-templates")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTemplates(data)
    } catch {
      toast.error(t("loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Load all products for picker
  const loadAllProducts = useCallback(async () => {
    if (allProductsLoadedRef.current) return
    setSearchingProducts(true)
    try {
      const res = await fetch("/api/admin/products")
      if (res.ok) {
        const data = await res.json()
        const products = Array.isArray(data) ? data : []
        const mapped = products.map((p: ProductOption & Record<string, unknown>) => ({
          id: p.id,
          nameEn: p.nameEn,
          nameBg: p.nameBg,
          image: p.image,
        }))
        setAllProducts(mapped)
        setProductResults(mapped)
        allProductsLoadedRef.current = true
      }
    } catch {
      setProductResults([])
    } finally {
      setSearchingProducts(false)
    }
  }, [])

  // Search products
  const searchProducts = useCallback(
    (query: string) => {
      if (productSearchTimeoutRef.current) clearTimeout(productSearchTimeoutRef.current)
      if (!query.trim()) {
        if (allProductsLoadedRef.current) setProductResults(allProducts)
        return
      }
      productSearchTimeoutRef.current = setTimeout(async () => {
        setSearchingProducts(true)
        try {
          const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}`)
          if (res.ok) {
            const data = await res.json()
            const products = Array.isArray(data) ? data : []
            setProductResults(
              products.slice(0, 20).map((p: ProductOption & Record<string, unknown>) => ({
                id: p.id,
                nameEn: p.nameEn,
                nameBg: p.nameBg,
                image: p.image,
              }))
            )
          }
        } catch { /* empty */ } finally {
          setSearchingProducts(false)
        }
      }, 300)
    },
    [allProducts]
  )

  // Load all test users
  const loadAllTestUsers = useCallback(async () => {
    if (allTestUsersLoadedRef.current) {
      setTestUserResults(allTestUsers)
      return
    }
    setTestSearching(true)
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        const users = Array.isArray(data) ? data : []
        const mapped = users.map((u: SearchUser) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
        }))
        setAllTestUsers(mapped)
        setTestUserResults(mapped)
        allTestUsersLoadedRef.current = true
      }
    } catch {
      setTestUserResults([])
    } finally {
      setTestSearching(false)
    }
  }, [allTestUsers])

  // Search test users
  const searchTestUsers = useCallback(
    (query: string) => {
      if (testSearchTimeoutRef.current) clearTimeout(testSearchTimeoutRef.current)
      if (!query.trim()) {
        if (allTestUsersLoadedRef.current) setTestUserResults(allTestUsers)
        return
      }
      testSearchTimeoutRef.current = setTimeout(async () => {
        setTestSearching(true)
        try {
          const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`)
          if (res.ok) {
            const data = await res.json()
            setTestUserResults(
              (Array.isArray(data) ? data : []).slice(0, 20).map((u: SearchUser) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                image: u.image,
              }))
            )
          }
        } catch { /* empty */ } finally {
          setTestSearching(false)
        }
      }, 300)
    },
    [allTestUsers]
  )

  // Open create modal
  const openCreate = () => {
    setEditingTemplate(null)
    setForm({ ...emptyForm })
    setActiveTab("en")
    setShowModal(true)
  }

  // Open edit modal
  const openEdit = (template: Template) => {
    setEditingTemplate(template)
    setForm({
      name: template.name,
      trigger: template.trigger,
      daysBefore: template.daysBefore,
      customMonth: template.customMonth || 1,
      customDay: template.customDay || 1,
      recurring: template.recurring,
      titleBg: template.titleBg,
      titleEn: template.titleEn,
      titleEs: template.titleEs,
      messageBg: template.messageBg,
      messageEn: template.messageEn,
      messageEs: template.messageEs,
      link: template.link || "",
      couponEnabled: template.couponEnabled,
      couponType: template.couponType || "percentage",
      couponValue: template.couponValue != null ? String(template.couponValue) : "",
      couponCurrency: template.couponCurrency || "EUR",
      couponDuration: template.couponDuration || 30,
      couponExpiryMode: template.couponExpiryMode || "duration",
      couponExpiresAt: template.couponExpiresAt ? new Date(template.couponExpiresAt).toISOString().slice(0, 16) : "",
      couponPerUser: template.couponPerUser,
      couponProductIds: template.couponProductIds || [],
      couponAllowOnSale: template.couponAllowOnSale,
      couponMinPurchase: template.couponMinPurchase != null ? String(template.couponMinPurchase) : "",
      active: template.active,
    })
    setActiveTab("en")
    setShowModal(true)
  }

  // Save template
  const handleSave = async () => {
    if (!form.name.trim() || !form.titleEn.trim() || !form.messageEn.trim()) {
      toast.error(t("saveFailed"))
      return
    }
    if (form.couponEnabled && !form.couponValue) {
      toast.error("Coupon value is required when auto-coupon is enabled")
      return
    }
    setSaving(true)
    try {
      const body = {
        ...(editingTemplate ? { id: editingTemplate.id } : {}),
        name: form.name,
        trigger: form.trigger,
        daysBefore: form.daysBefore,
        customMonth: form.trigger === "custom_date" ? form.customMonth : null,
        customDay: form.trigger === "custom_date" ? form.customDay : null,
        recurring: form.recurring,
        titleBg: form.titleBg || form.titleEn,
        titleEn: form.titleEn,
        titleEs: form.titleEs || form.titleEn,
        messageBg: form.messageBg || form.messageEn,
        messageEn: form.messageEn,
        messageEs: form.messageEs || form.messageEn,
        link: form.link || null,
        couponEnabled: form.couponEnabled,
        couponType: form.couponEnabled ? form.couponType : null,
        couponValue: form.couponEnabled && form.couponValue ? parseFloat(form.couponValue) : null,
        couponCurrency: form.couponEnabled ? form.couponCurrency : null,
        couponDuration: form.couponEnabled ? form.couponDuration : null,
        couponExpiryMode: form.couponEnabled ? form.couponExpiryMode : null,
        couponExpiresAt: form.couponEnabled && form.couponExpiryMode === "date" && form.couponExpiresAt
          ? new Date(form.couponExpiresAt).toISOString() : null,
        couponPerUser: form.couponEnabled ? form.couponPerUser : 1,
        couponProductIds: form.couponEnabled ? form.couponProductIds : [],
        couponAllowOnSale: form.couponEnabled ? form.couponAllowOnSale : false,
        couponMinPurchase: form.couponEnabled && form.couponMinPurchase ? parseFloat(form.couponMinPurchase) : null,
        active: form.active,
      }

      const res = await fetch("/api/admin/notification-templates", {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        let errorMsg = "Failed to save"
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {
          // response not JSON
        }
        throw new Error(errorMsg)
      }

      toast.success(editingTemplate ? t("updatedSuccess") : t("createdSuccess"))
      setShowModal(false)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  // Delete template
  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      const res = await fetch(`/api/admin/notification-templates?id=${deleteItem.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success(t("deletedSuccess"))
      setDeleteItem(null)
      fetchTemplates()
    } catch {
      toast.error(t("deleteFailed"))
    }
  }

  // Test send
  const handleTestSend = async () => {
    if (!testTemplateId || !testUserId) return
    setTestSending(true)
    try {
      const res = await fetch("/api/admin/notification-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: testTemplateId, userId: testUserId }),
      })
      if (!res.ok) throw new Error()
      toast.success(t("testSendSuccess"))
      setShowTestModal(false)
      setTestTemplateId(null)
      setTestUserId("")
      setTestUserSearch("")
    } catch {
      toast.error(t("testSendFailed"))
    } finally {
      setTestSending(false)
    }
  }

  // Get schedule description
  const getScheduleText = (template: Template) => {
    const { trigger, daysBefore, customMonth, customDay, recurring } = template
    if (trigger === "birthday") {
      return daysBefore > 0 ? t("daysBeforeBirthday", { days: daysBefore }) : t("triggerBirthday")
    }
    if (trigger === "christmas") {
      const date = "Dec 25"
      return daysBefore > 0 ? t("daysBeforeDate", { days: daysBefore, date }) : t("onDate", { date })
    }
    if (trigger === "new_year") {
      const date = "Jan 1"
      return daysBefore > 0 ? t("daysBeforeDate", { days: daysBefore, date }) : t("onDate", { date })
    }
    if (trigger === "orthodox_easter") {
      const date = t("triggerOrthodoxEaster")
      return daysBefore > 0 ? t("daysBeforeDate", { days: daysBefore, date }) : t("onDate", { date })
    }
    if (trigger === "custom_date" && customMonth && customDay) {
      const date = `${MONTHS[customMonth - 1]} ${customDay}`
      const text = daysBefore > 0 ? t("daysBeforeDate", { days: daysBefore, date }) : t("onDate", { date })
      return recurring ? text : `${text} (${t("oneTime")})`
    }
    return ""
  }

  // Get coupon display
  const getCouponText = (template: Template) => {
    if (!template.couponEnabled) return t("noCoupon")
    if (template.couponType === "percentage") return `${template.couponValue}%`
    return `${template.couponValue} ${template.couponCurrency || "EUR"}`
  }

  // Permission check
  if (!can("notifications", "view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldOff className="w-16 h-16 text-gray-500 mx-auto" />
          <p className="text-gray-400">{tNotif("noPermission")}</p>
        </div>
      </div>
    )
  }

  // Table columns
  const columns = [
    {
      key: "name" as keyof Template,
      header: t("name"),
      render: (item: Template) => (
        <span className="font-medium text-white">{item.name}</span>
      ),
    },
    {
      key: "trigger" as keyof Template,
      header: t("trigger"),
      render: (item: Template) => {
        const badge = TRIGGER_BADGES[item.trigger]
        if (!badge) return item.trigger
        const Icon = badge.icon
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {t(`trigger${item.trigger.charAt(0).toUpperCase() + item.trigger.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as Parameters<typeof t>[0])}
          </span>
        )
      },
    },
    {
      key: "daysBefore" as keyof Template,
      header: t("schedule"),
      render: (item: Template) => (
        <span className="text-sm text-gray-300">{getScheduleText(item)}</span>
      ),
    },
    {
      key: "couponEnabled" as keyof Template,
      header: t("coupon"),
      render: (item: Template) => (
        <span className={`text-sm ${item.couponEnabled ? "text-emerald-400" : "text-gray-500"}`}>
          {item.couponEnabled ? (
            <span className="inline-flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              {getCouponText(item)}
            </span>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "lastRunAt" as keyof Template,
      header: t("lastRun"),
      render: (item: Template) => (
        <div className="text-sm">
          {item.lastRunAt ? (
            <>
              <span className="text-gray-300">
                {new Date(item.lastRunAt).toLocaleDateString(locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-GB")}
              </span>
              <span className="text-gray-500 ml-1">({t("lastRunCount", { count: item.lastRunCount })})</span>
            </>
          ) : (
            <span className="text-gray-500">{t("never")}</span>
          )}
        </div>
      ),
    },
    {
      key: "active" as keyof Template,
      header: t("status"),
      render: (item: Template) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.active ? "text-emerald-400" : "text-gray-500"}`}>
          <span className={`w-2 h-2 rounded-full ${item.active ? "bg-emerald-400" : "bg-gray-500"}`} />
          {item.active ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      key: "actions" as keyof Template,
      header: t("actions"),
      render: (item: Template) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {can("notifications", "edit") && (
            <button
              onClick={() => openEdit(item)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={t("editTemplate")}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {can("notifications", "create") && (
            <button
              onClick={() => {
                setTestTemplateId(item.id)
                setTestUserId("")
                setTestUserSearch("")
                setTestUserResults([])
                setShowTestModal(true)
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors"
              title={t("testSend")}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {can("notifications", "delete") && (
            <button
              onClick={() => setDeleteItem({ id: item.id, name: item.name })}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
              title={t("delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  // Mobile card renderer
  const renderMobileCard = (item: Template) => {
    const badge = TRIGGER_BADGES[item.trigger]
    const Icon = badge?.icon || CalendarDays
    return (
      <div className="glass-strong rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-white">{item.name}</h3>
            <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge?.color || "bg-gray-500/20 text-gray-400"}`}>
              <Icon className="w-3 h-3" />
              {t(`trigger${item.trigger.charAt(0).toUpperCase() + item.trigger.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.active ? "text-emerald-400" : "text-gray-500"}`}>
            <span className={`w-2 h-2 rounded-full ${item.active ? "bg-emerald-400" : "bg-gray-500"}`} />
            {item.active ? t("active") : t("inactive")}
          </span>
        </div>

        <div className="text-sm text-gray-400 space-y-1">
          <div>{getScheduleText(item)}</div>
          {item.couponEnabled && (
            <div className="text-emerald-400 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              {getCouponText(item)}
            </div>
          )}
          <div className="text-gray-500">
            {item.lastRunAt
              ? `${new Date(item.lastRunAt).toLocaleDateString()} (${t("lastRunCount", { count: item.lastRunCount })})`
              : t("never")}
          </div>
          <div className="text-gray-500">
            {t("totalSent")}: {item._count.sendLogs}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          {can("notifications", "edit") && (
            <button onClick={() => openEdit(item)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">
              <Pencil className="w-3.5 h-3.5 inline mr-1" /> {t("editTemplate")}
            </button>
          )}
          {can("notifications", "create") && (
            <button
              onClick={() => {
                setTestTemplateId(item.id)
                setTestUserId("")
                setTestUserSearch("")
                setTestUserResults([])
                setShowTestModal(true)
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-emerald-400 transition-colors"
            >
              <Send className="w-3.5 h-3.5 inline mr-1" /> {t("testSend")}
            </button>
          )}
          {can("notifications", "delete") && (
            <button
              onClick={() => setDeleteItem({ id: item.id, name: item.name })}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-red-400 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-2">
        <Link
          href="/admin/notifications"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <BellRing className="w-4 h-4" />
          {tNotif("title")}
        </Link>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30">
          <CalendarClock className="w-4 h-4" />
          {t("title")}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        {can("notifications", "create") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("createTemplate")}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonDataTable columns={7} rows={5} />
      ) : templates.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <CalendarClock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">{t("noTemplates")}</p>
        </div>
      ) : (
        <DataTable
          data={templates}
          columns={columns}
          onRowClick={can("notifications", "edit") ? openEdit : undefined}
          renderMobileCard={renderMobileCard}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-2xl p-6 space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? t("editTemplate") : t("createTemplate")}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">{t("basicInfo")}</h3>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("name")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                />
              </div>

              {/* Trigger type buttons */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t("trigger")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(TRIGGER_BADGES).map(([key, { icon: Icon, color }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, trigger: key })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.trigger === key
                          ? `${color} border border-white/20 ring-1 ring-white/10`
                          : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t(`trigger${key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days before */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">{t("daysBefore")}</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={form.daysBefore}
                    onChange={(e) => setForm({ ...form, daysBefore: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("daysBeforeHint")}</p>
                </div>

                {/* Custom date fields */}
                {form.trigger === "custom_date" && (
                  <>
                    <div className="w-24">
                      <label className="block text-sm text-gray-400 mb-1">{t("customMonth")}</label>
                      <select
                        value={form.customMonth}
                        onChange={(e) => setForm({ ...form, customMonth: parseInt(e.target.value) })}
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={i} value={i + 1} className="bg-slate-800">{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-sm text-gray-400 mb-1">{t("customDay")}</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.customDay}
                        onChange={(e) => setForm({ ...form, customDay: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Recurring (for custom_date) */}
              {form.trigger === "custom_date" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, recurring: !form.recurring })}
                    className={`w-10 h-6 rounded-full transition-colors ${form.recurring ? "bg-emerald-500" : "bg-gray-600"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform mx-1 ${form.recurring ? "translate-x-4" : ""}`} />
                  </button>
                  <span className="text-sm text-gray-300">{t("recurringHint")}</span>
                </div>
              )}
            </div>

            {/* Section 2: Message (multi-language tabs) */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">{t("messageTab")}</h3>

              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {(["bg", "en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTab(lang)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === lang ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("titleField")}</label>
                <input
                  value={activeTab === "bg" ? form.titleBg : activeTab === "es" ? form.titleEs : form.titleEn}
                  onChange={(e) => {
                    const key = `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as "titleBg" | "titleEn" | "titleEs"
                    setForm({ ...form, [key]: e.target.value })
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("message")}</label>
                <RichTextEditor
                  value={activeTab === "bg" ? form.messageBg : activeTab === "es" ? form.messageEs : form.messageEn}
                  onChange={(html) => {
                    const key = `message${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as "messageBg" | "messageEn" | "messageEs"
                    setForm({ ...form, [key]: html })
                  }}
                />
              </div>

              {/* Placeholder hints */}
              <div className="bg-white/5 rounded-xl p-3 space-y-1">
                <p className="text-xs font-medium text-gray-400">{t("placeholders")}:</p>
                <p className="text-xs text-gray-500">{t("placeholderName")}</p>
                <p className="text-xs text-gray-500">{t("placeholderCouponCode")}</p>
                <p className="text-xs text-gray-500">{t("placeholderCouponValue")}</p>
                <p className="text-xs text-gray-500">{t("placeholderExpiresAt")}</p>
              </div>
            </div>

            {/* Section 3: Auto-Coupon */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">{t("autoCoupon")}</h3>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, couponEnabled: !form.couponEnabled })}
                  className={`w-10 h-6 rounded-full transition-colors ${form.couponEnabled ? "bg-emerald-500" : "bg-gray-600"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform mx-1 ${form.couponEnabled ? "translate-x-4" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500">{t("enableCoupon")}</p>

              {form.couponEnabled && (
                <div className="space-y-4 pl-2 border-l-2 border-emerald-500/30">
                  {/* Coupon type */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">{t("couponType")}</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, couponType: "percentage" })}
                          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                            form.couponType === "percentage" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-transparent"
                          }`}
                        >
                          {t("percentage")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, couponType: "fixed" })}
                          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                            form.couponType === "fixed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-transparent"
                          }`}
                        >
                          {t("fixed")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Value + Currency */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">{t("couponValue")}</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.couponValue}
                        onChange={(e) => setForm({ ...form, couponValue: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                      />
                    </div>
                    {form.couponType === "fixed" && (
                      <div className="w-28">
                        <label className="block text-sm text-gray-400 mb-1">{t("couponCurrency")}</label>
                        <select
                          value={form.couponCurrency}
                          onChange={(e) => setForm({ ...form, couponCurrency: e.target.value })}
                          className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        >
                          <option value="EUR" className="bg-slate-800">EUR</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Expiry mode + Per user */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">{t("couponExpiryMode")}</label>
                      <div className="flex gap-2 mb-2">
                        <button type="button"
                          onClick={() => setForm({ ...form, couponExpiryMode: "duration" })}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            form.couponExpiryMode === "duration"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                          }`}>
                          {t("expiryByDuration")}
                        </button>
                        <button type="button"
                          onClick={() => setForm({ ...form, couponExpiryMode: "date" })}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            form.couponExpiryMode === "date"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                          }`}>
                          {t("expiryByDate")}
                        </button>
                      </div>
                      {form.couponExpiryMode === "duration" ? (
                        <input type="number" min="1" max="365"
                          value={form.couponDuration}
                          onChange={(e) => setForm({ ...form, couponDuration: parseInt(e.target.value) || 30 })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                        />
                      ) : (
                        <input type="datetime-local"
                          value={form.couponExpiresAt}
                          onChange={(e) => setForm({ ...form, couponExpiresAt: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors [color-scheme:dark]"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">{t("couponPerUser")}</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={form.couponPerUser}
                        onChange={(e) => setForm({ ...form, couponPerUser: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Min purchase */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("couponMinPurchase")}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.couponMinPurchase}
                      onChange={(e) => setForm({ ...form, couponMinPurchase: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                    />
                  </div>

                  {/* Product picker */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("couponProducts")}</label>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, couponProductIds: [] })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            form.couponProductIds.length === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {t("allProducts")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProductDropdown(!showProductDropdown)
                            if (!showProductDropdown) loadAllProducts()
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                            form.couponProductIds.length > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {t("specificProducts")} {form.couponProductIds.length > 0 && `(${form.couponProductIds.length})`}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {showProductDropdown && (
                        <div className="absolute z-20 w-full glass-strong rounded-xl border border-white/10 shadow-2xl max-h-64 overflow-y-auto">
                          <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm p-2 border-b border-white/10">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input
                                value={productSearch}
                                onChange={(e) => {
                                  setProductSearch(e.target.value)
                                  searchProducts(e.target.value)
                                }}
                                onFocus={() => {
                                  if (!allProductsLoadedRef.current) loadAllProducts()
                                }}
                                placeholder={tAdmin("searchPlaceholder")}
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                            </div>
                          </div>

                          {/* Select All/Deselect All */}
                          {productResults.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = productResults.every((p) => form.couponProductIds.includes(p.id))
                                if (allSelected) {
                                  setForm({ ...form, couponProductIds: form.couponProductIds.filter((id) => !productResults.map((p) => p.id).includes(id)) })
                                } else {
                                  const newIds = [...new Set([...form.couponProductIds, ...productResults.map((p) => p.id)])]
                                  setForm({ ...form, couponProductIds: newIds })
                                }
                              }}
                              className="flex items-center gap-3 px-3 py-2 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors w-full text-left"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                productResults.every((p) => form.couponProductIds.includes(p.id))
                                  ? "bg-emerald-500 border-emerald-500"
                                  : productResults.some((p) => form.couponProductIds.includes(p.id))
                                    ? "bg-emerald-500/50 border-emerald-500"
                                    : "border-gray-500"
                              }`}>
                                {productResults.every((p) => form.couponProductIds.includes(p.id)) ? (
                                  <Check className="w-3 h-3 text-white" />
                                ) : productResults.some((p) => form.couponProductIds.includes(p.id)) ? (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                                ) : null}
                              </div>
                              <span className="text-sm font-medium text-emerald-400">
                                {productResults.every((p) => form.couponProductIds.includes(p.id)) ? tNotif("deselectAll") : tNotif("selectAll")} ({productResults.length})
                              </span>
                            </button>
                          )}

                          {searchingProducts ? (
                            <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>
                          ) : productResults.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">{tNotif("noUsersFound")}</div>
                          ) : (
                            productResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  const ids = form.couponProductIds.includes(product.id)
                                    ? form.couponProductIds.filter((id) => id !== product.id)
                                    : [...form.couponProductIds, product.id]
                                  setForm({ ...form, couponProductIds: ids })
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors"
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  form.couponProductIds.includes(product.id) ? "bg-emerald-500 border-emerald-500" : "border-gray-500"
                                }`}>
                                  {form.couponProductIds.includes(product.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                {product.image && (
                                  <img src={product.image} alt="" className="w-6 h-6 rounded object-cover" />
                                )}
                                <span className="text-sm text-gray-300 truncate">
                                  {locale === "bg" ? product.nameBg : product.nameEn}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allow on sale */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, couponAllowOnSale: !form.couponAllowOnSale })}
                      className={`w-10 h-6 rounded-full transition-colors ${form.couponAllowOnSale ? "bg-emerald-500" : "bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transform transition-transform mx-1 ${form.couponAllowOnSale ? "translate-x-4" : ""}`} />
                    </button>
                    <span className="text-sm text-gray-300">{t("couponAllowOnSale")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider">{t("settings")}</h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("link")}</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder={t("linkPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`w-10 h-6 rounded-full transition-colors ${form.active ? "bg-emerald-500" : "bg-gray-600"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform mx-1 ${form.active ? "translate-x-4" : ""}`} />
                </button>
                <span className="text-sm text-gray-300">{form.active ? t("active") : t("inactive")}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTemplate ? t("save") : t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Send Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTestModal(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t("testSendTitle")}</h2>
              <button onClick={() => setShowTestModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400">{t("testSendDescription")}</p>

            {/* User search */}
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-1">{t("selectUser")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={testUserSearch}
                  onChange={(e) => {
                    setTestUserSearch(e.target.value)
                    searchTestUsers(e.target.value)
                  }}
                  onFocus={() => loadAllTestUsers()}
                  placeholder={t("searchUsers")}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {testUserResults.length > 0 && !testUserId && (
                <div className="absolute z-10 w-full mt-1 glass-strong rounded-xl border border-white/10 shadow-2xl max-h-48 overflow-y-auto">
                  {testSearching ? (
                    <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>
                  ) : (
                    testUserResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setTestUserId(user.id)
                          setTestUserSearch(user.name || user.email || user.id)
                          setTestUserResults([])
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        {user.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">
                            {(user.name || user.email || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="text-sm text-white">{user.name || user.email}</div>
                          {user.name && <div className="text-xs text-gray-500">{user.email}</div>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {testUserId && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Gift className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">{testUserSearch}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestUserId("")
                      setTestUserSearch("")
                    }}
                    className="ml-auto text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Send button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleTestSend}
                disabled={testSending || !testUserId}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {testSending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Send className="w-4 h-4" />
                {t("testSend")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  )
}
