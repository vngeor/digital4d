"use client"

import { useState } from "react"
import { Trash2, Eye, EyeOff, X, ChevronDown } from "lucide-react"

interface BulkActionBarProps {
  selectedCount: number
  selectedLabel: string
  onDelete?: () => void
  onPublish?: () => void
  onUnpublish?: () => void
  onSetStatus?: (status: string) => void
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
  onSetStatus,
  onClear,
  deleteLabel = "Delete",
  publishLabel = "Publish",
  unpublishLabel = "Unpublish",
}: BulkActionBarProps) {
  const [statusValue, setStatusValue] = useState("")

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 animate-fade-in-up">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 sm:px-5 rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl">
        <span className="text-sm font-medium text-white whitespace-nowrap">
          {selectedLabel}
        </span>

        <div className="w-px h-6 bg-white/10 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-2">
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
          {onSetStatus && (
            <div className="relative">
              <select
                value={statusValue}
                onChange={(e) => {
                  if (!e.target.value) return
                  onSetStatus(e.target.value)
                  setStatusValue("")
                }}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:border-emerald-500/50 touch-manipulation"
              >
                <option value="">Set Status…</option>
                <option value="in_stock">✅ In Stock</option>
                <option value="out_of_stock">⏸️ Out of Stock</option>
                <option value="coming_soon">🔜 Coming Soon</option>
                <option value="pre_order">📦 Pre-Order</option>
                <option value="sold_out">🚫 Sold Out</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
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
