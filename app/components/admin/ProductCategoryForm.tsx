"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { X, Save, Loader2 } from "lucide-react"
import { COLOR_CLASSES } from "./TypeForm"

interface CategoryFormData {
  id?: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  descBg: string
  descEn: string
  descEs: string
  image: string
  color: string
  order: number
}

interface ProductCategoryFormProps {
  initialData?: {
    id?: string
    slug?: string
    nameBg?: string
    nameEn?: string
    nameEs?: string
    descBg?: string | null
    descEn?: string | null
    descEs?: string | null
    image?: string | null
    color?: string
    order?: number
  }
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const COLOR_OPTIONS = [
  { value: "cyan", label: "Cyan" },
  { value: "purple", label: "Purple" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "rose", label: "Rose" },
  { value: "lime", label: "Lime" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "yellow", label: "Yellow" },
]

export function ProductCategoryForm({
  initialData,
  onSubmit,
  onCancel,
}: ProductCategoryFormProps) {
  const t = useTranslations("admin.productCategories")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const [autoSlug, setAutoSlug] = useState(!initialData?.id)
  const [formData, setFormData] = useState<CategoryFormData>({
    id: initialData?.id,
    slug: initialData?.slug ?? "",
    nameBg: initialData?.nameBg ?? "",
    nameEn: initialData?.nameEn ?? "",
    nameEs: initialData?.nameEs ?? "",
    descBg: initialData?.descBg || "",
    descEn: initialData?.descEn || "",
    descEs: initialData?.descEs || "",
    image: initialData?.image || "",
    color: initialData?.color ?? "emerald",
    order: initialData?.order ?? 0,
  })

  useEffect(() => {
    if (autoSlug && formData.nameEn) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.nameEn) }))
    }
  }, [formData.nameEn, autoSlug])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required"
    }
    if (!formData.nameEn.trim()) {
      newErrors.nameEn = "English name is required"
    }
    if (!formData.nameBg.trim()) {
      newErrors.nameBg = "Bulgarian name is required"
    }
    if (!formData.nameEs.trim()) {
      newErrors.nameEs = "Spanish name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof CategoryFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === 'slug') {
      setAutoSlug(false)
    }
  }

  const languageTabs = [
    { key: "bg" as const, label: "Български" },
    { key: "en" as const, label: "English" },
    { key: "es" as const, label: "Español" },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {initialData?.id ? t("editCategory") : t("addCategory")}
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
                {t("slug")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="e.g., 3d-models"
                className={`w-full px-4 py-2 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  errors.slug ? "border-red-500" : "border-white/10 focus:border-emerald-500/50"
                }`}
              />
              {errors.slug ? (
                <p className="text-xs text-red-400 mt-1">{errors.slug}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">{t("slugHelp")}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("color")}
              </label>
              <select
                value={formData.color}
                onChange={(e) => updateField("color", e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[formData.color] || "bg-gray-500/20 text-gray-400"}`}>
                  Preview
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("image")}
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex gap-2 mb-4">
              {languageTabs.map((tab) => {
                const nameKey = `name${tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}`
                const hasError = errors[nameKey]
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                      activeTab === tab.key
                        ? hasError
                          ? "bg-gradient-to-r from-red-500/20 to-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                        : hasError
                          ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                    {hasError && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("name")} ({activeTab.toUpperCase()}) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={
                    formData[
                      `name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof CategoryFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof CategoryFormData,
                      e.target.value
                    )
                  }
                  className={`w-full px-4 py-2 bg-white/5 border rounded-xl text-white focus:outline-none transition-colors ${
                    errors[`name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`] ? "border-red-500" : "border-white/10 focus:border-emerald-500/50"
                  }`}
                />
                {errors[`name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`] && (
                  <p className="text-xs text-red-400 mt-1">{errors[`name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("description")} ({activeTab.toUpperCase()})
                </label>
                <textarea
                  value={
                    formData[
                      `desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof CategoryFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof CategoryFormData,
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

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
