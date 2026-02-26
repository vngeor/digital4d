"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Eye, EyeOff, Link as LinkIcon, ExternalLink } from "lucide-react"
import { SkeletonDataTable } from "@/app/components/admin/SkeletonDataTable"
import { DataTable } from "@/app/components/admin/DataTable"
import { MenuItemForm } from "@/app/components/admin/MenuItemForm"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface MenuItem {
  id: string
  slug: string
  type: string
  titleBg: string
  titleEn: string
  titleEs: string
  bodyBg: string | null
  bodyEn: string | null
  bodyEs: string | null
  order: number
  published: boolean
  createdAt: string
  updatedAt: string
  _count: {
    contents: number
  }
}

export default function MenuPage() {
  const t = useTranslations("admin.menu")
  const { can } = useAdminPermissions()
  const searchParams = useSearchParams()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)

  const fetchMenuItems = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/menu")
    const data = await res.json()
    setMenuItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMenuItems()
  }, [])

  // Deep link: open edit form when ?edit=<id> is present
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (editId && menuItems.length > 0 && !showForm) {
      const item = menuItems.find(m => m.id === editId)
      if (item) {
        setEditingItem(item)
        setShowForm(true)
        window.history.replaceState({}, "", "/admin/menu")
      }
    }
  }, [searchParams, menuItems])

  const handleSubmit = async (data: {
    id?: string
    slug: string
    type: string
    titleBg: string
    titleEn: string
    titleEs: string
    bodyBg: string
    bodyEn: string
    bodyEs: string
    order: number
    published: boolean
  }) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/admin/menu", {
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
    setEditingItem(null)
    toast.success(t("savedSuccess"))
    fetchMenuItems()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/menu?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchMenuItems()
  }

  const handleTogglePublish = async (item: MenuItem) => {
    await fetch("/api/admin/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, published: !item.published }),
    })
    fetchMenuItems()
  }

  const columns = [
    {
      key: "slug",
      header: t("slug"),
      className: "min-w-[120px] hidden sm:table-cell",
      render: (item: MenuItem) => (
        <a
          href={`/${item.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors"
        >
          <LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-emerald-400" />
          <span className="font-mono text-sm text-cyan-400 group-hover:text-cyan-300">/{item.slug}</span>
          <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ),
    },
    {
      key: "titleEn",
      header: t("title"),
      className: "min-w-[180px]",
      render: (item: MenuItem) => (
        <div>
          <p className="font-medium text-white">{item.titleEn}</p>
          <p className="text-xs text-gray-500">{item.titleBg}</p>
        </div>
      ),
    },
    {
      key: "contents",
      header: t("linkedContent"),
      className: "whitespace-nowrap w-[100px] hidden md:table-cell",
      render: (item: MenuItem) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item._count.contents > 0
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-gray-500/20 text-gray-400"
        }`}>
          {item._count.contents} {t("items")}
        </span>
      ),
    },
    {
      key: "published",
      header: t("status"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: MenuItem) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            item.published
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {item.published ? t("published") : t("draft")}
        </span>
      ),
    },
    {
      key: "order",
      header: t("order"),
      className: "whitespace-nowrap w-[60px] hidden lg:table-cell",
      render: (item: MenuItem) => (
        <span className="text-gray-400">{item.order}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-[120px]",
      render: (item: MenuItem) => (
        <div className="flex items-center gap-2">
          {can("menu", "edit") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleTogglePublish(item)
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={item.published ? t("unpublish") : t("publish")}
            >
              {item.published ? (
                <EyeOff className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          {can("menu", "edit") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingItem(item)
                setShowForm(true)
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("menu", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.titleEn)
              }}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
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
          <p className="text-gray-400 mt-1 text-sm lg:text-base">{t("subtitle")}</p>
        </div>
        {can("menu", "create") && (
          <button
            onClick={() => {
              setEditingItem(null)
              setShowForm(true)
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm sm:text-base hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t("addMenuItem")}
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonDataTable columns={4} />
      ) : (
        <DataTable
          data={menuItems}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noMenuItems")}
        />
      )}

      {showForm && (
        <MenuItemForm
          initialData={editingItem || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingItem(null)
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
