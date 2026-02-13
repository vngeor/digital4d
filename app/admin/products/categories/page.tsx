"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, FolderOpen } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/app/components/admin/DataTable"
import { ProductCategoryForm } from "@/app/components/admin/ProductCategoryForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { COLOR_CLASSES } from "@/app/components/admin/TypeForm"

interface ProductCategory {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  descBg: string | null
  descEn: string | null
  descEs: string | null
  image: string | null
  color: string
  order: number
}

export default function CategoriesPage() {
  const t = useTranslations("admin.productCategories")
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/products/categories")
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleSubmit = async (data: {
    id?: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    descBg: string
    descEn: string
    descEs: string
    image: string
    color: string
    order: number
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/products/categories", {
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
    setEditingCategory(null)
    toast.success(t("savedSuccess"))
    fetchCategories()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    await fetch(`/api/admin/products/categories?id=${deleteItem.id}`, { method: "DELETE" })
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchCategories()
  }

  const columns = [
    {
      key: "slug",
      header: t("slug"),
      render: (item: ProductCategory) => (
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-sm text-cyan-400">{item.slug}</span>
        </div>
      ),
    },
    {
      key: "nameEn",
      header: t("name"),
      render: (item: ProductCategory) => (
        <div>
          <p className="font-medium text-white">{item.nameEn}</p>
          <p className="text-xs text-gray-500">{item.nameBg}</p>
        </div>
      ),
    },
    {
      key: "color",
      header: t("color"),
      render: (item: ProductCategory) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[item.color] || "bg-gray-500/20 text-gray-400"}`}
        >
          {item.color}
        </span>
      ),
    },
    {
      key: "order",
      header: t("order"),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (item: ProductCategory) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingCategory(item)
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
              handleDelete(item.id, item.nameEn)
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
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t("addCategory")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={categories}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noCategories")}
        />
      )}

      {showForm && (
        <ProductCategoryForm
          initialData={editingCategory || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingCategory(null)
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
    </div>
  )
}
