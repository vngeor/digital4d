"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { X, Save, Loader2 } from "lucide-react"

interface MenuItemFormData {
  id?: string
  slug: string
  titleBg: string
  titleEn: string
  titleEs: string
  order: number
  published: boolean
}

interface MenuItemFormProps {
  initialData?: {
    id?: string
    slug?: string
    titleBg?: string
    titleEn?: string
    titleEs?: string
    order?: number
    published?: boolean
  }
  onSubmit: (data: MenuItemFormData) => Promise<void>
  onCancel: () => void
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function MenuItemForm({
  initialData,
  onSubmit,
  onCancel,
}: MenuItemFormProps) {
  const t = useTranslations("admin.menu")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const [autoSlug, setAutoSlug] = useState(!initialData?.id)
  const [formData, setFormData] = useState<MenuItemFormData>({
    id: initialData?.id,
    slug: initialData?.slug ?? "",
    titleBg: initialData?.titleBg ?? "",
    titleEn: initialData?.titleEn ?? "",
    titleEs: initialData?.titleEs ?? "",
    order: initialData?.order ?? 0,
    published: initialData?.published ?? true,
  })

  // Auto-generate slug from English title
  useEffect(() => {
    if (autoSlug && formData.titleEn) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.titleEn) }))
    }
  }, [formData.titleEn, autoSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof MenuItemFormData, value: unknown) => {
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
            {initialData?.id ? t("editMenuItem") : t("addMenuItem")}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("slug")}
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="e.g., services"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("slugHelp")}
            </p>
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
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => updateField("published", e.target.checked)}
                  className="w-5 h-5 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
                />
                <span className="text-sm text-gray-300">{t("published")}</span>
              </label>
            </div>
          </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("title")} ({activeTab.toUpperCase()})
              </label>
              <input
                type="text"
                value={
                  formData[
                    `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof MenuItemFormData
                  ] as string
                }
                onChange={(e) =>
                  updateField(
                    `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof MenuItemFormData,
                    e.target.value
                  )
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
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
