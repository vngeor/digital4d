"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

interface ProfileEditFormProps {
  phone: string | null
  country: string | null
  city: string | null
  address: string | null
  birthDate: string | null
  highlightBirthDate?: boolean
  onClose: () => void
  translations: {
    editProfileTitle: string
    phone: string
    phonePlaceholder: string
    phoneRequired: string
    country: string
    countryPlaceholder: string
    city: string
    cityPlaceholder: string
    address: string
    addressPlaceholder: string
    birthDate: string
    birthDateRequired: string
    save: string
    saving: string
    cancel: string
    updateSuccess: string
    updateError: string
  }
}

export function ProfileEditForm({ phone, country, city, address, birthDate, highlightBirthDate, onClose, translations: t }: ProfileEditFormProps) {
  const router = useRouter()
  const birthDateRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when modal is open (iOS-safe pattern)
  useEffect(() => {
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
  }, [])

  // Format birthDate to YYYY-MM-DD for the date input
  const formatDateForInput = (dateStr: string | null): string => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      return date.toISOString().split("T")[0]
    } catch {
      return ""
    }
  }

  const [formData, setFormData] = useState({
    phone: phone || "",
    country: country || "",
    city: city || "",
    address: address || "",
    birthDate: formatDateForInput(birthDate),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.phone.trim()) {
      setError(t.phoneRequired)
      return
    }

    if (!formData.birthDate) {
      setError(t.birthDateRequired)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t.updateError)
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl max-h-[85svh] flex flex-col overflow-hidden bg-[#1a1a2e]">
        {/* Fixed header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-0">
          <h2 className="text-xl font-bold">{t.editProfileTitle}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation -mr-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pt-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.phone} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow numbers, spaces, +, -, and ()
                  const value = e.target.value.replace(/[^0-9+\-\s()]/g, "")
                  setFormData({ ...formData, phone: value })
                }}
                pattern="[0-9+\-\s()]{6,20}"
                placeholder={t.phonePlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.country}
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder={t.countryPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.city}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t.cityPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.address}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t.addressPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
            </div>

            <div ref={birthDateRef}>
              <label className={`block text-sm font-medium mb-2 ${highlightBirthDate && !formData.birthDate ? "text-pink-300" : "text-slate-300"}`}>
                {t.birthDate} <span className="text-red-400">*</span>
                {highlightBirthDate && !formData.birthDate && (
                  <span className="ml-1 text-xs text-pink-400">🎂</span>
                )}
              </label>
              {highlightBirthDate && !formData.birthDate ? (
                <div
                  className="rounded-xl p-[2px] overflow-hidden animate-pulse-glow"
                  style={{ background: "linear-gradient(to right, lab(56.9303 76.8162 -8.07021) 0%, lab(56.101 79.4328 31.4532) 100%)" }}
                >
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    onFocus={() => setTimeout(() => birthDateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                    className="w-full min-w-0 px-4 py-3 rounded-[10px] bg-[#1a1a2e] text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    onFocus={() => setTimeout(() => birthDateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                    className="w-full min-w-0 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.saving : t.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
