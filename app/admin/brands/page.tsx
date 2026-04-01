"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, BadgeCheck, Package, ExternalLink } from "lucide-react"
import Link from "next/link"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { DataTable } from "@/app/components/admin/DataTable"
import { BrandForm } from "@/app/components/admin/BrandForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface Brand {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  titleAlign: string
  descBg: string | null
  descEn: string | null
  descEs: string | null
  image: string | null
  order: number
  _count: { products: number }
}

export default function BrandsPage() {
  const t = useTranslations("admin.brands")
  const { can } = useAdminPermissions()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/brands")
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const handleSubmit = async (data: {
    id?: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    titleAlign: string
    descBg: string
    descEn: string
    descEs: string
    image: string
    order: number
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/brands", {
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
    setEditingBrand(null)
    toast.success(t("savedSuccess"))
    fetchBrands()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/brands?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchBrands()
  }

  const columns = [
    {
      key: "brand",
      header: t("name"),
      render: (item: Brand) => (
        <div className="flex items-center gap-3">
          {item.image ? (
            <img src={item.image} alt={item.nameEn} className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-white text-sm truncate">{item.nameEn}</p>
            <Link
              href={`/brands/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline truncate block"
            >
              /brands/{item.slug}
            </Link>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      header: t("slug"),
      className: "hidden md:table-cell",
      render: (item: Brand) => (
        <span className="font-mono text-sm text-cyan-400">{item.slug}</span>
      ),
    },
    {
      key: "products",
      header: t("productCount"),
      className: "hidden sm:table-cell",
      render: (item: Brand) => (
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <Package className="w-3.5 h-3.5" />
          {item._count.products}
        </span>
      ),
    },
    {
      key: "order",
      header: t("order"),
      className: "hidden lg:table-cell",
    },
    {
      key: "actions",
      header: "",
      render: (item: Brand) => (
        <div className="flex items-center gap-2">
          {can("brands", "edit") && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingBrand(item); setShowForm(true) }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={t("edit")}
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("brands", "delete") && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.nameEn) }}
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
        {can("brands", "create") && (
          <button
            onClick={() => { setEditingBrand(null); setShowForm(true) }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm sm:text-base text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("addBrand")}
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={4} />
      ) : (
        <DataTable
          data={brands}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={<div className="flex flex-col items-center gap-2"><p className="text-gray-400">{t("noBrands")}</p><p className="text-xs text-gray-600">Add your first brand to organize products</p></div>}
          onRowClick={(item) => { setEditingBrand(item); setShowForm(true) }}
          renderMobileCard={(item: Brand) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {item.image ? (
                    <img src={item.image} alt={item.nameEn} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{item.nameEn}</p>
                    <p className="text-xs text-gray-500 truncate">{item.nameBg}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Package className="w-3 h-3" />
                  {item._count.products}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-cyan-400 truncate">{item.slug}</span>
                <span className="text-xs text-gray-500 shrink-0">#{item.order}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                {can("brands", "edit") && (
                  <button
                    onClick={() => { setEditingBrand(item); setShowForm(true) }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                {can("brands", "delete") && (
                  <button
                    onClick={() => handleDelete(item.id, item.nameEn)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </>
          )}
        />
      )}

      {showForm && (
        <BrandForm
          initialData={editingBrand || undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingBrand(null) }}
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
