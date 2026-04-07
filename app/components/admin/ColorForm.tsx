"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface ColorFormData {
  id?: string
  nameBg: string
  nameEn: string
  nameEs: string
  hex: string
  hex2?: string | null
  order: number
}

interface ColorFormProps {
  initialData?: ColorFormData
  onSubmit: (data: ColorFormData) => Promise<void>
  onCancel: () => void
}

const LANGUAGE_TABS = [
  { key: "en" as const, label: "English" },
  { key: "bg" as const, label: "Български" },
  { key: "es" as const, label: "Español" },
]

/** Inline style for single or dual color swatch */
function swatchStyle(hex: string, hex2?: string | null): React.CSSProperties {
  if (hex2) return { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` }
  return { backgroundColor: hex }
}

export function ColorForm({ initialData, onSubmit, onCancel }: ColorFormProps) {
  const t = useTranslations("admin.colors")
  const [activeTab, setActiveTab] = useState<"en" | "bg" | "es">("en")
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ColorFormData>({
    nameBg: "",
    nameEn: "",
    nameEs: "",
    hex: "#10b981",
    hex2: null,
    order: 0,
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onCancel])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.nameEn.trim()) errs.nameEn = t("nameEnRequired")
    if (!formData.nameBg.trim()) errs.nameBg = t("nameBgRequired")
    if (!formData.nameEs.trim()) errs.nameEs = t("nameEsRequired")
    if (!formData.hex.trim()) errs.hex = t("hexRequired")
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit(formData)
    } finally {
      setSaving(false)
    }
  }

  const nameField = activeTab === "bg" ? "nameBg" : activeTab === "es" ? "nameEs" : "nameEn"
  const nameLabel = activeTab === "bg" ? t("nameFieldBg") : activeTab === "es" ? t("nameFieldEs") : t("nameFieldEn")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-[#0d0d1a] border border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85svh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {initialData?.id ? t("editColor") : t("addColor")}
          </h2>
          <button onClick={onCancel} className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4">
            {/* Language tabs */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {LANGUAGE_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Name field (locale-specific) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{nameLabel}</label>
              <input
                type="text"
                value={formData[nameField as keyof ColorFormData] as string}
                onChange={e => setFormData(prev => ({ ...prev, [nameField]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                placeholder={nameLabel}
              />
              {errors[nameField] && <p className="mt-1 text-xs text-red-400">{errors[nameField]}</p>}
            </div>

            {/* Color 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                {formData.hex2 ? t("color1Primary") : t("hex")}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.hex}
                  onChange={e => setFormData(prev => ({ ...prev, hex: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={formData.hex}
                  onChange={e => setFormData(prev => ({ ...prev, hex: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  placeholder="#000000"
                  maxLength={7}
                />
                {/* Live preview — split when hex2 set */}
                <div
                  className="w-10 h-10 rounded-lg border border-white/20 shrink-0"
                  style={swatchStyle(formData.hex, formData.hex2)}
                />
              </div>
              {errors.hex && <p className="mt-1 text-xs text-red-400">{errors.hex}</p>}
            </div>

            {/* Color 2 (optional) */}
            {formData.hex2 != null ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-400">{t("color2Secondary")}</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, hex2: null }))}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("removeColor2")}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.hex2 || "#ffffff"}
                    onChange={e => setFormData(prev => ({ ...prev, hex2: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.hex2 || ""}
                    onChange={e => setFormData(prev => ({ ...prev, hex2: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                    placeholder="#000000"
                    maxLength={7}
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-white/20 shrink-0"
                    style={{ backgroundColor: formData.hex2 || "#ffffff" }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{t("splitSwatchesHint")}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, hex2: "#ffffff" }))}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("addSecondColor")}
              </button>
            )}

            {/* Order */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{t("order")}</label>
              <input
                type="number"
                value={formData.order}
                onChange={e => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                min={0}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-4 sm:p-6 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/30 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
