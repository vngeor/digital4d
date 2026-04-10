"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Truck, Sparkles, Search, X, Check, Gift, Tag } from "lucide-react"
import { BulkTier, parseTiers } from "@/lib/bulkDiscount"

interface Settings {
  freeShippingEnabled: boolean
  freeShippingThreshold: number | null
  freeShippingCurrency: string
  upsellTabEnabled: boolean
  upsellOpenOnAdd: string
  globalUpsellProductIds: string[]
  welcomePopupEnabled:    boolean
  welcomePopupTitleBg:    string
  welcomePopupTitleEn:    string
  welcomePopupTitleEs:    string
  welcomePopupMessageBg:  string
  welcomePopupMessageEn:  string
  welcomePopupMessageEs:  string
  welcomePopupImage:      string
  welcomePopupCouponCode: string
  welcomePopupDelay:      number
  welcomePopupLink:       string
  bulkDiscountEnabled:    boolean
  bulkDiscountTiers:      string
}

type ProductOption = { id: string; nameEn: string; nameBg: string; image: string | null; status?: string }

export default function SettingsPage() {
  const t = useTranslations("admin.settings")
  const [settings, setSettings] = useState<Settings>({
    freeShippingEnabled: false,
    freeShippingThreshold: null,
    freeShippingCurrency: "EUR",
    upsellTabEnabled: true,
    upsellOpenOnAdd: "upsell",
    globalUpsellProductIds: [],
    welcomePopupEnabled:    false,
    welcomePopupTitleBg:    "",
    welcomePopupTitleEn:    "",
    welcomePopupTitleEs:    "",
    welcomePopupMessageBg:  "",
    welcomePopupMessageEn:  "",
    welcomePopupMessageEs:  "",
    welcomePopupImage:      "",
    welcomePopupCouponCode: "",
    welcomePopupDelay:      2,
    welcomePopupLink:       "",
    bulkDiscountEnabled:    false,
    bulkDiscountTiers:      "[]",
  })
  const [thresholdInput, setThresholdInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bulkTiers, setBulkTiers] = useState<BulkTier[]>([])

  // Upsell global product picker state
  const [selectedGlobalUpsell, setSelectedGlobalUpsell] = useState<ProductOption[]>([])
  const [globalUpsellSearch, setGlobalUpsellSearch] = useState("")
  const [globalUpsellResults, setGlobalUpsellResults] = useState<ProductOption[]>([])
  const [showGlobalUpsellDropdown, setShowGlobalUpsellDropdown] = useState(false)
  const [searchingGlobalUpsell, setSearchingGlobalUpsell] = useState(false)
  const globalUpsellDropdownRef = useRef<HTMLDivElement>(null)
  const globalUpsellAllRef = useRef<ProductOption[]>([])
  const globalUpsellLoadedRef = useRef(false)
  const globalUpsellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Welcome Popup state
  const [popupLang, setPopupLang] = useState<"bg" | "en" | "es">("bg")
  const [popupUploading, setPopupUploading] = useState(false)
  const popupImageRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then((data: Settings) => {
        setSettings({
          freeShippingEnabled: Boolean(data.freeShippingEnabled),
          freeShippingThreshold: data.freeShippingThreshold ?? null,
          freeShippingCurrency: data.freeShippingCurrency ?? "EUR",
          upsellTabEnabled: data.upsellTabEnabled ?? true,
          upsellOpenOnAdd: data.upsellOpenOnAdd ?? "upsell",
          globalUpsellProductIds: data.globalUpsellProductIds ?? [],
          welcomePopupEnabled:    Boolean(data.welcomePopupEnabled),
          welcomePopupTitleBg:    data.welcomePopupTitleBg    ?? "",
          welcomePopupTitleEn:    data.welcomePopupTitleEn    ?? "",
          welcomePopupTitleEs:    data.welcomePopupTitleEs    ?? "",
          welcomePopupMessageBg:  data.welcomePopupMessageBg  ?? "",
          welcomePopupMessageEn:  data.welcomePopupMessageEn  ?? "",
          welcomePopupMessageEs:  data.welcomePopupMessageEs  ?? "",
          welcomePopupImage:      data.welcomePopupImage      ?? "",
          welcomePopupCouponCode: data.welcomePopupCouponCode ?? "",
          welcomePopupDelay:      data.welcomePopupDelay      ?? 2,
          welcomePopupLink:       data.welcomePopupLink       ?? "",
          bulkDiscountEnabled:    Boolean(data.bulkDiscountEnabled),
          bulkDiscountTiers:      data.bulkDiscountTiers       ?? "[]",
        })
        setBulkTiers(parseTiers(data.bulkDiscountTiers ?? "[]"))
        setThresholdInput(data.freeShippingThreshold?.toString() ?? "")
        // Load display objects for saved globalUpsellProductIds
        if (data.globalUpsellProductIds?.length > 0) {
          fetch(`/api/admin/products?ids=${data.globalUpsellProductIds.join(",")}`)
            .then(r => r.ok ? r.json() : [])
            .then((products: ProductOption[]) => {
              setSelectedGlobalUpsell(Array.isArray(products) ? products : [])
            })
            .catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Cleanup upsell search timeout on unmount
  useEffect(() => {
    return () => { if (globalUpsellTimeoutRef.current) clearTimeout(globalUpsellTimeoutRef.current) }
  }, [])

  // Click-outside handler for upsell dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (globalUpsellDropdownRef.current && !globalUpsellDropdownRef.current.contains(e.target as Node)) {
        setShowGlobalUpsellDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const loadAllGlobalUpsellProducts = async () => {
    if (globalUpsellLoadedRef.current) {
      setGlobalUpsellResults(globalUpsellAllRef.current)
      return
    }
    setSearchingGlobalUpsell(true)
    try {
      const res = await fetch("/api/admin/products")
      if (res.ok) {
        const data = await res.json()
        const products = (Array.isArray(data) ? data : []).map((p: ProductOption) => ({
          id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image, status: p.status,
        }))
        globalUpsellAllRef.current = products
        globalUpsellLoadedRef.current = true
        setGlobalUpsellResults(products)
      }
    } catch { setGlobalUpsellResults([]) }
    finally { setSearchingGlobalUpsell(false) }
  }

  const searchGlobalUpsellProducts = (query: string) => {
    if (globalUpsellTimeoutRef.current) clearTimeout(globalUpsellTimeoutRef.current)
    if (!query.trim()) {
      if (globalUpsellLoadedRef.current) setGlobalUpsellResults(globalUpsellAllRef.current)
      return
    }
    globalUpsellTimeoutRef.current = setTimeout(async () => {
      setSearchingGlobalUpsell(true)
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setGlobalUpsellResults(
            (Array.isArray(data) ? data : []).slice(0, 20).map((p: ProductOption) => ({
              id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image, status: p.status,
            }))
          )
        }
      } catch { setGlobalUpsellResults([]) }
      finally { setSearchingGlobalUpsell(false) }
    }, 300)
  }

  const toggleGlobalUpsellProduct = (product: ProductOption) => {
    const isSelected = settings.globalUpsellProductIds.includes(product.id)
    if (isSelected) {
      setSettings(prev => ({ ...prev, globalUpsellProductIds: prev.globalUpsellProductIds.filter(id => id !== product.id) }))
      setSelectedGlobalUpsell(prev => prev.filter(p => p.id !== product.id))
    } else {
      setSettings(prev => ({ ...prev, globalUpsellProductIds: [...prev.globalUpsellProductIds, product.id] }))
      setSelectedGlobalUpsell(prev => [...prev, product])
    }
  }

  const removeGlobalUpsellProduct = (productId: string) => {
    setSettings(prev => ({ ...prev, globalUpsellProductIds: prev.globalUpsellProductIds.filter(id => id !== productId) }))
    setSelectedGlobalUpsell(prev => prev.filter(p => p.id !== productId))
  }

  const handlePopupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPopupUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) { toast.error("Upload failed"); return }
      const data = await res.json()
      setSettings(s => ({ ...s, welcomePopupImage: data.url }))
    } catch { toast.error("Upload failed") }
    finally { setPopupUploading(false); if (popupImageRef.current) popupImageRef.current.value = "" }
  }

  const handleSave = async () => {
    if (saving) return
    const thresholdVal = parseFloat(thresholdInput)
    if (settings.freeShippingEnabled) {
      if (!thresholdInput || isNaN(thresholdVal) || thresholdVal <= 0) {
        toast.error(t("thresholdRequired"))
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeShippingEnabled: settings.freeShippingEnabled,
          freeShippingThreshold: settings.freeShippingEnabled ? thresholdVal : null,
          freeShippingCurrency: settings.freeShippingCurrency,
          upsellTabEnabled: settings.upsellTabEnabled,
          upsellOpenOnAdd: settings.upsellOpenOnAdd,
          globalUpsellProductIds: settings.globalUpsellProductIds,
          welcomePopupEnabled:    settings.welcomePopupEnabled,
          welcomePopupTitleBg:    settings.welcomePopupTitleBg,
          welcomePopupTitleEn:    settings.welcomePopupTitleEn,
          welcomePopupTitleEs:    settings.welcomePopupTitleEs,
          welcomePopupMessageBg:  settings.welcomePopupMessageBg,
          welcomePopupMessageEn:  settings.welcomePopupMessageEn,
          welcomePopupMessageEs:  settings.welcomePopupMessageEs,
          welcomePopupImage:      settings.welcomePopupImage,
          welcomePopupCouponCode: settings.welcomePopupCouponCode,
          welcomePopupDelay:      settings.welcomePopupDelay,
          welcomePopupLink:       settings.welcomePopupLink,
          bulkDiscountEnabled:    settings.bulkDiscountEnabled,
          bulkDiscountTiers:      JSON.stringify(bulkTiers),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(t("saved"))
    } catch {
      toast.error(t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="text-slate-400 mt-1">{t("subtitle")}</p>
      </div>

      {/* Free Shipping Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">{t("freeShippingSection")}</h2>
            <p className="text-slate-400 text-sm">{t("freeShippingSectionDesc")}</p>
          </div>
        </div>

        {/* Toggle */}
        <label className="flex items-center justify-between gap-4 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors">
          <span className="text-sm text-slate-300">{t("enableThreshold")}</span>
          <input
            type="checkbox"
            checked={Boolean(settings.freeShippingEnabled)}
            onChange={e => setSettings(s => ({ ...s, freeShippingEnabled: e.target.checked }))}
            className="w-4 h-4 rounded accent-emerald-500"
          />
        </label>

        {/* Threshold input — shown only when enabled */}
        {settings.freeShippingEnabled && (
          <div className="space-y-2">
            <label className="text-sm text-slate-400">{t("threshold")}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={thresholdInput}
                onChange={e => setThresholdInput(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <span className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">
                € EUR
              </span>
            </div>
            {thresholdInput && parseFloat(thresholdInput) > 0 && (
              <p className="text-xs text-slate-500">
                {t("preview", { threshold: parseFloat(thresholdInput).toFixed(2), currency: "EUR" })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Upsell Cart Tab Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">{t("upsellSection")}</h2>
            <p className="text-slate-400 text-sm">
              {t("upsellSectionDesc")}
            </p>
          </div>
        </div>

        {/* Enable toggle */}
        <label className="flex items-center justify-between gap-4 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors">
          <span className="text-sm text-slate-300">{t("enableUpsell")}</span>
          <input
            type="checkbox"
            checked={Boolean(settings.upsellTabEnabled)}
            onChange={e => setSettings(p => ({ ...p, upsellTabEnabled: e.target.checked }))}
            className="w-4 h-4 rounded accent-amber-500"
          />
        </label>

        {settings.upsellTabEnabled && (
          <div className="space-y-5 pl-1">
            {/* Open behavior */}
            <div className="space-y-2">
              <p className="text-sm text-slate-400">{t("openCartOn")}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { val: "upsell", label: t("upsellTabOption") },
                  { val: "cart", label: t("cartTabOption") },
                ].map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upsellOpenOnAdd"
                      value={val}
                      checked={settings.upsellOpenOnAdd === val}
                      onChange={() => setSettings(p => ({ ...p, upsellOpenOnAdd: val }))}
                      className="accent-amber-500"
                    />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Global upsell product picker */}
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                {t("globalUpsellLabel")}
              </p>

              {/* Selected chips */}
              {selectedGlobalUpsell.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGlobalUpsell.map(product => {
                    const unavailable = product.status && !["in_stock", "pre_order"].includes(product.status)
                    return (
                      <span
                        key={product.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                          unavailable ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                        }`}
                        title={unavailable ? `Unavailable (${product.status?.replace(/_/g, " ")})` : undefined}
                      >
                        {product.image && (
                          <img src={product.image} alt="" className={`w-5 h-5 rounded object-cover ${unavailable ? "opacity-50" : ""}`} />
                        )}
                        <span className="max-w-[150px] truncate">{product.nameEn}</span>
                        {unavailable && <span className="text-xs opacity-75">⚠</span>}
                        <button
                          type="button"
                          onClick={() => removeGlobalUpsellProduct(product.id)}
                          className="ml-0.5 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Dropdown picker */}
              <div ref={globalUpsellDropdownRef} className="relative">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={globalUpsellSearch}
                    onChange={e => { setGlobalUpsellSearch(e.target.value); searchGlobalUpsellProducts(e.target.value) }}
                    onFocus={() => { setShowGlobalUpsellDropdown(true); loadAllGlobalUpsellProducts() }}
                    placeholder={t("searchUpsellPlaceholder")}
                    className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                  />
                  {searchingGlobalUpsell && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>
                {showGlobalUpsellDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1e1e36] border border-white/10 shadow-xl">
                    {globalUpsellResults.map(product => {
                      const isSel = settings.globalUpsellProductIds.includes(product.id)
                      const unavailable = product.status && !["in_stock", "pre_order"].includes(product.status)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleGlobalUpsellProduct(product)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            isSel ? "bg-amber-500/10 text-amber-300" : unavailable ? "text-gray-500 hover:bg-white/5" : "text-gray-300 hover:bg-white/5"
                          }`}
                        >
                          {product.image
                            ? <img src={product.image} alt="" className={`w-8 h-8 rounded object-cover flex-shrink-0 ${unavailable ? "opacity-40" : ""}`} />
                            : <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0" />}
                          <span className="flex-1 truncate">{product.nameEn}</span>
                          {unavailable && (
                            <span className="text-xs text-red-400/80 flex-shrink-0 mr-1">
                              {product.status?.replace(/_/g, " ")}
                            </span>
                          )}
                          {isSel && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        </button>
                      )
                    })}
                    {globalUpsellResults.length === 0 && !searchingGlobalUpsell && (
                      <p className="px-3 py-3 text-sm text-gray-500 text-center">{t("noProductsFound")}</p>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {t("globalUpsellHint")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Welcome Popup Card */}
      {(() => {
        const TITLE_PLACEHOLDERS: Record<"bg" | "en" | "es", string> = { bg: "Добре дошли!", en: "Welcome!", es: "¡Bienvenido!" }
        const MSG_PLACEHOLDERS: Record<"bg" | "en" | "es", string> = { bg: "Специално предложение само за вас...", en: "A special offer just for you...", es: "Oferta especial solo para ti..." }
        return (
          <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">{t("welcomePopupSection")}</h2>
                <p className="text-slate-400 text-sm">{t("welcomePopupSectionDesc")}</p>
              </div>
            </div>

            {/* Enable toggle */}
            <label className="flex items-center justify-between gap-4 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors">
              <span className="text-sm text-slate-300">{t("enableWelcomePopup")}</span>
              <input
                type="checkbox"
                checked={Boolean(settings.welcomePopupEnabled)}
                onChange={e => setSettings(s => ({ ...s, welcomePopupEnabled: e.target.checked }))}
                className="w-4 h-4 rounded accent-violet-500"
              />
            </label>

            {settings.welcomePopupEnabled && (
              <div className="space-y-5 pl-1">
                {/* Language tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
                  {(["bg", "en", "es"] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPopupLang(lang)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                        popupLang === lang
                          ? "bg-violet-500 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">{t("titleLabel", { lang: popupLang.toUpperCase() })}</label>
                  <input
                    type="text"
                    value={settings[`welcomePopupTitle${popupLang.charAt(0).toUpperCase() + popupLang.slice(1)}` as keyof Settings] as string}
                    onChange={e => setSettings(s => ({ ...s, [`welcomePopupTitle${popupLang.charAt(0).toUpperCase() + popupLang.slice(1)}`]: e.target.value }))}
                    placeholder={TITLE_PLACEHOLDERS[popupLang]}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">{t("messageLabel", { lang: popupLang.toUpperCase() })}</label>
                  <textarea
                    rows={3}
                    value={settings[`welcomePopupMessage${popupLang.charAt(0).toUpperCase() + popupLang.slice(1)}` as keyof Settings] as string}
                    onChange={e => setSettings(s => ({ ...s, [`welcomePopupMessage${popupLang.charAt(0).toUpperCase() + popupLang.slice(1)}`]: e.target.value }))}
                    placeholder={MSG_PLACEHOLDERS[popupLang]}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 space-y-4">
                  {/* Banner image */}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t("bannerImageLabel")}</label>
                    <input
                      ref={popupImageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePopupImageUpload}
                    />
                    {settings.welcomePopupImage ? (
                      <div className="flex items-start gap-3">
                        <img
                          src={settings.welcomePopupImage}
                          alt="Popup banner"
                          className="w-32 h-20 object-cover rounded-xl border border-white/10"
                        />
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => popupImageRef.current?.click()}
                            disabled={popupUploading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors touch-manipulation disabled:opacity-50"
                          >
                            {popupUploading ? t("uploading") : t("changeImage")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettings(s => ({ ...s, welcomePopupImage: "" }))}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors touch-manipulation"
                          >
                            {t("removeImage")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => popupImageRef.current?.click()}
                        disabled={popupUploading}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 border-dashed text-slate-400 text-sm hover:bg-white/10 hover:text-white transition-colors touch-manipulation disabled:opacity-50 w-full"
                      >
                        {popupUploading ? t("uploading") : t("uploadBannerImage")}
                      </button>
                    )}
                    <p className="text-xs text-slate-500">{t("bannerImageHint")}</p>
                  </div>

                  {/* Campaign link */}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t("campaignLinkLabel")}</label>
                    <input
                      type="url"
                      value={settings.welcomePopupLink}
                      onChange={e => setSettings(s => ({ ...s, welcomePopupLink: e.target.value }))}
                      placeholder={t("campaignLinkPlaceholder")}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                    <p className="text-xs text-slate-500">{t("campaignLinkHint")}</p>
                  </div>

                  {/* Coupon code */}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t("couponCodeLabel")}</label>
                    <input
                      type="text"
                      value={settings.welcomePopupCouponCode}
                      onChange={e => setSettings(s => ({ ...s, welcomePopupCouponCode: e.target.value.toUpperCase() }))}
                      placeholder="WELCOME10"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors uppercase"
                    />
                    <p className="text-xs text-slate-500">{t("couponCodeHint")}</p>
                  </div>

                  {/* Delay */}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t("delayLabel")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={settings.welcomePopupDelay}
                        onChange={e => setSettings(s => ({ ...s, welcomePopupDelay: Math.max(0, Math.min(30, parseInt(e.target.value) || 0)) }))}
                        className="w-24 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base sm:text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                      <span className="text-sm text-slate-500">{t("delayHint")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Bulk Discounts Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">{t("bulkDiscountSection")}</h2>
            <p className="text-slate-400 text-sm">{t("bulkDiscountSectionDesc")}</p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors">
          <span className="text-sm text-slate-300">{t("enableBulkDiscount")}</span>
          <input
            type="checkbox"
            checked={Boolean(settings.bulkDiscountEnabled)}
            onChange={e => setSettings(s => ({ ...s, bulkDiscountEnabled: e.target.checked }))}
            className="w-4 h-4 rounded accent-emerald-500"
          />
        </label>

        {settings.bulkDiscountEnabled && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            {bulkTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 shrink-0">{t("bulkBuy")}</span>
                <input
                  type="number"
                  min={1}
                  value={tier.minQty}
                  onChange={e => setBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, minQty: parseInt(e.target.value) || 1 } : t))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/50"
                />
                <span className="text-xs text-slate-500 shrink-0">{t("bulkUnitsArrow")}</span>
                <select
                  value={tier.type}
                  onChange={e => setBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, type: e.target.value as "percentage" | "fixed" } : t))}
                  className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">€</option>
                </select>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={tier.value}
                  onChange={e => setBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, value: parseFloat(e.target.value) || 0 } : t))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={() => setBulkTiers(ts => ts.filter((_, j) => j !== i))}
                  className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setBulkTiers(ts => [...ts, { minQty: 2, type: "percentage", value: 5 }])}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {t("bulkAddTier")}
            </button>
            <p className="text-xs text-slate-500">{t("bulkTierHint")}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 touch-manipulation flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("save")}
      </button>
    </div>
  )
}
