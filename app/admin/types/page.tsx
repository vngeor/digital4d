"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Plus, Edit2, Trash2, Loader2, Tag } from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { TypeForm, COLOR_CLASSES } from "@/app/components/admin/TypeForm"

interface ContentType {
  id: string
  slug: string
  nameBg: string
  nameEn: string
  nameEs: string
  color: string
  order: number
  createdAt: string
  updatedAt: string
}

export default function TypesPage() {
  const t = useTranslations("admin.types")
  const [types, setTypes] = useState<ContentType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingType, setEditingType] = useState<ContentType | null>(null)

  const fetchTypes = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/types")
    const data = await res.json()
    setTypes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  const handleSubmit = async (data: {
    id?: string
    slug: string
    nameBg: string
    nameEn: string
    nameEs: string
    color: string
    order: number
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/types", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const error = await res.json()
      alert(error.error || "Failed to save type")
      return
    }

    setShowForm(false)
    setEditingType(null)
    fetchTypes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    await fetch(`/api/admin/types?id=${id}`, { method: "DELETE" })
    fetchTypes()
  }

  const columns = [
    {
      key: "slug",
      header: t("slug"),
      render: (item: ContentType) => (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-sm text-cyan-400">{item.slug}</span>
        </div>
      ),
    },
    {
      key: "nameEn",
      header: t("name"),
      render: (item: ContentType) => (
        <div>
          <p className="font-medium text-white">{item.nameEn}</p>
          <p className="text-xs text-gray-500">{item.nameBg}</p>
        </div>
      ),
    },
    {
      key: "color",
      header: t("color"),
      render: (item: ContentType) => (
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
      render: (item: ContentType) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingType(item)
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
        <button
          onClick={() => {
            setEditingType(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t("addType")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={types}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noTypes")}
        />
      )}

      {showForm && (
        <TypeForm
          initialData={editingType || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingType(null)
          }}
        />
      )}
    </div>
  )
}
