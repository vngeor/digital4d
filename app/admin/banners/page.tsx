"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X, Save, Upload, Image as ImageIcon } from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"

interface Banner {
  id: string
  type: string
  titleBg: string
  titleEn: string
  titleEs: string
  subtitleBg: string | null
  subtitleEn: string | null
  subtitleEs: string | null
  image: string | null
  link: string | null
  linkTextBg: string | null
  linkTextEn: string | null
  linkTextEs: string | null
  published: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface BannerFormData {
  id?: string
  type: string
  titleBg: string
  titleEn: string
  titleEs: string
  subtitleBg: string
  subtitleEn: string
  subtitleEs: string
  image: string
  link: string
  linkTextBg: string
  linkTextEn: string
  linkTextEs: string
  published: boolean
  order: number
}

export default function BannersPage() {
  const t = useTranslations("admin.banners")
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const fetchBanners = async () => {
    setLoading(true)
    const params = filter !== "all" ? `?type=${filter}` : ""
    const res = await fetch(`/api/admin/banners${params}`)
    const data = await res.json()
    setBanners(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBanners()
  }, [filter])

  const handleSubmit = async (data: BannerFormData) => {
    const method = data.id ? "PUT" : "POST"
    await fetch("/api/admin/banners", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setShowForm(false)
    setEditingBanner(null)
    fetchBanners()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" })
    fetchBanners()
  }

  const handleTogglePublish = async (item: Banner) => {
    await fetch("/api/admin/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, published: !item.published }),
    })
    fetchBanners()
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "hero":
        return "bg-cyan-500/20 text-cyan-400"
      case "promo":
        return "bg-purple-500/20 text-purple-400"
      case "card":
        return "bg-emerald-500/20 text-emerald-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "hero": return t("heroType")
      case "promo": return t("promoType")
      case "card": return t("cardType")
      default: return type
    }
  }

  const filterTabs = [
    { key: "all", label: t("all") },
    { key: "hero", label: t("heroType") },
    { key: "promo", label: t("promoType") },
    { key: "card", label: t("cardType") },
  ]

  const columns = [
    {
      key: "image",
      header: t("image"),
      render: (item: Banner) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
          {item.image ? (
            <img src={item.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-500" />
          )}
        </div>
      ),
    },
    {
      key: "titleEn",
      header: t("titleField"),
      render: (item: Banner) => (
        <div>
          <p className="font-medium text-white">{item.titleEn}</p>
          <p className="text-xs text-gray-500">{item.titleBg}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: t("type"),
      render: (item: Banner) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(item.type)}`}>
          {getTypeLabel(item.type)}
        </span>
      ),
    },
    {
      key: "published",
      header: t("status"),
      render: (item: Banner) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            item.published
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {item.published ? t("published") : t("draft")}
        </span>
      ),
    },
    {
      key: "order",
      header: t("order"),
      render: (item: Banner) => (
        <span className="text-gray-400">{item.order}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (item: Banner) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTogglePublish(item)
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title={item.published ? t("unpublish") : t("publish")}
          >
            {item.published ? (
              <EyeOff className="w-4 h-4 text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingBanner(item)
              setShowForm(true)
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id)
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingBanner(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t("addBanner")}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === tab.key
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={banners}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noBanners")}
        />
      )}

      {showForm && (
        <BannerForm
          initialData={editingBanner || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingBanner(null)
          }}
        />
      )}
    </div>
  )
}

// Inline BannerForm component
function BannerForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: Banner
  onSubmit: (data: BannerFormData) => Promise<void>
  onCancel: () => void
}) {
  const t = useTranslations("admin.banners")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<BannerFormData>({
    id: initialData?.id,
    type: initialData?.type ?? "hero",
    titleBg: initialData?.titleBg ?? "",
    titleEn: initialData?.titleEn ?? "",
    titleEs: initialData?.titleEs ?? "",
    subtitleBg: initialData?.subtitleBg ?? "",
    subtitleEn: initialData?.subtitleEn ?? "",
    subtitleEs: initialData?.subtitleEs ?? "",
    image: initialData?.image ?? "",
    link: initialData?.link ?? "",
    linkTextBg: initialData?.linkTextBg ?? "",
    linkTextEn: initialData?.linkTextEn ?? "",
    linkTextEs: initialData?.linkTextEs ?? "",
    published: initialData?.published ?? false,
    order: initialData?.order ?? 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof BannerFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "Upload failed")
        return
      }

      const data = await res.json()
      updateField("image", data.url)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload image")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const languageTabs = [
    { key: "bg" as const, label: "Български" },
    { key: "en" as const, label: "English" },
    { key: "es" as const, label: "Español" },
  ]

  const titleKey = `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof BannerFormData
  const subtitleKey = `subtitle${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof BannerFormData
  const linkTextKey = `linkText${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof BannerFormData

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {initialData?.id ? t("editBanner") : t("addBanner")}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("type")}
              </label>
              <select
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="hero">{t("heroType")}</option>
                <option value="promo">{t("promoType")}</option>
                <option value="card">{t("cardType")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("order")}
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => updateField("order", parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("image")}
            </label>
            <div className="space-y-3">
              {formData.image && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("image", "")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-red-500/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
                <span className="text-gray-500 text-sm self-center">or</span>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder="Paste image URL..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("link")}
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => updateField("link", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Language Tabs */}
          <div>
            <div className="flex gap-2 mb-4">
              {languageTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("titleField")} ({activeTab.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={formData[titleKey] as string}
                  onChange={(e) => updateField(titleKey, e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("subtitleField")} ({activeTab.toUpperCase()})
                </label>
                <textarea
                  value={formData[subtitleKey] as string}
                  onChange={(e) => updateField(subtitleKey, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("linkText")} ({activeTab.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={formData[linkTextKey] as string}
                  onChange={(e) => updateField(linkTextKey, e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Published Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => updateField("published", e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
            />
            <label htmlFor="published" className="text-sm text-gray-300">
              {t("published")}
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
