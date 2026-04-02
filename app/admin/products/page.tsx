"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Package, FolderOpen, Star, Trophy, Eye, EyeOff, Link as LinkIcon, ExternalLink, Home, BadgeCheck, Download } from "lucide-react"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import Link from "next/link"
import { SortableDataTable } from "@/app/components/admin/SortableDataTable"
import { ProductForm } from "@/app/components/admin/ProductForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { BulkActionBar } from "@/app/components/admin/BulkActionBar"
import { COLOR_CLASSES } from "@/app/components/admin/TypeForm"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface ProductVariant {
  id: string
  colorNameBg: string
  colorNameEn: string
  colorNameEs: string
  colorHex: string
  image: string | null
  order: number
}

interface Product {
  id: string
  slug: string
  sku: string | null
  nameBg: string
  nameEn: string
  nameEs: string
  descBg: string | null
  descEn: string | null
  descEs: string | null
  price: string | null
  salePrice: string | null
  onSale: boolean
  currency: string
  priceType: string
  category: string
  tags: string[]
  brandId: string | null
  brand: { id: string; slug: string; nameBg: string; nameEn: string; nameEs: string } | null
  image: string | null
  gallery: string[]
  relatedProductIds: string[]
  fileUrl: string | null
  fileType: string | null
  featured: boolean
  bestSeller: boolean
  published: boolean
  status: string
  order: number
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

interface ProductCategory {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  color: string
  parentId: string | null
  children: ProductCategory[]
}

const FILE_TYPE_BADGES: Record<string, { labelKey: string; color: string }> = {
  digital: { labelKey: "fileTypeDigital", color: "bg-purple-500/20 text-purple-400" },
  physical: { labelKey: "fileTypePhysical", color: "bg-emerald-500/20 text-emerald-400" },
  service: { labelKey: "fileTypeService", color: "bg-amber-500/20 text-amber-400" },
}

export default function ProductsPage() {
  const t = useTranslations("admin.products")
  const { can } = useAdminPermissions()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // For computing homepage positions
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [brands, setBrands] = useState<Array<{ id: string; slug: string; nameBg: string; nameEn: string; nameEs: string }>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const brandDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const tb = useTranslations("admin.bulk")

  // Compute which products appear on homepage (top 8 published, sorted by featured then order)
  const homepageProductIds = new Set(
    [...allProducts]
      .filter(p => p.published)
      .sort((a, b) => {
        // Featured first (desc), then by order (asc)
        if (a.featured !== b.featured) return b.featured ? 1 : -1
        return a.order - b.order
      })
      .slice(0, 8)
      .map(p => p.id)
  )

  const getHomepagePosition = (productId: string): number | null => {
    const sorted = [...allProducts]
      .filter(p => p.published)
      .sort((a, b) => {
        if (a.featured !== b.featured) return b.featured ? 1 : -1
        return a.order - b.order
      })
      .slice(0, 8)
    const index = sorted.findIndex(p => p.id === productId)
    return index >= 0 ? index + 1 : null
  }

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/products/categories")
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
  }

  const fetchBrands = async () => {
    const res = await fetch("/api/admin/brands")
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
  }

  const fetchProducts = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/products")
    const data = await res.json()
    const items = Array.isArray(data) ? data : []
    setProducts(items)
    setAllProducts(items)
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
    fetchBrands()
    fetchProducts()
  }, [])

  // Click-outside to close brand/category dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Deep link: open edit form when ?edit=<id> or create form when ?action=create
  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "create" && !showForm) {
      setEditingProduct(null)
      setShowForm(true)
      window.history.replaceState({}, "", "/admin/products")
      return
    }
    const editId = searchParams.get("edit")
    if (editId && products.length > 0 && !showForm) {
      const item = products.find(p => p.id === editId)
      if (item) {
        setEditingProduct(item)
        setShowForm(true)
        window.history.replaceState({}, "", "/admin/products")
      }
    }
  }, [searchParams, products])

  const handleSubmit = async (data: {
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
    fileUrl: string
    fileType: string
    featured: boolean
  bestSeller: boolean
    published: boolean
    status: string
    order: number
    variants: Array<{
      id?: string
      colorNameBg: string
      colorNameEn: string
      colorNameEs: string
      colorHex: string
      image: string
      order: number
    }>
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const error = await res.json()
      toast.error(error.error || t("saveFailed"))
      return
    }

    setShowForm(false)
    setEditingProduct(null)
    toast.success(t("savedSuccess"))
    fetchProducts()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/products?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchProducts()
  }

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/admin/products/export")
      if (!res.ok) { toast.error(t("exportFailed")); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("exportFailed"))
    }
  }

  const handleToggleField = async (id: string, field: "published" | "featured" | "bestSeller", value: boolean) => {
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    setAllProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleField", id, field, value }),
    })
    if (!res.ok) {
      // Revert on failure
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !value } : p))
      setAllProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !value } : p))
      toast.error(t("saveFailed"))
    }
  }

  const handleReorder = async (items: Product[]) => {
    setProducts(items)
    // Also update allProducts if not filtering
    if (selectedCategories.size === 0) {
      setAllProducts(items)
    }
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        items: items.map((item, index) => ({ id: item.id, order: index })),
      }),
    })
    if (!res.ok) {
      toast.error(t("reorderFailed"))
      fetchProducts()
      return
    }
    // Refresh to update homepage positions
    fetchProducts()
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids }),
    })
    if (res.ok) {
      toast.success(tb("bulkDeleteSuccess", { count: ids.length }))
      setSelectedIds(new Set())
      setBulkDeleteConfirm(false)
      fetchProducts()
    } else {
      toast.error(t("deleteFailed"))
    }
  }

  const handleBulkPublish = async (publish: boolean) => {
    const ids = Array.from(selectedIds)
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: publish ? "publish" : "unpublish", ids }),
    })
    if (res.ok) {
      toast.success(publish
        ? tb("bulkPublishSuccess", { count: ids.length })
        : tb("bulkUnpublishSuccess", { count: ids.length })
      )
      setSelectedIds(new Set())
      fetchProducts()
    } else {
      toast.error(t("updateFailed"))
    }
  }

  const getCategoryColor = (categorySlug: string) => {
    const category = categories.find((c) => c.slug === categorySlug)
    return category?.color || "gray"
  }

  const formatPrice = (product: Product) => {
    if (product.priceType === "quote") return t("priceTypeQuote")
    if (!product.price) return "-"
    const price = parseFloat(product.price)
    const prefix = product.priceType === "from" ? t("priceTypeFrom") + " " : ""
    return `${prefix}${price.toFixed(2)} ${product.currency}`
  }

  const columns = [
    {
      key: "product",
      header: t("name"),
      className: "min-w-[140px] sm:min-w-[200px]",
      render: (item: Product) => (
        <div className="flex items-center gap-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.nameEn}
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white text-sm truncate">{item.nameEn}</p>
              {item.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            <a
              href={`/products/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline truncate block"
            >
              /{item.slug}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "homepage",
      header: t("homepage"),
      className: "whitespace-nowrap w-[70px] hidden sm:table-cell",
      render: (item: Product) => {
        const position = getHomepagePosition(item.id)
        if (!item.published) {
          return <span className="text-gray-600 text-xs">—</span>
        }
        if (position) {
          return (
            <div className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium text-xs">#{position}</span>
            </div>
          )
        }
        return <span className="text-gray-500 text-xs">—</span>
      },
    },
    {
      key: "category",
      header: t("category"),
      className: "whitespace-nowrap hidden md:table-cell",
      render: (item: Product) => {
        const color = getCategoryColor(item.category)
        const cat = categories.find(c => c.slug === item.category)
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_CLASSES[color] || "bg-gray-500/20 text-gray-400"}`}
          >
            {cat?.nameEn || item.category}
          </span>
        )
      },
    },
    {
      key: "brand",
      header: t("brand"),
      className: "whitespace-nowrap hidden lg:table-cell",
      render: (item: Product) => {
        if (!item.brand) return <span className="text-gray-500 text-xs">—</span>
        return (
          <Link
            href={`/brands/${item.brand.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 transition-colors"
          >
            {item.brand.nameEn}
          </Link>
        )
      },
    },
    {
      key: "sku",
      header: t("sku"),
      className: "whitespace-nowrap hidden xl:table-cell",
      render: (item: Product) => {
        if (!item.sku) {
          return <span className="text-gray-500 text-xs">—</span>
        }
        return (
          <span className="font-mono text-xs text-amber-400">{item.sku}</span>
        )
      },
    },
    {
      key: "fileType",
      header: t("fileType"),
      className: "whitespace-nowrap hidden lg:table-cell",
      render: (item: Product) => {
        const badge = FILE_TYPE_BADGES[item.fileType || "physical"]
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
            {t(badge.labelKey)}
          </span>
        )
      },
    },
    {
      key: "price",
      header: t("price"),
      className: "whitespace-nowrap text-right",
      render: (item: Product) => {
        if (item.priceType === "quote") {
          return <span className="text-amber-400 text-sm">{t("priceTypeQuote")}</span>
        }
        if (!item.price) {
          return <span className="text-gray-500 text-sm">—</span>
        }
        const originalPrice = parseFloat(item.price)
        const hasDiscount = item.onSale && item.salePrice
        const salePrice = hasDiscount ? parseFloat(item.salePrice!) : null
        const discountPercent = hasDiscount ? Math.round((1 - salePrice! / originalPrice) * 100) : 0
        const prefix = item.priceType === "from" ? t("priceTypeFrom") + " " : ""

        return (
          <div className="text-right">
            {hasDiscount ? (
              <>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-500 text-xs line-through">
                    {prefix}{originalPrice.toFixed(2)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium">
                    -{discountPercent}%
                  </span>
                </div>
                <p className="text-red-400 text-sm font-medium">
                  {prefix}{salePrice!.toFixed(2)} {item.currency}
                </p>
              </>
            ) : (
              <p className="text-white text-sm">
                {prefix}{originalPrice.toFixed(2)} {item.currency}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: "productStatus",
      header: "Status",
      className: "whitespace-nowrap hidden md:table-cell",
      render: (item: Product) => {
        const statusStyles: Record<string, string> = {
          in_stock: "bg-emerald-500/20 text-emerald-400",
          out_of_stock: "bg-gray-500/20 text-gray-400",
          coming_soon: "bg-blue-500/20 text-blue-400",
          pre_order: "bg-purple-500/20 text-purple-400",
          sold_out: "bg-red-500/20 text-red-400",
        }
        const statusLabels: Record<string, string> = {
          in_stock: "In Stock",
          out_of_stock: "Out of Stock",
          coming_soon: "Coming Soon",
          pre_order: "Pre-Order",
          sold_out: "Sold Out",
        }
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "featured", !item.featured) }}
              className={`p-1 rounded transition-colors ${item.featured ? "text-amber-400 hover:bg-amber-500/10" : "text-gray-600 hover:bg-white/5"}`}
              title={item.featured ? "Remove featured" : "Set as featured"}
            >
              <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-amber-400" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "bestSeller", !item.bestSeller) }}
              className={`p-1 rounded transition-colors ${item.bestSeller ? "text-amber-400 hover:bg-amber-500/10" : "text-gray-600 hover:bg-white/5"}`}
              title={item.bestSeller ? "Remove best seller" : "Set as best seller"}
            >
              <Trophy className={`w-3.5 h-3.5 ${item.bestSeller ? "fill-amber-400" : ""}`} />
            </button>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[item.status] || "bg-gray-500/20 text-gray-400"}`}>
              {statusLabels[item.status] || item.status}
            </span>
          </div>
        )
      },
    },
    {
      key: "published",
      header: t("published"),
      className: "whitespace-nowrap hidden sm:table-cell",
      render: (item: Product) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "published", !item.published) }}
          className={`p-1.5 rounded-lg transition-colors ${item.published ? "text-emerald-400 hover:bg-emerald-500/10" : "text-gray-500 hover:bg-white/5"}`}
          title={item.published ? "Unpublish" : "Publish"}
        >
          {item.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      render: (item: Product) => (
        <div className="flex items-center gap-1">
          {can("products", "edit") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingProduct(item)
                setShowForm(true)
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={t("edit")}
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("products", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.nameEn)
              }}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              title={t("delete")}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-sm lg:text-base text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {can("products", "view") && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:bg-white/5 transition-all"
            >
              <Download className="w-4 h-4" />
              {t("exportCSV")}
            </button>
          )}
          {can("products", "create") && (
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowForm(true)
              }}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm sm:text-base font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Plus className="w-5 h-5" />
              {t("addProduct")}
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/products/categories"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          {t("manageCategories")}
        </Link>
        <Link
          href="/admin/brands"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          {t("manageBrands")}
        </Link>
      </div>

      {/* Filters: Category dropdown + Brand dropdown */}
      <div className="flex flex-row items-center gap-3 flex-wrap">
        <div ref={categoryDropdownRef} className="relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategories.size > 0
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white bg-white/5 border border-white/10"
            }`}
          >
            {selectedCategories.size > 0
              ? `${selectedCategories.size} ${t("categories")}`
              : t("allCategoriesFilter")}
            <svg className={`w-3.5 h-3.5 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCategoryDropdown && (
            <div className="absolute top-full mt-1 left-0 w-52 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-30 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setSelectedCategories(new Set()); setShowCategoryDropdown(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategories.size === 0 ? "text-emerald-400 bg-emerald-500/10" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCategories.size === 0 ? "border-emerald-400 bg-emerald-500/20" : "border-white/20"}`}>
                  {selectedCategories.size === 0 && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </span>
                {t("all")}
              </button>
              {categories.filter(c => !c.parentId).map(parent => {
                const isParentActive = selectedCategories.has(parent.slug)
                return (
                  <div key={parent.id}>
                    <button
                      onClick={() => {
                        setSelectedCategories(prev => {
                          const next = new Set(prev)
                          if (next.has(parent.slug)) next.delete(parent.slug)
                          else next.add(parent.slug)
                          return next
                        })
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        isParentActive ? "text-emerald-400 bg-emerald-500/10" : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isParentActive ? "border-emerald-400 bg-emerald-500/20" : "border-white/20"}`}>
                        {isParentActive && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {parent.nameEn}
                    </button>
                    {parent.children?.map(child => {
                      const isChildActive = selectedCategories.has(child.slug)
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            setSelectedCategories(prev => {
                              const next = new Set(prev)
                              if (next.has(child.slug)) next.delete(child.slug)
                              else next.add(child.slug)
                              return next
                            })
                          }}
                          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-left text-xs transition-colors ${
                            isChildActive ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isChildActive ? "border-emerald-400 bg-emerald-500/20" : "border-white/20"}`}>
                            {isChildActive && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          {child.nameEn}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {brands.length > 0 && (
          <div ref={brandDropdownRef} className="relative">
            <button
              onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                selectedBrands.size > 0
                  ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                  : "text-gray-400 hover:text-white bg-white/5 border border-white/10"
              }`}
            >
              {selectedBrands.size > 0
                ? `${selectedBrands.size} brand${selectedBrands.size > 1 ? "s" : ""}`
                : t("allBrandsFilter")}
              <svg className={`w-3.5 h-3.5 transition-transform ${showBrandDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBrandDropdown && (
              <div className="absolute top-full mt-1 right-0 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-30 py-1 max-h-60 overflow-y-auto">
                {brands.map(b => {
                  const isActive = selectedBrands.has(b.id)
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBrands(prev => {
                          const next = new Set(prev)
                          if (next.has(b.id)) next.delete(b.id)
                          else next.add(b.id)
                          return next
                        })
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        isActive ? "text-lime-400 bg-lime-500/10" : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${isActive ? "border-lime-400 bg-lime-500/20" : "border-white/20"}`}>
                        {isActive && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {b.nameEn}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {(selectedCategories.size > 0 || selectedBrands.size > 0) && (
          <button
            onClick={() => { setSelectedCategories(new Set()); setSelectedBrands(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
              {selectedCategories.size + selectedBrands.size}
            </span>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={6} />
      ) : (
        <SortableDataTable
          data={products.filter(p =>
            (selectedCategories.size === 0 || selectedCategories.has(p.category)) &&
            (selectedBrands.size === 0 || (p.brandId !== null && selectedBrands.has(p.brandId)))
          )}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={<div className="flex flex-col items-center gap-2"><Package className="w-10 h-10 text-gray-600" /><p className="text-gray-400">{t("noProducts")}</p><p className="text-xs text-gray-600">Create your first product to get started</p></div>}
          onReorder={handleReorder}
          onRowClick={(item) => {
            setEditingProduct(item)
            setShowForm(true)
          }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          renderMobileCard={(item: Product) => {
            const homepagePos = getHomepagePosition(item.id)
            const categoryColor = getCategoryColor(item.category)
            const fileTypeBadge = FILE_TYPE_BADGES[item.fileType || "physical"]
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image ? (
                      <img src={item.image} alt={item.nameEn} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-white text-sm truncate">{item.nameEn}</p>
                        {item.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{item.nameBg}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "featured", !item.featured) }}
                      className={`p-1 rounded ${item.featured ? "text-amber-400" : "text-gray-600"}`}>
                      <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-amber-400" : ""}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "bestSeller", !item.bestSeller) }}
                      className={`p-1 rounded ${item.bestSeller ? "text-amber-400" : "text-gray-600"}`}>
                      <Trophy className={`w-3.5 h-3.5 ${item.bestSeller ? "fill-amber-400" : ""}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleField(item.id, "published", !item.published) }}
                      className={`p-1 rounded ${item.published ? "text-emerald-400" : "text-gray-500"}`}>
                      {item.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"}`}>
                    {categories.find(c => c.slug === item.category)?.nameEn || item.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fileTypeBadge.color}`}>
                    {t(fileTypeBadge.labelKey)}
                  </span>
                  {item.brand && (
                    <Link
                      href={`/brands/${item.brand.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-lime-500/20 text-lime-400"
                    >
                      {item.brand.nameEn}
                    </Link>
                  )}
                  {homepagePos && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Home className="w-3 h-3" />#{homepagePos}
                    </span>
                  )}
                  {item.bestSeller && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">🏆</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.status === "in_stock" ? "bg-emerald-500/20 text-emerald-400"
                    : item.status === "sold_out" ? "bg-red-500/20 text-red-400"
                    : item.status === "coming_soon" ? "bg-blue-500/20 text-blue-400"
                    : item.status === "pre_order" ? "bg-purple-500/20 text-purple-400"
                    : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {item.status === "in_stock" ? "✓" : item.status === "sold_out" ? "✗" : item.status === "coming_soon" ? "⏳" : item.status === "pre_order" ? "📦" : "⏸"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {item.sku && <span className="font-mono text-xs text-amber-400">{item.sku}</span>}
                    <a
                      href={`/products/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 truncate"
                    >
                      /{item.slug}
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    {item.priceType === "quote" ? (
                      <span className="text-amber-400 text-sm">{t("priceTypeQuote")}</span>
                    ) : item.price ? (
                      item.onSale && item.salePrice ? (
                        <div>
                          <span className="text-gray-500 text-xs line-through">{parseFloat(item.price).toFixed(2)}</span>
                          <p className="text-red-400 text-sm font-medium">{parseFloat(item.salePrice).toFixed(2)} {item.currency}</p>
                        </div>
                      ) : (
                        <span className="text-white text-sm">{parseFloat(item.price).toFixed(2)} {item.currency}</span>
                      )
                    ) : (
                      <span className="text-gray-500 text-sm">—</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {can("products", "edit") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(item); setShowForm(true) }}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {can("products", "delete") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.nameEn) }}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </>
            )
          }}
        />
      )}

      {showForm && (
        <ProductForm
          initialData={editingProduct || undefined}
          categories={categories}
          brands={brands}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { name: deleteItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />

      <ConfirmModal
        open={bulkDeleteConfirm}
        title={tb("bulkDelete")}
        message={tb("confirmBulkDelete", { count: selectedIds.size })}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        selectedLabel={tb("selected", { count: selectedIds.size })}
        onDelete={can("products", "delete") ? () => setBulkDeleteConfirm(true) : undefined}
        onPublish={can("products", "edit") ? () => handleBulkPublish(true) : undefined}
        onUnpublish={can("products", "edit") ? () => handleBulkPublish(false) : undefined}
        onClear={() => setSelectedIds(new Set())}
        deleteLabel={tb("bulkDelete")}
        publishLabel={tb("bulkPublish")}
        unpublishLabel={tb("bulkUnpublish")}
      />
    </div>
  )
}
