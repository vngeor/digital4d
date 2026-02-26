"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
  onRowClick?: (item: T) => void
  paginationText?: (from: number, to: number, total: number) => string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  renderMobileCard?: (item: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyMessage = "No data found",
  onRowClick,
  paginationText,
  selectable = false,
  selectedIds,
  onSelectionChange,
  renderMobileCard,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filteredData = searchable
    ? data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (page - 1) * pageSize
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize)

  const getValue = (item: T, key: string): unknown => {
    const keys = key.split(".")
    let value: unknown = item
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return undefined
      }
    }
    return value
  }

  const isSelected = (id: string) => selectedIds?.has(id) ?? false
  const allPageSelected = paginatedData.length > 0 && paginatedData.every((item) => isSelected(item.id))
  const somePageSelected = paginatedData.some((item) => isSelected(item.id))

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (allPageSelected) {
      paginatedData.forEach((item) => next.delete(item.id))
    } else {
      paginatedData.forEach((item) => next.add(item.id))
    }
    onSelectionChange(next)
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const colCount = selectable ? columns.length + 1 : columns.length

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>
      )}

      <div className={renderMobileCard ? "hidden lg:block overflow-x-auto" : "overflow-x-auto"}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {selectable && (
                <th className="px-3 py-3 sm:px-4 sm:py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-3 py-3 sm:px-4 sm:py-4 text-left text-sm font-medium text-gray-400 ${
                    column.className || ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-8 sm:px-6 sm:py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${isSelected(item.id) ? "bg-emerald-500/5" : ""}`}
                >
                  {selectable && (
                    <td className="px-3 py-3 sm:px-4 sm:py-4 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected(item.id)}
                        onChange={() => toggleOne(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={`${item.id}-${String(column.key)}`}
                      className={`px-3 py-3 sm:px-4 sm:py-4 text-sm text-gray-300 ${
                        column.className || ""
                      }`}
                    >
                      {column.render
                        ? column.render(item)
                        : String(getValue(item, String(column.key)) ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderMobileCard && (
        <div className="lg:hidden divide-y divide-white/5">
          {paginatedData.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            paginatedData.map((item) => (
              <div
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`p-4 space-y-2 overflow-hidden ${onRowClick ? "cursor-pointer" : ""} ${isSelected(item.id) ? "bg-emerald-500/5" : ""}`}
              >
                {selectable && (
                  <div className="flex items-center justify-end">
                    <input
                      type="checkbox"
                      checked={isSelected(item.id)}
                      onChange={() => toggleOne(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}
                {renderMobileCard(item)}
              </div>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-400 hidden sm:block">
            {paginationText
              ? paginationText(startIndex + 1, Math.min(startIndex + pageSize, filteredData.length), filteredData.length)
              : `${startIndex + 1}-${Math.min(startIndex + pageSize, filteredData.length)} / ${filteredData.length}`}
          </p>
          <div className="flex items-center gap-2 sm:ml-0 mx-auto sm:mx-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
