"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import { X, Save, Loader2, Upload, Sparkles, ChevronDown, Search, Plus, Trash2, Palette } from "lucide-react"
import { useKeyboardSave } from "./useKeyboardSave"

interface ProductVariantData {
  id?: string
  colorNameBg: string
  colorNameEn: string
  colorNameEs: string
  colorHex: string
  image: string
  order: number
}

interface ProductFormData {
  id?: string
  slug: string
  sku: string
  nameBg: string
  nameEn: string
  nameEs: string
  descBg: string
  descEn: string
  descEs: string
  price: string
  salePrice: string
  onSale: boolean
  currency: string
  priceType: string
  category: string
  tags: string[]
  brand: string
  image: string
  gallery: string[]
  fileUrl: string
  fileType: string
  featured: boolean
  published: boolean
  inStock: boolean
  order: number
  variants: ProductVariantData[]
}

interface ProductCategory {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  parentId?: string | null
}

interface ProductFormProps {
  initialData?: {
    id?: string
    slug?: string
    sku?: string | null
    nameBg?: string
    nameEn?: string
    nameEs?: string
    descBg?: string | null
    descEn?: string | null
    descEs?: string | null
    price?: string | null
    salePrice?: string | null
    onSale?: boolean
    currency?: string
    priceType?: string
    category?: string
    tags?: string[]
    image?: string | null
    gallery?: string[]
    fileUrl?: string | null
    fileType?: string | null
    brand?: string | null
    featured?: boolean
    published?: boolean
    inStock?: boolean
    order?: number
    variants?: Array<{
      id?: string
      colorNameBg: string
      colorNameEn: string
      colorNameEs: string
      colorHex: string
      image?: string | null
      order: number
    }>
  }
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData) => Promise<void>
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

function generateSku(category: string, name: string): string {
  // Get category prefix (first 3 letters uppercase)
  const catPrefix = category
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase() || 'PRD'

  // Get name initials (first letter of each word, max 3)
  const nameInitials = name
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 3)
    .map(word => word[0].toUpperCase())
    .join('')

  // Random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000)

  return `${catPrefix}-${nameInitials || 'X'}-${randomNum}`
}

const FILE_TYPES = [
  { value: "digital", labelKey: "fileTypeDigital" },
  { value: "physical", labelKey: "fileTypePhysical" },
  { value: "service", labelKey: "fileTypeService" },
]

const PRICE_TYPES = [
  { value: "fixed", labelKey: "priceTypeFixed" },
  { value: "from", labelKey: "priceTypeFrom" },
  { value: "quote", labelKey: "priceTypeQuote" },
]

const CURRENCIES = ["EUR"]

export function ProductForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const t = useTranslations("admin.products")
  const tc = useTranslations("admin.common")
  const locale = useLocale()
  const formRef = useRef<HTMLFormElement>(null)
  useKeyboardSave(formRef)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [variantUploading, setVariantUploading] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const variantFileInputRef = useRef<HTMLInputElement>(null)
  const variantUploadIndex = useRef<number>(-1)
  const [categorySearch, setCategorySearch] = useState("")
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const categorySearchInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const [autoSlug, setAutoSlug] = useState(!initialData?.id)
  const [formData, setFormData] = useState<ProductFormData>({
    id: initialData?.id,
    slug: initialData?.slug ?? "",
    sku: initialData?.sku || "",
    nameBg: initialData?.nameBg ?? "",
    nameEn: initialData?.nameEn ?? "",
    nameEs: initialData?.nameEs ?? "",
    descBg: initialData?.descBg || "",
    descEn: initialData?.descEn || "",
    descEs: initialData?.descEs || "",
    price: initialData?.price || "",
    salePrice: initialData?.salePrice || "",
    onSale: initialData?.onSale ?? false,
    currency: initialData?.currency ?? "EUR",
    priceType: initialData?.priceType ?? "fixed",
    category: initialData?.category ?? (categories[0]?.slug || ""),
    tags: initialData?.tags ?? [],
    brand: initialData?.brand || "",
    image: initialData?.image || "",
    gallery: initialData?.gallery ?? [],
    fileUrl: initialData?.fileUrl || "",
    fileType: initialData?.fileType || "physical",
    featured: initialData?.featured ?? false,
    published: initialData?.published ?? false,
    inStock: initialData?.inStock !== false,
    order: initialData?.order ?? 0,
    variants: initialData?.variants?.map((v, i) => ({
      id: v.id,
      colorNameBg: v.colorNameBg,
      colorNameEn: v.colorNameEn,
      colorNameEs: v.colorNameEs,
      colorHex: v.colorHex,
      image: v.image || "",
      order: v.order ?? i,
    })) || [],
  })

  useEffect(() => {
    if (autoSlug && formData.nameEn) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.nameEn) }))
    }
  }, [formData.nameEn, autoSlug])

  // Click-outside handler for category dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const getCategoryName = (cat: ProductCategory) => {
    const nameKey = `name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof ProductCategory
    return (cat[nameKey] as string) || cat.nameEn
  }

  // Build hierarchical sorted list: parents first, children indented under them
  const sortedCategories = (() => {
    const parents = categories.filter(c => !c.parentId).sort((a, b) => getCategoryName(a).localeCompare(getCategoryName(b)))
    const result: ProductCategory[] = []
    for (const parent of parents) {
      result.push(parent)
      const children = categories.filter(c => c.parentId === parent.id).sort((a, b) => getCategoryName(a).localeCompare(getCategoryName(b)))
      result.push(...children)
    }
    // Add orphans (parentId set but parent not in list)
    const ids = new Set(result.map(c => c.id))
    for (const cat of categories) {
      if (!ids.has(cat.id)) result.push(cat)
    }
    return result
  })()

  const filteredCategories = sortedCategories.filter(cat =>
    getCategoryName(cat).toLowerCase().includes(categorySearch.toLowerCase())
  )

  const selectedCategory = categories.find(c => c.slug === formData.category)
  const selectedCategoryName = selectedCategory ? getCategoryName(selectedCategory) : t("selectCategory")

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
    if (!formData.category) {
      newErrors.category = "Category is required"
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

  const updateField = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === 'slug') {
      setAutoSlug(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || tc("uploadFailed"))
        return
      }

      const data = await res.json()
      updateField("image", data.url)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(tc("uploadImageFailed"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, {
        colorNameBg: "",
        colorNameEn: "",
        colorNameEs: "",
        colorHex: "#10b981",
        image: "",
        order: prev.variants.length,
      }],
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }))
  }

  const updateVariant = (index: number, field: keyof ProductVariantData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => i === index ? { ...v, [field]: value } : v),
    }))
  }

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const index = variantUploadIndex.current
    if (!file || index < 0) return

    setVariantUploading(index)
    try {
      const uploadData = new FormData()
      uploadData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: uploadData })
      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || tc("uploadFailed"))
        return
      }
      const data = await res.json()
      updateVariant(index, "image", data.url)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(tc("uploadImageFailed"))
    } finally {
      setVariantUploading(null)
      if (variantFileInputRef.current) variantFileInputRef.current.value = ""
    }
  }

  const languageTabs = [
    { key: "bg" as const, label: "Български" },
    { key: "en" as const, label: "English" },
    { key: "es" as const, label: "Español" },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border border-white/10 w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {initialData?.id ? t("editProduct") : t("addProduct")}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("slug")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="e.g., 3d-model-dragon"
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
                {t("sku")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  placeholder="e.g., PROD-001"
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => updateField("sku", generateSku(formData.category, formData.nameEn))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all"
                  title="Generate SKU"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("category")} <span className="text-red-400">*</span>
              </label>
              <div ref={categoryDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryDropdown(!showCategoryDropdown)
                    setCategorySearch("")
                    setTimeout(() => categorySearchInputRef.current?.focus(), 50)
                  }}
                  className={`w-full px-4 py-2 bg-white/5 border rounded-xl text-white focus:outline-none transition-colors flex items-center justify-between ${
                    errors.category ? "border-red-500" : "border-white/10 focus:border-emerald-500/50"
                  }`}
                >
                  <span className={selectedCategory ? "text-white" : "text-gray-500"}>
                    {selectedCategoryName}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-white/10">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          ref={categorySearchInputRef}
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder={t("searchCategory")}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCategories.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">{t("noCategoriesFound")}</div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              updateField("category", cat.slug)
                              setShowCategoryDropdown(false)
                              setCategorySearch("")
                            }}
                            className={`w-full text-left text-sm transition-colors hover:bg-white/10 ${
                              cat.parentId ? "pl-8 py-2" : "px-4 py-2.5 font-medium"
                            } ${
                              formData.category === cat.slug
                                ? "text-emerald-400 bg-emerald-500/10"
                                : cat.parentId ? "text-gray-300" : "text-white"
                            }`}
                          >
                            {cat.parentId && <span className="text-gray-600 mr-1">—</span>}
                            {getCategoryName(cat)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.category && (
                <p className="text-xs text-red-400 mt-1">{errors.category}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("fileType")}
              </label>
              <select
                value={formData.fileType}
                onChange={(e) => updateField("fileType", e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {FILE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("brand")}
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder={t("brandPlaceholder")}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Language Tabs for Name and Description */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
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
                      `name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `name${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData,
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
                      `desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData
                    ] as string
                  }
                  onChange={(e) =>
                    updateField(
                      `desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData,
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="text-sm font-medium text-gray-300">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("priceType")}
                </label>
                <select
                  value={formData.priceType}
                  onChange={(e) => updateField("priceType", e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  {PRICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("price")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("currency")}
                </label>
                <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white">
                  EUR
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("salePrice")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.salePrice}
                  onChange={(e) => updateField("salePrice", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.onSale}
                    onChange={(e) => updateField("onSale", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <span className="text-sm text-gray-300">{t("onSale")}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Media */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t("image")}
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              {formData.image && (
                <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden border border-white/10">
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
              <div className="flex flex-col sm:flex-row gap-3">
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
              <p className="text-xs text-emerald-400/70">Recommended: 800 x 600px (4:3 ratio)</p>
            </div>
          </div>

          {formData.fileType === "digital" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("fileUrl")}
              </label>
              <input
                type="text"
                value={formData.fileUrl}
                onChange={(e) => updateField("fileUrl", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          )}
          {/* Color Variants */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {t("colorVariants")}
              </h3>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addColor")}
              </button>
            </div>

            {formData.variants.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">{t("noVariants")}</p>
            ) : (
              <div className="space-y-3">
                <input
                  ref={variantFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleVariantImageUpload}
                  className="hidden"
                />
                {formData.variants.map((variant, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: variant.colorHex }}
                        />
                        <span className="text-sm text-white font-medium">
                          {variant.colorNameEn || `Color ${index + 1}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    {/* Color names - 3 inline inputs */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">BG</label>
                        <input
                          type="text"
                          value={variant.colorNameBg}
                          onChange={(e) => updateVariant(index, "colorNameBg", e.target.value)}
                          placeholder="Червен"
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">EN</label>
                        <input
                          type="text"
                          value={variant.colorNameEn}
                          onChange={(e) => updateVariant(index, "colorNameEn", e.target.value)}
                          placeholder="Red"
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">ES</label>
                        <input
                          type="text"
                          value={variant.colorNameEs}
                          onChange={(e) => updateVariant(index, "colorNameEs", e.target.value)}
                          placeholder="Rojo"
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Hex color + Image */}
                    <div className="flex items-end gap-3">
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">{t("colorHex")}</label>
                          <input
                            type="text"
                            value={variant.colorHex}
                            onChange={(e) => updateVariant(index, "colorHex", e.target.value)}
                            placeholder="#FF0000"
                            className="w-24 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                        </div>
                        <input
                          type="color"
                          value={variant.colorHex}
                          onChange={(e) => updateVariant(index, "colorHex", e.target.value)}
                          className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                        />
                      </div>

                      <div className="flex-1 flex items-end gap-2">
                        {variant.image ? (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            <img src={variant.image} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => updateVariant(index, "image", "")}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            variantUploadIndex.current = index
                            variantFileInputRef.current?.click()
                          }}
                          disabled={variantUploading === index}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                          {variantUploading === index ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {t("variantImage")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => updateField("published", e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span className="text-sm text-gray-300">{t("published")}</span>
              </label>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => updateField("featured", e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span className="text-sm text-gray-300">{t("featured")}</span>
              </label>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) => updateField("inStock", e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span className="text-sm text-gray-300">{t("inStock")}</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
