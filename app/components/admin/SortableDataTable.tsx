"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Search, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface SortableDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
  onRowClick?: (item: T) => void
  onReorder?: (items: T[]) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function SortableRow<T extends { id: string }>({
  item,
  columns,
  onRowClick,
  getValue,
  selectable,
  isSelected,
  onToggle,
}: {
  item: T
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  getValue: (item: T, key: string) => unknown
  selectable?: boolean
  isSelected?: boolean
  onToggle?: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
        onRowClick ? "cursor-pointer" : ""
      } ${isDragging ? "bg-white/10" : ""} ${isSelected ? "bg-emerald-500/5" : ""}`}
    >
      {/* Drag Handle */}
      <td className="px-1.5 py-3 sm:px-2 sm:py-4 w-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </button>
      </td>
      {selectable && (
        <td className="px-1.5 py-3 sm:px-2 sm:py-4 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle?.(item.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
          />
        </td>
      )}
      {columns.map((column) => (
        <td
          key={`${item.id}-${String(column.key)}`}
          onClick={() => onRowClick?.(item)}
          className={`px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-300 ${column.className || ""}`}
        >
          {column.render
            ? column.render(item)
            : String(getValue(item, String(column.key)) ?? "")}
        </td>
      ))}
    </tr>
  )
}

export function SortableDataTable<T extends { id: string; order: number }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 50, // Higher default for sortable tables
  emptyMessage = "No data found",
  onRowClick,
  onReorder,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: SortableDataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState(data)

  // Update items when data changes
  if (JSON.stringify(data.map(d => d.id)) !== JSON.stringify(items.map(i => i.id))) {
    setItems(data)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredData = searchable
    ? items.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      )
    : items

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      // Update order numbers
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        order: index,
      }))

      setItems(reorderedItems)
      onReorder?.(reorderedItems)
    }
  }

  const isSelectedFn = (id: string) => selectedIds?.has(id) ?? false
  const allPageSelected = paginatedData.length > 0 && paginatedData.every((item) => isSelectedFn(item.id))
  const somePageSelected = paginatedData.some((item) => isSelectedFn(item.id))

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

  // +1 for drag handle, +1 for checkbox if selectable
  const colCount = columns.length + 1 + (selectable ? 1 : 0)

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
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
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <GripVertical className="w-4 h-4" />
            <span>Drag to reorder</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-1.5 py-3 sm:px-2 sm:py-4 w-10"></th>
                {selectable && (
                  <th className="px-1.5 py-3 sm:px-2 sm:py-4 w-10">
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
                    className={`px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-medium text-gray-400 ${
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
                <SortableContext
                  items={paginatedData.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {paginatedData.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      columns={columns}
                      onRowClick={onRowClick}
                      getValue={getValue}
                      selectable={selectable}
                      isSelected={isSelectedFn(item.id)}
                      onToggle={toggleOne}
                    />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-400 hidden sm:block">
            {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} / {filteredData.length}
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
