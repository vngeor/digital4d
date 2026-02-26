"use client"

import { Trash2, Eye, EyeOff, X } from "lucide-react"

interface BulkActionBarProps {
  selectedCount: number
  selectedLabel: string
  onDelete?: () => void
  onPublish?: () => void
  onUnpublish?: () => void
  onClear: () => void
  deleteLabel?: string
  publishLabel?: string
  unpublishLabel?: string
}

export function BulkActionBar({
  selectedCount,
  selectedLabel,
  onDelete,
  onPublish,
  onUnpublish,
  onClear,
  deleteLabel = "Delete",
  publishLabel = "Publish",
  unpublishLabel = "Unpublish",
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl">
        <span className="text-sm font-medium text-white whitespace-nowrap">
          {selectedLabel}
        </span>

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-2">
          {onPublish && (
            <button
              onClick={onPublish}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              {publishLabel}
            </button>
          )}
          {onUnpublish && (
            <button
              onClick={onUnpublish}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              {unpublishLabel}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteLabel}
            </button>
          )}
        </div>

        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
