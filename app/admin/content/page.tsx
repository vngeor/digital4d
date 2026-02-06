"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react"
import { SortableDataTable } from "@/app/components/admin/SortableDataTable"
import { ContentForm } from "@/app/components/admin/ContentForm"
import { COLOR_CLASSES } from "@/app/components/admin/TypeForm"

interface ContentType {
  id: string
  slug: string
  color: string
}

interface Content {
  id: string
  type: string
  slug: string | null
  titleBg: string
  titleEn: string
  titleEs: string
  bodyBg: string | null
  bodyEn: string | null
  bodyEs: string | null
  image: string | null
  published: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export default function ContentPage() {
  const t = useTranslations("admin.content")
  const [content, setContent] = useState<Content[]>([])
  const [allTypes, setAllTypes] = useState<string[]>([])
  const [typeColors, setTypeColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingContent, setEditingContent] = useState<Content | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const fetchAllTypes = async () => {
    // Fetch content types from the types API to get colors
    const typesRes = await fetch("/api/admin/types")
    const typesData = await typesRes.json()
    if (Array.isArray(typesData)) {
      const colorMap: Record<string, string> = {}
      typesData.forEach((t: ContentType) => {
        colorMap[t.slug] = t.color
      })
      setTypeColors(colorMap)
    }

    const res = await fetch("/api/admin/content")
    const data = await res.json()
    if (Array.isArray(data)) {
      const types = [...new Set(data.map((item: Content) => item.type))] as string[]
      setAllTypes(types.sort())
    }
  }

  const fetchContent = async () => {
    setLoading(true)
    const params = filter !== "all" ? `?type=${filter}` : ""
    const res = await fetch(`/api/admin/content${params}`)
    const data = await res.json()
    setContent(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAllTypes()
  }, [])

  useEffect(() => {
    fetchContent()
  }, [filter])

  const handleSubmit = async (data: {
    id?: string
    type: string
    titleBg: string
    titleEn: string
    titleEs: string
    bodyBg: string
    bodyEn: string
    bodyEs: string
    image: string
    published: boolean
    order: number
  }) => {
    const method = data.id ? "PUT" : "POST"
    await fetch("/api/admin/content", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setShowForm(false)
    setEditingContent(null)
    fetchContent()
    fetchAllTypes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" })
    fetchContent()
    fetchAllTypes()
  }

  const handleTogglePublish = async (item: Content) => {
    await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, published: !item.published }),
    })
    fetchContent()
  }

  const handleReorder = async (items: Content[]) => {
    setContent(items)
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item, index) => ({ id: item.id, order: index })),
      }),
    })
  }

  // Default colors for built-in types (used when not defined in ContentType table)
  const defaultTypeColors: Record<string, string> = {
    news: "cyan",
    service: "purple",
  }

  const getTypeColorClass = (type: string) => {
    const color = typeColors[type] || defaultTypeColors[type]
    return COLOR_CLASSES[color] || "bg-gray-500/20 text-gray-400"
  }

  const columns = [
    {
      key: "type",
      header: t("type"),
      render: (item: Content) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColorClass(item.type)}`}
        >
          {item.type}
        </span>
      ),
    },
    {
      key: "titleEn",
      header: t("title"),
      render: (item: Content) => (
        <div>
          <p className="font-medium text-white">{item.titleEn}</p>
          <p className="text-xs text-gray-500">{item.titleBg}</p>
        </div>
      ),
    },
    {
      key: "slug",
      header: t("slug"),
      render: (item: Content) => {
        if (!item.slug) {
          return <span className="text-gray-500 text-sm">—</span>
        }
        // Determine the URL based on content type
        const getUrl = () => {
          if (item.type === "news") return `/news/${item.slug}`
          if (item.type === "service") return `/services/${item.slug}`
          return `/${item.slug}`
        }
        return (
          <a
            href={getUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors"
          >
            <LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-emerald-400" />
            <span className="font-mono text-sm text-cyan-400 group-hover:text-cyan-300">/{item.slug}</span>
            <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      },
    },
    {
      key: "published",
      header: t("status"),
      render: (item: Content) => (
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
      render: (item: Content) => (
        <span className="text-gray-400">{item.order}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (item: Content) => (
        <div className="flex items-center gap-2">
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingContent(item)
              setShowForm(true)
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id)
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
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
            setEditingContent(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t("addContent")}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {t("all")}
        </button>
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              filter === type
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <SortableDataTable
          data={content}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noContent")}
          onReorder={handleReorder}
        />
      )}

      {showForm && (
        <ContentForm
          initialData={editingContent || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingContent(null)
          }}
        />
      )}
    </div>
  )
}
