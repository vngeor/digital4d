"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Plus, Edit2, Trash2, Loader2, Package, FolderOpen, Star, Eye, EyeOff, Link as LinkIcon, ExternalLink } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/app/components/admin/DataTable"
import { ProductForm } from "@/app/components/admin/ProductForm"
import { COLOR_CLASSES } from "@/app/components/admin/TypeForm"

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
  image: string | null
  gallery: string[]
  fileUrl: string | null
  fileType: string | null
  featured: boolean
  published: boolean
  inStock: boolean
  order: number
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
}

const FILE_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  digital: { label: "Digital", color: "bg-purple-500/20 text-purple-400" },
  physical: { label: "Physical", color: "bg-emerald-500/20 text-emerald-400" },
  service: { label: "Service", color: "bg-amber-500/20 text-amber-400" },
}

export default function ProductsPage() {
  const t = useTranslations("admin.products")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/products/categories")
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
  }

  const fetchProducts = async (category?: string | null) => {
    setLoading(true)
    const url = category
      ? `/api/admin/products?category=${encodeURIComponent(category)}`
      : "/api/admin/products"
    const res = await fetch(url)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchProducts(selectedCategory)
  }, [selectedCategory])

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
    image: string
    gallery: string[]
    fileUrl: string
    fileType: string
    featured: boolean
    published: boolean
    inStock: boolean
    order: number
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const error = await res.json()
      alert(error.error || "Failed to save product")
      return
    }

    setShowForm(false)
    setEditingProduct(null)
    fetchProducts(selectedCategory)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" })
    fetchProducts(selectedCategory)
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
      render: (item: Product) => (
        <div className="flex items-center gap-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.nameEn}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{item.nameEn}</p>
              {item.featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
            </div>
            <a
              href={`/products/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 group hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded transition-colors w-fit"
            >
              <LinkIcon className="w-3 h-3 text-gray-500 group-hover:text-emerald-400" />
              <span className="text-xs text-cyan-400 group-hover:text-cyan-300">/{item.slug}</span>
              <ExternalLink className="w-2.5 h-2.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("category"),
      render: (item: Product) => {
        const color = getCategoryColor(item.category)
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[color] || "bg-gray-500/20 text-gray-400"}`}
          >
            {item.category}
          </span>
        )
      },
    },
    {
      key: "sku",
      header: t("sku"),
      render: (item: Product) => {
        if (!item.sku) {
          return <span className="text-gray-500 text-sm">—</span>
        }
        return (
          <a
            href={`/products/${item.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 group hover:bg-white/5 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors w-fit"
          >
            <span className="font-mono text-sm text-amber-400 group-hover:text-amber-300">{item.sku}</span>
            <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      },
    },
    {
      key: "fileType",
      header: t("fileType"),
      render: (item: Product) => {
        const badge = FILE_TYPE_BADGES[item.fileType || "physical"]
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
            {badge.label}
          </span>
        )
      },
    },
    {
      key: "price",
      header: t("price"),
      render: (item: Product) => (
        <div>
          <p className="text-white">{formatPrice(item)}</p>
          {item.onSale && item.salePrice && (
            <p className="text-xs text-emerald-400">Sale: {parseFloat(item.salePrice).toFixed(2)} {item.currency}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: t("published"),
      render: (item: Product) => (
        <div className="flex items-center gap-2">
          {item.published ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Eye className="w-4 h-4" />
              <span className="text-xs">{t("published")}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500">
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">{t("draft")}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (item: Product) => (
        <div className="flex items-center gap-2">
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id)
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
            title={t("delete")}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/categories"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            {t("manageCategories")}
          </Link>
          <button
            onClick={() => {
              setEditingProduct(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("addProduct")}
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedCategory === null
              ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          {t("all")}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.slug)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === category.slug
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {category.nameEn}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noProducts")}
        />
      )}

      {showForm && (
        <ProductForm
          initialData={editingProduct || undefined}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
        />
      )}
    </div>
  )
}
