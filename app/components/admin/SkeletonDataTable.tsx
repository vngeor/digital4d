"use client"

interface SkeletonDataTableProps {
  columns?: number
  rows?: number
  showSearch?: boolean
}

const ROW_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3", "w-3/5"]

export function SkeletonDataTable({
  columns = 4,
  rows = 6,
  showSearch = true,
}: SkeletonDataTableProps) {
  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden animate-pulse">
      {/* Search bar skeleton */}
      {showSearch && (
        <div className="p-4 border-b border-white/10">
          <div className="h-10 bg-white/5 rounded-xl" />
        </div>
      )}

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-white/10">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-3 py-3 sm:px-6 sm:py-4 text-left">
                  <div className="h-4 bg-white/10 rounded w-20" />
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows */}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/5">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-3 py-3 sm:px-6 sm:py-4">
                    <div
                      className={`h-4 bg-white/5 rounded ${
                        ROW_WIDTHS[(rowIdx + colIdx) % ROW_WIDTHS.length]
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="p-3 sm:p-4 border-t border-white/10 flex items-center justify-between">
        <div className="h-4 bg-white/5 rounded w-24 hidden sm:block" />
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <div className="w-9 h-9 bg-white/5 rounded-lg" />
          <div className="h-4 bg-white/5 rounded w-12" />
          <div className="w-9 h-9 bg-white/5 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
