"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Package } from "lucide-react"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { SortableDataTable } from "@/app/components/admin/SortableDataTable"
import { WeightForm } from "@/app/components/admin/WeightForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface Weight {
  id: string
  label: string
  grams: number | null
  order: number
  _count: { packages: number }
}

export default function WeightsPage() {
  const t = useTranslations("admin.weights")
  const { can } = useAdminPermissions()
  const [weights, setWeights] = useState<Weight[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWeight, setEditingWeight] = useState<Weight | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  const fetchWeights = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/weights")
    const data = await res.json()
    setWeights(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchWeights() }, [])

  const handleSubmit = async (data: { id?: string; label: string; grams: string; order: number }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/weights", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || t("saveFailed"))
      return
    }
    setShowForm(false)
    setEditingWeight(null)
    toast.success(t("savedSuccess"))
    fetchWeights()
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/weights?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchWeights()
  }

  const handleReorder = async (items: Weight[]) => {
    setWeights(items)
    await fetch("/api/admin/weights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((item, i) => ({ id: item.id, order: i })) }),
    })
  }

  const columns = [
    {
      key: "label",
      header: t("label"),
      render: (item: Weight) => (
        <div>
          <p className="font-medium text-white text-sm">{item.label}</p>
          {item.grams && <p className="text-xs text-gray-500">{item.grams} g</p>}
        </div>
      ),
    },
    {
      key: "packages",
      header: t("packageCount"),
      className: "hidden sm:table-cell",
      render: (item: Weight) => (
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <Package className="w-3.5 h-3.5" />
          {item._count.packages}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Weight) => (
        <div className="flex items-center gap-2">
          {can("products", "edit") && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingWeight(item); setShowForm(true) }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={t("edit")}
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("products", "edit") && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem({ id: item.id, name: item.label }) }}
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
        {can("products", "edit") && (
          <button
            onClick={() => { setEditingWeight(null); setShowForm(true) }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm sm:text-base text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("addWeight")}
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={2} />
      ) : (
        <SortableDataTable
          data={weights}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-400">{t("noWeights")}</p>
              <p className="text-xs text-gray-600">{t("noWeightsHint")}</p>
            </div>
          }
          onReorder={handleReorder}
          onRowClick={(item) => { setEditingWeight(item); setShowForm(true) }}
          renderMobileCard={(item: Weight) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm">{item.label}</p>
                  {item.grams && <p className="text-xs text-gray-500">{item.grams} g</p>}
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Package className="w-3 h-3" />
                  {item._count.packages}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                {can("products", "edit") && (
                  <button onClick={() => { setEditingWeight(item); setShowForm(true) }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                {can("products", "edit") && (
                  <button onClick={() => setDeleteItem({ id: item.id, name: item.label })} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </>
          )}
        />
      )}

      {showForm && (
        <WeightForm
          initialData={editingWeight ? { ...editingWeight, grams: editingWeight.grams?.toString() ?? "" } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingWeight(null) }}
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
