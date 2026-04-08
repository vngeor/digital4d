"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import { X, Save, Loader2, Upload, Sparkles, ChevronDown, Search, Plus, Trash2, Palette, Link2, Check, Tag } from "lucide-react"
import { useKeyboardSave } from "./useKeyboardSave"
import { RichTextEditor } from "./RichTextEditor"
import { type BulkTier, parseTiers } from "@/lib/bulkDiscount"

interface ColorOption {
  id: string
  nameBg: string
  nameEn: string
  nameEs: string
  hex: string
  hex2?: string | null
}

interface WeightOption {
  id: string
  label: string
}

interface ProductVariantData {
  id?: string
  colorId: string
  image: string
  status: string
  order: number
}

interface PackageVariantEntry {
  variantIndex: number
  status: string
}

interface ProductPackageData {
  id?: string
  weightId: string
  slug: string
  price: string
  salePrice: string
  sku: string
  status: string
  order: number
  bulkDiscountTiers: string
  packageVariants: PackageVariantEntry[]
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
  brandId: string
  image: string
  gallery: string[]
  relatedProductIds: string[]
  upsellProductIds: string[]
  fileUrl: string
  fileType: string
  featured: boolean
  bestSeller: boolean
  published: boolean
  status: string
  order: number
  variants: ProductVariantData[]
  packages: ProductPackageData[]
  bulkDiscountTiers: string
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
    relatedProductIds?: string[]
    upsellProductIds?: string[]
    fileUrl?: string | null
    fileType?: string | null
    brandId?: string | null
    featured?: boolean
    bestSeller?: boolean
    published?: boolean
    status?: string
    order?: number
    variants?: Array<{
      id?: string
      colorId: string
      image?: string | null
      status?: string
      order: number
    }>
    packages?: Array<{
      id?: string
      weightId: string
      slug: string
      price?: string | null
      salePrice?: string | null
      sku?: string | null
      status?: string
      order: number
      bulkDiscountTiers?: string | null
      packageVariants?: Array<{ variantId: string; status: string }>
    }>
    bulkDiscountTiers?: string | null
  }
  categories: ProductCategory[]
  brands: Array<{ id: string; slug: string; nameBg: string; nameEn: string; nameEs: string }>
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
  brands,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const t = useTranslations("admin.products")
  const tc = useTranslations("admin.common")
  const locale = useLocale()
  const formRef = useRef<HTMLFormElement>(null)
  useKeyboardSave(formRef)
  const [colors, setColors] = useState<ColorOption[]>([])
  const [weights, setWeights] = useState<WeightOption[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [variantUploading, setVariantUploading] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const variantFileInputRef = useRef<HTMLInputElement>(null)
  const variantUploadIndex = useRef<number>(-1)
  const [categorySearch, setCategorySearch] = useState("")
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const categorySearchInputRef = useRef<HTMLInputElement>(null)
  // Related products picker state
  const [relatedSearch, setRelatedSearch] = useState("")
  const [relatedResults, setRelatedResults] = useState<Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>>([])
  const [selectedRelated, setSelectedRelated] = useState<Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>>([])
  const [searchingRelated, setSearchingRelated] = useState(false)
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false)
  const relatedDropdownRef = useRef<HTMLDivElement>(null)
  const relatedSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allRelatedProductsRef = useRef<Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>>([])
  const allRelatedLoadedRef = useRef(false)
  // Upsell products picker state (shares allRelatedProductsRef + allRelatedLoadedRef cache)
  const [upsellSearch, setUpsellSearch] = useState("")
  const [upsellResults, setUpsellResults] = useState<Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>>([])
  const [selectedUpsell, setSelectedUpsell] = useState<Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>>([])
  const [searchingUpsell, setSearchingUpsell] = useState(false)
  const [showUpsellDropdown, setShowUpsellDropdown] = useState(false)
  const upsellDropdownRef = useRef<HTMLDivElement>(null)
  const upsellSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("bg")
  const [autoSlug, setAutoSlug] = useState(!initialData?.id)
  const [productBulkTiers, setProductBulkTiers] = useState<BulkTier[]>(() => parseTiers(initialData?.bulkDiscountTiers || ""))
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
    brandId: initialData?.brandId || "",
    image: initialData?.image || "",
    gallery: initialData?.gallery ?? [],
    relatedProductIds: initialData?.relatedProductIds ?? [],
    upsellProductIds: initialData?.upsellProductIds ?? [],
    fileUrl: initialData?.fileUrl || "",
    fileType: initialData?.fileType || "physical",
    featured: initialData?.featured ?? false,
    bestSeller: initialData?.bestSeller ?? false,
    published: initialData?.published ?? false,
    status: initialData?.status || "in_stock",
    order: initialData?.order ?? 0,
    variants: initialData?.variants?.map((v, i) => ({
      id: v.id,
      colorId: v.colorId,
      image: v.image || "",
      status: v.status || "in_stock",
      order: v.order ?? i,
    })) || [],
    packages: initialData?.packages?.map((p, i) => ({
      id: p.id,
      weightId: p.weightId,
      slug: p.slug,
      price: p.price?.toString() || "",
      salePrice: p.salePrice?.toString() || "",
      sku: p.sku || "",
      status: p.status || "in_stock",
      order: p.order ?? i,
      bulkDiscountTiers: p.bulkDiscountTiers || "",
      packageVariants: p.packageVariants?.map(pv => ({
        variantIndex: initialData.variants?.findIndex(v => v.id === pv.variantId) ?? -1,
        status: pv.status,
      })).filter(pv => pv.variantIndex >= 0) || [],
    })) || [],
    bulkDiscountTiers: initialData?.bulkDiscountTiers || "",
  })

  useEffect(() => {
    if (autoSlug && formData.nameEn) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.nameEn) }))
    }
  }, [formData.nameEn, autoSlug])

  // Fetch colors and weights for the selectors
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/colors").then(r => r.json()),
      fetch("/api/admin/weights").then(r => r.json()),
    ]).then(([c, w]) => {
      setColors(Array.isArray(c) ? c : [])
      setWeights(Array.isArray(w) ? w : [])
    }).catch(() => {})
  }, [])

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

  // Click-outside handler for related products dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (relatedDropdownRef.current && !relatedDropdownRef.current.contains(e.target as Node)) {
        setShowRelatedDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load selected related products on mount (for edit mode)
  useEffect(() => {
    if (formData.relatedProductIds.length > 0 && selectedRelated.length === 0) {
      fetch(`/api/admin/products?ids=${formData.relatedProductIds.join(",")}`)
        .then(res => res.ok ? res.json() : [])
        .then((data: Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>) => {
          const products = Array.isArray(data) ? data : []
          setSelectedRelated(products.map(p => ({ id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image })))
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Click-outside handler for upsell dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (upsellDropdownRef.current && !upsellDropdownRef.current.contains(e.target as Node)) {
        setShowUpsellDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load selected upsell products on mount (for edit mode)
  useEffect(() => {
    if (formData.upsellProductIds.length > 0 && selectedUpsell.length === 0) {
      fetch(`/api/admin/products?ids=${formData.upsellProductIds.join(",")}`)
        .then(res => res.ok ? res.json() : [])
        .then((data: Array<{ id: string; nameEn: string; nameBg: string; image: string | null }>) => {
          const products = Array.isArray(data) ? data : []
          setSelectedUpsell(products.map(p => ({ id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image })))
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAllRelatedProducts = async () => {
    if (allRelatedLoadedRef.current) return
    setSearchingRelated(true)
    try {
      const res = await fetch("/api/admin/products")
      if (res.ok) {
        const data = await res.json()
        const products = (Array.isArray(data) ? data : []).map((p: { id: string; nameEn: string; nameBg: string; image: string | null }) => ({
          id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image,
        }))
        allRelatedProductsRef.current = products
        setRelatedResults(products)
        allRelatedLoadedRef.current = true
      }
    } catch {
      setRelatedResults([])
    } finally {
      setSearchingRelated(false)
    }
  }

  const searchRelatedProducts = (query: string) => {
    if (relatedSearchTimeoutRef.current) clearTimeout(relatedSearchTimeoutRef.current)
    if (!query.trim()) {
      if (allRelatedLoadedRef.current) setRelatedResults(allRelatedProductsRef.current)
      return
    }
    relatedSearchTimeoutRef.current = setTimeout(async () => {
      setSearchingRelated(true)
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setRelatedResults(
            (Array.isArray(data) ? data : []).slice(0, 20).map((p: { id: string; nameEn: string; nameBg: string; image: string | null }) => ({
              id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image,
            }))
          )
        }
      } catch {
        setRelatedResults([])
      } finally {
        setSearchingRelated(false)
      }
    }, 300)
  }

  const toggleRelatedProduct = (product: { id: string; nameEn: string; nameBg: string; image: string | null }) => {
    const isSelected = formData.relatedProductIds.includes(product.id)
    if (isSelected) {
      setFormData(prev => ({ ...prev, relatedProductIds: prev.relatedProductIds.filter(id => id !== product.id) }))
      setSelectedRelated(prev => prev.filter(p => p.id !== product.id))
    } else {
      setFormData(prev => ({ ...prev, relatedProductIds: [...prev.relatedProductIds, product.id] }))
      setSelectedRelated(prev => [...prev, product])
    }
  }

  const removeRelatedProduct = (productId: string) => {
    setFormData(prev => ({ ...prev, relatedProductIds: prev.relatedProductIds.filter(id => id !== productId) }))
    setSelectedRelated(prev => prev.filter(p => p.id !== productId))
  }

  const loadAllUpsellProducts = async () => {
    // Share cache with related products — avoids double fetch
    if (allRelatedLoadedRef.current) {
      setUpsellResults(allRelatedProductsRef.current)
      return
    }
    setSearchingUpsell(true)
    try {
      const res = await fetch("/api/admin/products")
      if (res.ok) {
        const data = await res.json()
        const products = (Array.isArray(data) ? data : []).map((p: { id: string; nameEn: string; nameBg: string; image: string | null }) => ({
          id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image,
        }))
        allRelatedProductsRef.current = products
        allRelatedLoadedRef.current = true
        setUpsellResults(products)
      }
    } catch {
      setUpsellResults([])
    } finally {
      setSearchingUpsell(false)
    }
  }

  const searchUpsellProducts = (query: string) => {
    if (upsellSearchTimeoutRef.current) clearTimeout(upsellSearchTimeoutRef.current)
    if (!query.trim()) {
      if (allRelatedLoadedRef.current) setUpsellResults(allRelatedProductsRef.current)
      return
    }
    upsellSearchTimeoutRef.current = setTimeout(async () => {
      setSearchingUpsell(true)
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setUpsellResults(
            (Array.isArray(data) ? data : []).slice(0, 20).map((p: { id: string; nameEn: string; nameBg: string; image: string | null }) => ({
              id: p.id, nameEn: p.nameEn, nameBg: p.nameBg, image: p.image,
            }))
          )
        }
      } catch {
        setUpsellResults([])
      } finally {
        setSearchingUpsell(false)
      }
    }, 300)
  }

  const toggleUpsellProduct = (product: { id: string; nameEn: string; nameBg: string; image: string | null }) => {
    const isSelected = formData.upsellProductIds.includes(product.id)
    if (isSelected) {
      setFormData(prev => ({ ...prev, upsellProductIds: prev.upsellProductIds.filter(id => id !== product.id) }))
      setSelectedUpsell(prev => prev.filter(p => p.id !== product.id))
    } else {
      setFormData(prev => ({ ...prev, upsellProductIds: [...prev.upsellProductIds, product.id] }))
      setSelectedUpsell(prev => [...prev, product])
    }
  }

  const removeUpsellProduct = (productId: string) => {
    setFormData(prev => ({ ...prev, upsellProductIds: prev.upsellProductIds.filter(id => id !== productId) }))
    setSelectedUpsell(prev => prev.filter(p => p.id !== productId))
  }

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
      newErrors.slug = t("slugRequired")
    }
    if (!formData.nameEn.trim()) {
      newErrors.nameEn = t("nameEnRequired")
    }
    if (!formData.nameBg.trim()) {
      newErrors.nameBg = t("nameBgRequired")
    }
    if (!formData.nameEs.trim()) {
      newErrors.nameEs = t("nameEsRequired")
    }
    if (!formData.category) {
      newErrors.category = t("categoryRequired")
    }
    if (!formData.brandId) {
      newErrors.brandId = t("brandRequired")
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
      await onSubmit({ ...formData, bulkDiscountTiers: JSON.stringify(productBulkTiers) })
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setGalleryUploading(true)
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
      setFormData(prev => ({ ...prev, gallery: [...prev.gallery, data.url] }))
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(tc("uploadImageFailed"))
    } finally {
      setGalleryUploading(false)
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = ""
    }
  }

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }))
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, {
        colorId: colors[0]?.id || "",
        image: "",
        status: "in_stock",
        order: prev.variants.length,
      }],
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
      packages: prev.packages.map(pkg => ({
        ...pkg,
        packageVariants: pkg.packageVariants
          .filter(pv => pv.variantIndex !== index)
          .map(pv => ({ ...pv, variantIndex: pv.variantIndex > index ? pv.variantIndex - 1 : pv.variantIndex })),
      })),
    }))
  }

  const togglePackageVariant = (pkgIdx: number, variantIdx: number) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i !== pkgIdx) return pkg
        const existing = pkg.packageVariants.find(pv => pv.variantIndex === variantIdx)
        return {
          ...pkg,
          packageVariants: existing
            ? pkg.packageVariants.filter(pv => pv.variantIndex !== variantIdx)
            : [...pkg.packageVariants, { variantIndex: variantIdx, status: "in_stock" }],
        }
      }),
    }))
  }

  const updatePackageVariantStatus = (pkgIdx: number, variantIdx: number, status: string) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i !== pkgIdx) return pkg
        return {
          ...pkg,
          packageVariants: pkg.packageVariants.map(pv =>
            pv.variantIndex === variantIdx ? { ...pv, status } : pv
          ),
        }
      }),
    }))
  }

  const addPackage = () => {
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, {
        weightId: weights[0]?.id || "", slug: "", price: "", salePrice: "", sku: "",
        status: "in_stock", order: prev.packages.length, bulkDiscountTiers: "", packageVariants: [],
      }],
    }))
  }

  const removePackage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index),
    }))
  }

  const updatePackage = (index: number, field: keyof ProductPackageData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((p, i) => {
        if (i !== index) return p
        const updated = { ...p, [field]: value }
        if (field === "weightId") {
          const w = weights.find(w => w.id === value)
          if (w) updated.slug = w.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, "")
        }
        return updated
      }),
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-2 sm:pt-4">
      <div className="rounded-2xl border border-white/10 w-full max-w-[92vw] sm:max-w-2xl max-h-[85svh] flex flex-col bg-[#0d0d1a] shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
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

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 sm:space-y-6">
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
                placeholder={t("slugPlaceholder")}
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
                  placeholder={t("skuPlaceholder")}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => updateField("sku", generateSku(formData.category, formData.nameEn))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all"
                  title={t("generateSku")}
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
                  <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden">
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
              {t("brand")} <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.brandId}
              onChange={(e) => updateField("brandId", e.target.value)}
              className={`w-full px-4 py-2 bg-white/5 border rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors ${errors.brandId ? "border-red-500/60" : "border-white/10"}`}
            >
              <option value="">{t("noBrand")}</option>
              {brands.map((b) => {
                const brandName = locale === "bg" ? b.nameBg : locale === "es" ? b.nameEs : b.nameEn
                return (
                  <option key={b.id} value={b.id}>{brandName}</option>
                )
              })}
            </select>
            {errors.brandId && <p className="text-xs text-red-400 mt-1">{errors.brandId}</p>}
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
                <RichTextEditor
                  value={formData[`desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData] as string}
                  onChange={(html) => updateField(`desc${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` as keyof ProductFormData, html)}
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
                  {uploading ? t("uploading") : t("uploadImage")}
                </button>
                <span className="text-gray-500 text-sm self-center">{t("imageOr")}</span>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder={t("pasteImageUrl")}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-500">{t("imageUploadHelp")}</p>
              <p className="text-xs text-emerald-400/70">{t("imageRecommended")}</p>
            </div>
          </div>

          {/* Gallery Images */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t("galleryImages")}
            </h3>

            {formData.gallery.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {formData.gallery.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                    <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-red-500/70 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleGalleryUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => galleryFileInputRef.current?.click()}
              disabled={galleryUploading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 text-sm"
            >
              {galleryUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {galleryUploading ? t("uploading") : t("addImage")}
            </button>
            <p className="text-xs text-gray-500">{t("galleryHelp")}</p>
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
          {/* Package Sizes */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">{t("packageSizes")}</h3>
              <button
                type="button"
                onClick={addPackage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addPackage")}
              </button>
            </div>

            {formData.packages.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                {t("noPackages")}
              </p>
            ) : (
              <div className="space-y-3">
                {formData.packages.map((pkg, index) => (
                  <div key={index} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{weights.find(w => w.id === pkg.weightId)?.label || `Package ${index + 1}`}</span>
                      <button
                        type="button"
                        onClick={() => removePackage(index)}
                        className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("weightSize")} *</label>
                        {weights.length === 0 ? (
                          <p className="text-xs text-amber-400 py-1.5">{t("noWeights")}</p>
                        ) : (
                          <select
                            value={pkg.weightId}
                            onChange={e => updatePackage(index, "weightId", e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#0d0d1a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                          >
                            <option value="">{t("selectWeight")}</option>
                            {weights.map(w => (
                              <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("status")}</label>
                        <select
                          value={pkg.status}
                          onChange={e => updatePackage(index, "status", e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0d0d1a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="in_stock">{t("inStock")}</option>
                          <option value="out_of_stock">{t("outOfStock")}</option>
                          <option value="coming_soon">{t("comingSoon")}</option>
                          <option value="pre_order">{t("preOrder")}</option>
                          <option value="sold_out">{t("soldOut")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("price")} (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pkg.price}
                          onChange={e => updatePackage(index, "price", e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("salePrice")} (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pkg.salePrice}
                          onChange={e => updatePackage(index, "salePrice", e.target.value)}
                          placeholder={t("salePricePlaceholder")}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("skuOptional")}</label>
                        <input
                          type="text"
                          value={pkg.sku}
                          onChange={e => updatePackage(index, "sku", e.target.value)}
                          placeholder={t("skuPackagePlaceholder")}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t("urlSlugAuto")}</label>
                        <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm font-mono">
                          ?size={pkg.slug || "…"}
                        </div>
                      </div>
                    </div>

                    {/* SIZE × COLOR matrix: available colors for this package */}
                    {formData.variants.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs text-gray-500">{t("availableColors")}</p>
                        <div className="flex flex-wrap gap-3">
                          {formData.variants.map((v, vIdx) => {
                            const pv = pkg.packageVariants.find(x => x.variantIndex === vIdx)
                            const checked = !!pv
                            return (
                              <div key={vIdx} className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => togglePackageVariant(index, vIdx)}
                                  title={colors.find(c => c.id === v.colorId)?.nameEn || `Color ${vIdx + 1}`}
                                  className={`w-6 h-6 rounded-full border-2 transition-all flex-shrink-0 ${checked ? "border-emerald-400 ring-2 ring-emerald-400/30" : "border-white/20 hover:border-white/40"}`}
                                  style={{ backgroundColor: colors.find(c => c.id === v.colorId)?.hex || "#888" }}
                                />
                                {checked && (
                                  <select
                                    value={pv!.status}
                                    onChange={e => updatePackageVariantStatus(index, vIdx, e.target.value)}
                                    className="text-xs bg-[#0d0d1a] border border-white/10 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-emerald-500/50"
                                  >
                                    <option value="in_stock">{t("inStock")}</option>
                                    <option value="out_of_stock">{t("outOfStock")}</option>
                                    <option value="pre_order">{t("preOrder")}</option>
                                    <option value="coming_soon">{t("comingSoon")}</option>
                                    <option value="sold_out">{t("soldOut")}</option>
                                  </select>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Per-package bulk discount tiers */}
                    {(() => {
                      const pkgTiers = parseTiers(pkg.bulkDiscountTiers)
                      const setPkgTiers = (updater: (prev: BulkTier[]) => BulkTier[]) => {
                        const next = updater(pkgTiers)
                        updatePackage(index, "bulkDiscountTiers", next.length > 0 ? JSON.stringify(next) : "")
                      }
                      return (
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">{t("bulkDiscountTiersLabel")} <span className="text-gray-600">({t("packageOverride")})</span></p>
                            <button
                              type="button"
                              onClick={() => setPkgTiers(ts => [...ts, { minQty: 2, type: "percentage", value: 5 }])}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {t("addTier")}
                            </button>
                          </div>
                          {pkgTiers.length > 0 && (
                            <div className="space-y-1.5">
                              {pkgTiers.map((tier, ti) => (
                                <div key={ti} className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                  <input
                                    type="number" min="2" value={tier.minQty}
                                    onChange={e => setPkgTiers(ts => ts.map((t, j) => j === ti ? { ...t, minQty: parseInt(e.target.value) || 2 } : t))}
                                    className="w-12 min-w-0 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                                    placeholder="qty"
                                  />
                                  <select
                                    value={tier.type}
                                    onChange={e => setPkgTiers(ts => ts.map((t, j) => j === ti ? { ...t, type: e.target.value as "percentage" | "fixed" } : t))}
                                    className="px-1.5 py-1 bg-[#0d0d1a] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                                  >
                                    <option value="percentage">%</option>
                                    <option value="fixed">€</option>
                                  </select>
                                  <input
                                    type="number" min="0" step="0.01" value={tier.value}
                                    onChange={e => setPkgTiers(ts => ts.map((t, j) => j === ti ? { ...t, value: parseFloat(e.target.value) || 0 } : t))}
                                    className="flex-1 min-w-0 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                                    placeholder="value"
                                  />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPkgTiers(ts => ts.filter((_, j) => j !== ti))}
                                    className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                {formData.variants.map((variant, index) => {
                  const selectedColor = colors.find(c => c.id === variant.colorId)
                  return (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-white/20 shrink-0"
                          style={selectedColor?.hex2
                            ? { background: `linear-gradient(135deg, ${selectedColor.hex} 50%, ${selectedColor.hex2} 50%)` }
                            : { backgroundColor: selectedColor?.hex || "#888" }}
                        />
                        <span className="text-sm text-white font-medium">
                          {selectedColor?.nameEn || `Color ${index + 1}`}
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

                    {/* Color selector dropdown */}
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">{t("colorLabel")}</label>
                      {colors.length === 0 ? (
                        <p className="text-xs text-amber-400">{t("noColors")}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={variant.colorId}
                            onChange={(e) => updateVariant(index, "colorId", e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                          >
                            <option value="">{t("selectColor")}</option>
                            {colors.map(c => (
                              <option key={c.id} value={c.id}>{c.nameEn} ({c.nameBg})</option>
                            ))}
                          </select>
                          {selectedColor && (
                            <div
                              className="w-7 h-7 rounded-full border border-white/20 shrink-0"
                              style={selectedColor.hex2
                                ? { background: `linear-gradient(135deg, ${selectedColor.hex} 50%, ${selectedColor.hex2} 50%)` }
                                : { backgroundColor: selectedColor.hex }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image */}
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex items-end gap-2 flex-1 min-w-[100px]">
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

                      {/* Variant Status */}
                      <div className="shrink-0">
                        <label className="block text-[10px] text-gray-500 mb-1">{t("status")}</label>
                        <select
                          value={variant.status}
                          onChange={(e) => updateVariant(index, "status", e.target.value)}
                          className="min-w-[100px] px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                        >
                          <option value="in_stock">✅ {t("inStock")}</option>
                          <option value="out_of_stock">⏸️ {t("outOfStock")}</option>
                          <option value="sold_out">🚫 {t("soldOut")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
                })}
              </div>
            )}
          </div>

          {/* Related Products */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              {t("relatedProducts")}
            </h3>

            {/* Selected related products tags */}
            {selectedRelated.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedRelated.map(product => (
                  <span
                    key={product.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm"
                  >
                    {product.image && (
                      <img src={product.image} alt="" className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="max-w-[150px] truncate">{locale === "bg" ? product.nameBg : product.nameEn}</span>
                    <button
                      type="button"
                      onClick={() => removeRelatedProduct(product.id)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search dropdown */}
            <div ref={relatedDropdownRef} className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={(e) => {
                    setRelatedSearch(e.target.value)
                    searchRelatedProducts(e.target.value)
                  }}
                  onFocus={() => {
                    setShowRelatedDropdown(true)
                    loadAllRelatedProducts()
                  }}
                  placeholder={t("searchRelatedPlaceholder")}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                />
                {searchingRelated && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>

              {showRelatedDropdown && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1e1e36] border border-white/10 shadow-xl">
                  {relatedResults
                    .filter(p => p.id !== formData.id) // Exclude current product
                    .map(product => {
                      const isSelected = formData.relatedProductIds.includes(product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleRelatedProduct(product)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            isSelected ? "bg-emerald-500/10 text-emerald-300" : "text-gray-300 hover:bg-white/5"
                          }`}
                        >
                          {product.image ? (
                            <img src={product.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0" />
                          )}
                          <span className="flex-1 truncate">{locale === "bg" ? product.nameBg : product.nameEn}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  {relatedResults.length === 0 && !searchingRelated && (
                    <p className="px-3 py-3 text-sm text-gray-500 text-center">No products found</p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">{t("relatedHelp")}</p>
          </div>

          {/* Upsell Products */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t("upsellProducts")}
            </h3>

            {selectedUpsell.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUpsell.map(product => (
                  <span
                    key={product.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-sm"
                  >
                    {product.image && (
                      <img src={product.image} alt="" className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="max-w-[150px] truncate">{locale === "bg" ? product.nameBg : product.nameEn}</span>
                    <button
                      type="button"
                      onClick={() => removeUpsellProduct(product.id)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div ref={upsellDropdownRef} className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={upsellSearch}
                  onChange={(e) => {
                    setUpsellSearch(e.target.value)
                    searchUpsellProducts(e.target.value)
                  }}
                  onFocus={() => {
                    setShowUpsellDropdown(true)
                    loadAllUpsellProducts()
                  }}
                  placeholder={t("searchUpsellPlaceholder")}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                />
                {searchingUpsell && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>

              {showUpsellDropdown && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1e1e36] border border-white/10 shadow-xl">
                  {upsellResults
                    .filter(p => p.id !== formData.id)
                    .map(product => {
                      const isSelected = formData.upsellProductIds.includes(product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleUpsellProduct(product)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            isSelected ? "bg-amber-500/10 text-amber-300" : "text-gray-300 hover:bg-white/5"
                          }`}
                        >
                          {product.image ? (
                            <img src={product.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0" />
                          )}
                          <span className="flex-1 truncate">{locale === "bg" ? product.nameBg : product.nameEn}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  {upsellResults.length === 0 && !searchingUpsell && (
                    <p className="px-3 py-3 text-sm text-gray-500 text-center">No products found</p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">{t("upsellHelp")}</p>
          </div>

          {/* Per-product Bulk Discounts */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Tag className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Bulk Discounts</h3>
                <p className="text-xs text-gray-500">Override global tiers for this product (leave empty to use global)</p>
              </div>
            </div>
            {productBulkTiers.length > 0 && (
              <div className="space-y-2">
                {productBulkTiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 shrink-0">Buy</span>
                    <input
                      type="number" min={1} value={tier.minQty}
                      onChange={e => setProductBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, minQty: parseInt(e.target.value) || 1 } : t))}
                      className="w-14 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-xs text-slate-500 shrink-0">+ →</span>
                    <select
                      value={tier.type}
                      onChange={e => setProductBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, type: e.target.value as "percentage" | "fixed" } : t))}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">€</option>
                    </select>
                    <input
                      type="number" min={0.01} step={0.01} value={tier.value}
                      onChange={e => setProductBulkTiers(ts => ts.map((t, j) => j === i ? { ...t, value: parseFloat(e.target.value) || 0 } : t))}
                      className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setProductBulkTiers(ts => ts.filter((_, j) => j !== i))}
                      className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setProductBulkTiers(ts => [...ts, { minQty: 2, type: "percentage", value: 5 }])}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              + Add tier
            </button>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Product Settings */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <h3 className="text-sm font-medium text-gray-300">Settings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => updateField("featured", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <span className="text-sm text-gray-300">⭐ {t("featured")}</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.bestSeller}
                    onChange={(e) => updateField("bestSeller", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="text-sm text-gray-300">🏆 Best Seller</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.onSale}
                    onChange={(e) => updateField("onSale", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500/30"
                  />
                  <span className="text-sm text-gray-300">🏷️ {t("onSale")}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none text-base sm:text-sm"
                >
                <option value="in_stock">✅ In Stock</option>
                <option value="out_of_stock">⏸️ Out of Stock</option>
                <option value="coming_soon">🔜 Coming Soon</option>
                <option value="pre_order">📦 Pre-Order</option>
                <option value="sold_out">🚫 Sold Out</option>
              </select>
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
