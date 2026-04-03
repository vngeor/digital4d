"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

interface WeightFormData {
  id?: string
  label: string
  grams: string
  order: number
}

interface WeightFormProps {
  initialData?: WeightFormData
  onSubmit: (data: WeightFormData) => Promise<void>
  onCancel: () => void
}

export function WeightForm({ initialData, onSubmit, onCancel }: WeightFormProps) {
  const t = useTranslations("admin.weights")
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<WeightFormData>({
    label: "",
    grams: "",
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
    if (!formData.label.trim()) errs.label = "Label is required"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[#0d0d1a] border border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85svh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {initialData?.id ? t("editWeight") : t("addWeight")}
          </h2>
          <button onClick={onCancel} className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{t("label")}</label>
              <input
                type="text"
                value={formData.label}
                onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                placeholder={t("labelPlaceholder")}
                autoFocus
              />
              {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label}</p>}
            </div>

            {/* Grams (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                {t("grams")} <span className="text-gray-600">({t("optional")})</span>
              </label>
              <input
                type="number"
                value={formData.grams}
                onChange={e => setFormData(prev => ({ ...prev, grams: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                placeholder="1000"
                min={1}
              />
              <p className="mt-1 text-xs text-gray-600">{t("gramsHint")}</p>
            </div>

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
