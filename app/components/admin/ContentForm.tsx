"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { X, Save, Loader2, Upload, Image as ImageIcon } from "lucide-react"

interface ContentFormData {
  id?: string
  type: string
  titleBg: string
  titleEn: string
  titleEs: string
  bodyBg: string
  bodyEn: string
  bodyEs: string
  image: string
  published: boolean
  order: number
}

interface ContentFormProps {
  initialData?: {
    id?: string
    type?: string
    titleBg?: string
    titleEn?: string
    titleEs?: string
    bodyBg?: string | null
    bodyEn?: string | null
    bodyEs?: string | null
    image?: string | null
    published?: boolean
    order?: number
  }
  onSubmit: (data: ContentFormData) => Promise<void>
  onCancel: () => void
}

export function ContentForm({
  initialData,
  onSubmit,
  onCancel,
}: ContentFormProps) {
  const t = useTranslations("admin.content")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<ContentFormData>({
    id: initialData?.id,
    type: initialData?.type ?? "news",
    titleBg: initialData?.titleBg ?? "",
    titleEn: initialData?.titleEn ?? "",
    titleEs: initialData?.titleEs ?? "",
    bodyBg: initialData?.bodyBg ?? "",
    bodyEn: initialData?.bodyEn ?? "",
    bodyEs: initialData?.bodyEs ?? "",
    image: initialData?.image ?? "",
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

  const updateField = (field: keyof ContentFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {initialData?.id ? t("editContent") : t("addContent")}
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
                <option value="news">{t("news")}</option>
                <option value="service">{t("service")}</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Image
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
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

              {/* Upload Button */}
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
              <p className="text-xs text-gray-500">Max 5MB. Supported: JPEG, PNG, GIF, WebP</p>
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("title")} ({activeTab.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={
                    formData[
                      `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ContentFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ContentFormData,
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("body")} ({activeTab.toUpperCase()})
                </label>
                <textarea
                  value={
                    formData[
                      `body${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ContentFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `body${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ContentFormData,
                      e.target.value
                    )
                  }
                  rows={6}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

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
