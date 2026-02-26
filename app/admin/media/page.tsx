"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  ImageIcon,
  Search,
  Upload,
  Grid3X3,
  List,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Pencil,
  Trash2,
  ShieldOff,
  Loader2,
  ExternalLink,
  FileImage,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
} from "lucide-react"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { BulkActionBar } from "@/app/components/admin/BulkActionBar"
import { toast } from "sonner"

interface MediaUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface MediaFile {
  id: string
  url: string
  filename: string
  altBg: string | null
  altEn: string | null
  altEs: string | null
  mimeType: string
  size: number
  width: number | null
  height: number | null
  uploadedById: string | null
  uploadedBy: MediaUser | null
  createdAt: string
  updatedAt: string
}

interface MediaResponse {
  files: MediaFile[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UsageItem {
  type: string
  id: string
  name: string
}

const MIME_TYPES = [
  { value: "image/webp", label: "WebP" },
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/gif", label: "GIF" },
]

const SOURCE_FILTERS = [
  { value: "products", labelKey: "sourceProducts" },
  { value: "banners", labelKey: "sourceBanners" },
  { value: "content", labelKey: "sourceNews" },
  { value: "categories", labelKey: "sourceCategories" },
  { value: "unused", labelKey: "sourceUnused" },
]

type SortField = "filename" | "mimeType" | "size" | "createdAt"
type SortDir = "asc" | "desc"

const RESOURCE_PAGES: Record<string, string> = {
  products: "/admin/products",
  content: "/admin/content",
  banners: "/admin/banners",
  categories: "/admin/products", // categories are managed from products page
}

export default function MediaGalleryPage() {
  const t = useTranslations("admin.media")
  const tAdmin = useTranslations("admin")
  const tb = useTranslations("admin.bulk")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can } = useAdminPermissions()

  // State
  const [data, setData] = useState<MediaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [sortBy, setSortBy] = useState<SortField>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit modal state
  const [editingMedia, setEditingMedia] = useState<MediaFile | null>(null)
  const [editAltBg, setEditAltBg] = useState("")
  const [editAltEn, setEditAltEn] = useState("")
  const [editAltEs, setEditAltEs] = useState("")
  const [activeTab, setActiveTab] = useState<"bg" | "en" | "es">("en")
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState<UsageItem[] | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)

  // Duplicate warning state
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<MediaFile[]>([])

  // Delete state
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<{ message: string; usedBy?: UsageItem[] } | null>(null)

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", "30")
      if (search) params.set("search", search)
      if (typeFilter) params.set("type", typeFilter)
      if (sourceFilter) params.set("source", sourceFilter)
      params.set("sortBy", sortBy)
      params.set("sortDir", sortDir)

      const res = await fetch(`/api/admin/media?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Ignore
    }
    setLoading(false)
  }, [page, search, typeFilter, sourceFilter, sortBy, sortDir])

  useEffect(() => {
    fetchMedia()
  }, [page, typeFilter, sourceFilter, sortBy, sortDir])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchMedia()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Deep linking: ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (editId && data && data.files.length > 0 && !editingMedia) {
      const item = data.files.find((f) => f.id === editId)
      if (item) {
        openEditModal(item)
        window.history.replaceState({}, "", "/admin/media")
      }
    }
  }, [searchParams, data])

  const openEditModal = (media: MediaFile) => {
    setEditingMedia(media)
    setEditAltBg(media.altBg || "")
    setEditAltEn(media.altEn || "")
    setEditAltEs(media.altEs || "")
    setUsage(null)
    setDeleteError(null)
    // Fetch usage info
    fetchUsage(media.url)
  }

  const fetchUsage = async (url: string) => {
    setLoadingUsage(true)
    try {
      const res = await fetch(`/api/admin/media?checkUsage=${encodeURIComponent(url)}`)
      if (res.ok) {
        const json = await res.json()
        setUsage(json.usedBy || [])
      } else {
        setUsage([])
      }
    } catch {
      setUsage([])
    }
    setLoadingUsage(false)
  }

  const handleSaveAlt = async () => {
    if (!editingMedia) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMedia.id,
          altBg: editAltBg,
          altEn: editAltEn,
          altEs: editAltEs,
        }),
      })
      if (res.ok) {
        toast.success(t("savedSuccess"))
        setEditingMedia(null)
        fetchMedia()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error saving")
      }
    } catch {
      toast.error("Error saving")
    }
    setSaving(false)
  }

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success(t("urlCopied"))
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      const res = await fetch(`/api/admin/media?id=${deleteItem.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(t("deletedSuccess"))
        setDeleteItem(null)
        setEditingMedia(null)
        fetchMedia()
      } else {
        const err = await res.json()
        if (res.status === 409) {
          setDeleteError({ message: t("mediaInUse"), usedBy: err.usedBy })
          setDeleteItem(null)
        } else {
          toast.error(err.error || "Error deleting")
        }
      }
    } catch {
      toast.error("Error deleting")
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.deleted > 0) {
          toast.success(t("bulkDeleteSuccess", { count: result.deleted }))
        }
        if (result.skipped > 0) {
          toast.warning(t("bulkSkipped", { count: result.skipped }))
        }
        setSelectedIds(new Set())
        setBulkDeleteConfirm(false)
        fetchMedia()
      }
    } catch {
      toast.error("Error deleting")
    }
  }

  // Upload handlers — check for duplicates before uploading
  const checkAndUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // Check for existing files with same names
    const filenames = Array.from(files).map((f) => f.name)
    try {
      const duplicates: MediaFile[] = []
      for (const name of filenames) {
        const res = await fetch(`/api/admin/media?search=${encodeURIComponent(name)}&limit=5`)
        if (res.ok) {
          const json = await res.json()
          const matches = (json.files || []).filter(
            (f: MediaFile) => f.filename.toLowerCase() === name.toLowerCase()
          )
          duplicates.push(...matches)
        }
      }

      if (duplicates.length > 0) {
        // Show warning with existing files
        setDuplicateWarnings(duplicates)
        setPendingFiles(files)
        return
      }
    } catch {
      // If check fails, proceed with upload anyway
    }

    // No duplicates — proceed directly
    await performUpload(files)
  }

  const performUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setDuplicateWarnings([])
    setPendingFiles(null)

    let successCount = 0
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const result = await res.json()
          successCount++
          if (files.length === 1) {
            toast.success(t("uploadSuccess") + ` (${result.savings} smaller)`)
          }
        } else {
          const err = await res.json()
          toast.error(`${file.name}: ${err.error}`)
        }
      } catch {
        toast.error(`${file.name}: Upload failed`)
      }
    }

    if (files.length > 1 && successCount > 0) {
      toast.success(t("uploadSuccess") + ` (${successCount} files)`)
    }

    setUploading(false)
    setShowUpload(false)
    fetchMedia()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    checkAndUpload(e.dataTransfer.files)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selectedIds.size === data.files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.files.map((f) => f.id)))
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir(field === "filename" ? "asc" : "desc")
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-emerald-400" />
      : <ArrowDown className="w-3 h-3 text-emerald-400" />
  }

  const clearFilters = () => {
    setSearch("")
    setTypeFilter("")
    setSourceFilter("")
    setSortBy("createdAt")
    setSortDir("desc")
    setPage(1)
  }

  const hasFilters = search || typeFilter || sourceFilter

  // No permission view
  if (!can("media", "view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">{tAdmin("noPermission")}</h2>
          <p className="text-sm text-gray-400 mt-1">{tAdmin("noPermissionDesc")}</p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white transition-colors"
        >
          {tAdmin("backToDashboard")}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-emerald-400" />
            {t("title")}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-sm text-gray-400">
              {t("totalFiles", { count: data.total })}
            </span>
          )}
          {can("media", "create") && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" />
              {t("upload")}
            </button>
          )}
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">{t("allTypes")}</option>
              {MIME_TYPES.map((mt) => (
                <option key={mt.value} value={mt.value}>{mt.label}</option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">{t("allSources")}</option>
              {SOURCE_FILTERS.map((sf) => (
                <option key={sf.value} value={sf.value}>{t(sf.labelKey)}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              title={t("gridView")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              title={t("listView")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}
          </div>
        ) : !data || data.files.length === 0 ? (
          <div className="py-16 text-center">
            <FileImage className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">{t("noMedia")}</p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="p-4">
            {/* Select all for grid */}
            {can("media", "delete") && (
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === data.files.length && data.files.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  {t("selectAll")}
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {data.files.map((file) => (
                <div
                  key={file.id}
                  className={`group relative glass-strong rounded-xl overflow-hidden border transition-all cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5 ${
                    selectedIds.has(file.id)
                      ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* Checkbox */}
                  {can("media", "delete") && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelect(file.id)
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500/50"
                      />
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-emerald-400 font-medium border border-white/10">
                      {file.mimeType.split("/")[1]?.toUpperCase()}
                    </span>
                  </div>

                  {/* Image */}
                  <div
                    className="aspect-square relative bg-black/20"
                    onClick={() => openEditModal(file)}
                  >
                    <img
                      src={file.url}
                      alt={file.altEn || file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyUrl(file.url, file.id)
                        }}
                        className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
                        title={t("copyUrl")}
                      >
                        {copiedId === file.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      {can("media", "edit") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(file)
                          }}
                          className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
                          title={t("editMedia")}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {can("media", "delete") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteItem({ id: file.id, name: file.filename })
                          }}
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors backdrop-blur-sm"
                          title={t("delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 border-t border-white/5">
                    <p className="text-sm text-white truncate font-medium">{file.filename}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                      {file.width && file.height && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="text-xs text-gray-400">{file.width}×{file.height}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {can("media", "delete") && (
                      <th className="px-4 py-3 w-[40px]">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === data.files.length && data.files.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("preview")}</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("filename")}
                    >
                      <span className="flex items-center gap-1">
                        {t("filename")}
                        <SortIcon field="filename" />
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("mimeType")}
                    >
                      <span className="flex items-center gap-1">
                        {t("mimeType")}
                        <SortIcon field="mimeType" />
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("size")}
                    >
                      <span className="flex items-center gap-1">
                        {t("size")}
                        <SortIcon field="size" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("dimensions")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("uploadedBy")}</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      <span className="flex items-center gap-1">
                        {t("uploadedAt")}
                        <SortIcon field="createdAt" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openEditModal(file)}
                    >
                      {can("media", "delete") && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(file.id)}
                            onChange={() => toggleSelect(file.id)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <img
                          src={file.url}
                          alt={file.altEn || file.filename}
                          className="w-10 h-10 rounded-lg object-cover"
                          loading="lazy"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white truncate max-w-[200px] block">{file.filename}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                          {file.mimeType.split("/")[1]?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatSize(file.size)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {file.width && file.height ? `${file.width}x${file.height}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {file.uploadedBy && (
                          <span className="text-sm text-gray-400">{file.uploadedBy.name || file.uploadedBy.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{formatDate(file.createdAt)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyUrl(file.url, file.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title={t("copyUrl")}
                          >
                            {copiedId === file.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          {can("media", "edit") && (
                            <button
                              onClick={() => openEditModal(file)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title={t("editMedia")}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {can("media", "delete") && (
                            <button
                              onClick={() => setDeleteItem({ id: file.id, name: file.filename })}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                              title={t("delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-sm text-gray-400">
              {t("pageInfo", { page: data.page, total: data.totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && can("media", "delete") && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedLabel={tb("selected", { count: selectedIds.size })}
          onDelete={() => setBulkDeleteConfirm(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !uploading && setShowUpload(false)}>
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{t("upload")}</h3>
              <button onClick={() => !uploading && setShowUpload(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-white/20 hover:border-white/40 hover:bg-white/5"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-sm text-gray-400">{t("uploading")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-gray-500" />
                    <div>
                      <p className="text-sm text-white font-medium">{t("dragDropHint")}</p>
                      <p className="text-xs text-gray-500 mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => checkAndUpload(e.target.files)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit / Detail Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingMedia(null)}>
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{t("viewDetails")}</h3>
              <button onClick={() => setEditingMedia(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Image preview */}
              <div className="bg-black/40 rounded-xl p-2 flex items-center justify-center">
                <img
                  src={editingMedia.url}
                  alt={editingMedia.altEn || editingMedia.filename}
                  className="max-h-[300px] rounded-lg object-contain"
                />
              </div>

              {/* File info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">{t("filename")}</span>
                  <p className="text-white truncate">{editingMedia.filename}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t("mimeType")}</span>
                  <p className="text-white">{editingMedia.mimeType}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t("size")}</span>
                  <p className="text-white">{formatSize(editingMedia.size)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t("dimensions")}</span>
                  <p className="text-white">
                    {editingMedia.width && editingMedia.height
                      ? `${editingMedia.width} x ${editingMedia.height}px`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t("uploadedBy")}</span>
                  <p className="text-white">{editingMedia.uploadedBy?.name || editingMedia.uploadedBy?.email || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t("uploadedAt")}</span>
                  <p className="text-white">{formatDate(editingMedia.createdAt)}</p>
                </div>
              </div>

              {/* URL with copy */}
              <div>
                <span className="text-gray-500 text-xs">URL</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-black/40 rounded-lg px-3 py-2 text-cyan-400 truncate">
                    {editingMedia.url}
                  </code>
                  <button
                    onClick={() => handleCopyUrl(editingMedia.url, editingMedia.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copiedId === editingMedia.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Alt text editing */}
              {can("media", "edit") && (
                <div>
                  <span className="text-gray-500 text-xs block mb-2">{t("altText")}</span>
                  {/* Language tabs */}
                  <div className="flex gap-1 mb-3">
                    {(["en", "bg", "es"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveTab(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          activeTab === lang
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-gray-400 hover:text-white"
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {activeTab === "en" && (
                    <input
                      type="text"
                      value={editAltEn}
                      onChange={(e) => setEditAltEn(e.target.value)}
                      placeholder="Alt text (English)"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  )}
                  {activeTab === "bg" && (
                    <input
                      type="text"
                      value={editAltBg}
                      onChange={(e) => setEditAltBg(e.target.value)}
                      placeholder="Alt text (Bulgarian)"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  )}
                  {activeTab === "es" && (
                    <input
                      type="text"
                      value={editAltEs}
                      onChange={(e) => setEditAltEs(e.target.value)}
                      placeholder="Alt text (Spanish)"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  )}
                </div>
              )}

              {/* Usage info */}
              {loadingUsage ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("checkingUsage")}
                </div>
              ) : usage !== null && (
                <div>
                  <span className="text-gray-500 text-xs flex items-center gap-1 mb-2">
                    <Info className="w-3 h-3" />
                    {t("usage")}
                  </span>
                  {usage.length === 0 ? (
                    <p className="text-xs text-gray-500">{t("noUsage")}</p>
                  ) : (
                    <div className="space-y-1">
                      {usage.map((u, i) => (
                        <Link
                          key={i}
                          href={`${RESOURCE_PAGES[u.type]}?edit=${u.id}`}
                          className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {u.type}: {u.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Delete error (in-use warning) */}
              {deleteError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-sm text-red-400 font-medium">{deleteError.message}</p>
                  {deleteError.usedBy && deleteError.usedBy.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {deleteError.usedBy.map((u, i) => (
                        <Link
                          key={i}
                          href={`${RESOURCE_PAGES[u.type]}?edit=${u.id}`}
                          className="flex items-center gap-2 text-xs text-red-300 hover:text-red-200 transition-colors"
                          onClick={() => setEditingMedia(null)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {u.type}: {u.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div>
                {can("media", "delete") && (
                  <button
                    onClick={() => setDeleteItem({ id: editingMedia.id, name: editingMedia.filename })}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("delete")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm transition-colors"
                >
                  {t("close")}
                </button>
                {can("media", "edit") && (
                  <button
                    onClick={handleSaveAlt}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t("saveAltText")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { name: deleteItem?.name ?? "" })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        title={t("confirmDeleteTitle")}
        message={t("confirmBulkDelete", { count: selectedIds.size })}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Duplicate Warning Modal */}
      {duplicateWarnings.length > 0 && pendingFiles && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setDuplicateWarnings([]); setPendingFiles(null) }}>
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <Info className="w-5 h-5" />
                {t("duplicateWarningTitle")}
              </h3>
              <button onClick={() => { setDuplicateWarnings([]); setPendingFiles(null) }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-300">{t("duplicateWarningMessage")}</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {duplicateWarnings.map((dup) => (
                  <div key={dup.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                    <img
                      src={dup.url}
                      alt={dup.filename}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{dup.filename}</p>
                      <p className="text-xs text-gray-500">{formatSize(dup.size)} &middot; {formatDate(dup.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => { setDuplicateWarnings([]); setPendingFiles(null) }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => performUpload(pendingFiles)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all"
              >
                {t("uploadAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
