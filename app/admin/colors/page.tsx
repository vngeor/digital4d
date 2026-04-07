"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Package } from "lucide-react"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { SortableDataTable } from "@/app/components/admin/SortableDataTable"
import { ColorForm } from "@/app/components/admin/ColorForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface Color {
  id: string
  nameBg: string
  nameEn: string
  nameEs: string
  hex: string
  hex2?: string | null
  order: number
  _count: { variants: number }
}

export default function ColorsPage() {
  const t = useTranslations("admin.colors")
  const { can } = useAdminPermissions()
  const [colors, setColors] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingColor, setEditingColor] = useState<Color | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  const fetchColors = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/colors")
    const data = await res.json()
    setColors(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchColors() }, [])

  const handleSubmit = async (data: { id?: string; nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null; order: number }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/colors", {
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
    setEditingColor(null)
    toast.success(t("savedSuccess"))
    fetchColors()
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/colors?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchColors()
  }

  const handleReorder = async (items: Color[]) => {
    setColors(items)
    await fetch("/api/admin/colors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((item, i) => ({ id: item.id, order: i })) }),
    })
  }

  const columns = [
    {
      key: "color",
      header: t("color"),
      render: (item: Color) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border border-white/20 shrink-0"
            style={item.hex2
              ? { background: `linear-gradient(135deg, ${item.hex} 50%, ${item.hex2} 50%)` }
              : { backgroundColor: item.hex }}
          />
          <div className="min-w-0">
            <p className="font-medium text-white text-sm">{item.nameEn}</p>
            <p className="text-xs text-gray-500">{item.nameBg} · {item.nameEs}</p>
          </div>
        </div>
      ),
    },
    {
      key: "hex",
      header: t("hex"),
      className: "hidden sm:table-cell",
      render: (item: Color) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-cyan-400">{item.hex}</span>
          {item.hex2 && (
            <span className="font-mono text-sm text-cyan-400/60">+ {item.hex2}</span>
          )}
        </div>
      ),
    },
    {
      key: "variants",
      header: t("variantCount"),
      className: "hidden sm:table-cell",
      render: (item: Color) => (
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <Package className="w-3.5 h-3.5" />
          {item._count.variants}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Color) => (
        <div className="flex items-center gap-2">
          {can("products", "edit") && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingColor(item); setShowForm(true) }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={t("edit")}
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("products", "edit") && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem({ id: item.id, name: item.nameEn }) }}
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
            onClick={() => { setEditingColor(null); setShowForm(true) }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm sm:text-base text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("addColor")}
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={3} />
      ) : (
        <SortableDataTable
          data={colors}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-400">{t("noColors")}</p>
              <p className="text-xs text-gray-600">{t("noColorsHint")}</p>
            </div>
          }
          onReorder={handleReorder}
          onRowClick={(item) => { setEditingColor(item); setShowForm(true) }}
          renderMobileCard={(item: Color) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full border border-white/20 shrink-0"
                    style={item.hex2
                      ? { background: `linear-gradient(135deg, ${item.hex} 50%, ${item.hex2} 50%)` }
                      : { backgroundColor: item.hex }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">{item.nameEn}</p>
                    <p className="text-xs text-gray-500 truncate">{item.nameBg} · {item.nameEs}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Package className="w-3 h-3" />
                  {item._count.variants}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-cyan-400">{item.hex}</span>
                  {item.hex2 && (
                    <span className="font-mono text-sm text-cyan-400/60">+ {item.hex2}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {can("products", "edit") && (
                    <button onClick={() => { setEditingColor(item); setShowForm(true) }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {can("products", "edit") && (
                    <button onClick={() => setDeleteItem({ id: item.id, name: item.nameEn })} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        />
      )}

      {showForm && (
        <ColorForm
          initialData={editingColor ? { ...editingColor } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingColor(null) }}
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
