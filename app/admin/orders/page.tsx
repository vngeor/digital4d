"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  Save,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
} from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"
import { useAdminPermissions } from "@/app/components/admin/AdminPermissionsContext"

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  phone: string | null
  description: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  notes: string | null
  userId: string | null
  user: { id: string; name: string | null; email: string | null; image: string | null } | null
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  PENDING: { icon: Clock, color: "amber", labelKey: "statusPending" },
  IN_PROGRESS: { icon: PlayCircle, color: "cyan", labelKey: "statusInProgress" },
  COMPLETED: { icon: CheckCircle, color: "emerald", labelKey: "statusCompleted" },
  CANCELLED: { icon: XCircle, color: "red", labelKey: "statusCancelled" },
}

export default function OrdersPage() {
  const t = useTranslations("admin.orders")
  const { can } = useAdminPermissions()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    const params = filter !== "all" ? `?status=${filter}` : ""
    const res = await fetch(`/api/admin/orders${params}`)
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      id: editingOrder?.id,
      customerName: formData.get("customerName") as string,
      customerEmail: formData.get("customerEmail") as string,
      phone: formData.get("phone") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string,
    }

    const method = editingOrder ? "PUT" : "POST"
    await fetch("/api/admin/orders", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setShowForm(false)
    setEditingOrder(null)
    toast.success(t("savedSuccess"))
    fetchOrders()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/orders?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "An error occurred" }))
      toast.error(err.error || t("deleteFailed"))
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchOrders()
  }

  const handleStatusChange = async (order: Order, newStatus: string) => {
    await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, status: newStatus }),
    })
    fetchOrders()
  }

  const columns = [
    {
      key: "orderNumber",
      header: "#",
      className: "whitespace-nowrap w-[80px] sm:w-[100px] lg:w-[130px]",
      render: (item: Order) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(item.orderNumber)
            toast.success(t("copied"))
          }}
          className="font-mono text-sm text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-all"
          title={t("clickToCopy")}
        >
          {item.orderNumber}
        </button>
      ),
    },
    {
      key: "customerName",
      header: t("customer"),
      className: "min-w-[120px] sm:min-w-[150px]",
      render: (item: Order) => (
        <div>
          <p className="font-medium text-white">{item.customerName}</p>
          <p className="text-xs text-gray-500">{item.customerEmail}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: t("description"),
      className: "min-w-[200px] max-w-[300px] hidden md:table-cell",
      render: (item: Order) => (
        <p className="text-gray-300 truncate max-w-xs">{item.description}</p>
      ),
    },
    {
      key: "status",
      header: t("status"),
      className: "whitespace-nowrap w-[120px]",
      render: (item: Order) => {
        const config = statusConfig[item.status]
        const Icon = config.icon
        return (
          <select
            value={item.status}
            onChange={(e) => handleStatusChange(item, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`px-3 py-1 rounded-full text-xs font-medium bg-${config.color}-500/20 text-${config.color}-400 border-none focus:outline-none cursor-pointer appearance-none`}
            style={{
              backgroundColor: `rgba(var(--${config.color}-500), 0.2)`,
            }}
          >
            <option value="PENDING">{t("statusPending")}</option>
            <option value="IN_PROGRESS">{t("statusInProgress")}</option>
            <option value="COMPLETED">{t("statusCompleted")}</option>
            <option value="CANCELLED">{t("statusCancelled")}</option>
          </select>
        )
      },
    },
    {
      key: "createdAt",
      header: t("date"),
      className: "whitespace-nowrap w-[90px] hidden lg:table-cell",
      render: (item: Order) => (
        <span className="text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-[80px]",
      render: (item: Order) => (
        <div className="flex items-center gap-2">
          {can("orders", "edit") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingOrder(item)
                setShowForm(true)
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {can("orders", "delete") && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.orderNumber)
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

  const statusFilters = ["all", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">{t("subtitle")}</p>
        </div>
        {can("orders", "create") && (
          <button
            onClick={() => {
              setEditingOrder(null)
              setShowForm(true)
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" />
            {t("addOrder")}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === status
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {status === "all" ? t("all") : t(statusConfig[status as keyof typeof statusConfig]?.labelKey || status)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noOrders")}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong bg-[#0f0f0f] rounded-2xl border border-white/10 w-full max-w-[95vw] md:max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editingOrder ? t("editOrder") : t("addOrder")}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingOrder(null)
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("customerName")}
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    defaultValue={editingOrder?.customerName || ""}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("customerEmail")}
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    defaultValue={editingOrder?.customerEmail || ""}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("phone")}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingOrder?.phone || ""}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t("status")}
                  </label>
                  <select
                    name="status"
                    defaultValue={editingOrder?.status || "PENDING"}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="PENDING">{t("statusPending")}</option>
                    <option value="IN_PROGRESS">{t("statusInProgress")}</option>
                    <option value="COMPLETED">{t("statusCompleted")}</option>
                    <option value="CANCELLED">{t("statusCancelled")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("description")}
                </label>
                <textarea
                  name="description"
                  defaultValue={editingOrder?.description || ""}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t("notes")}
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingOrder?.notes || ""}
                  rows={2}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingOrder(null)
                  }}
                  className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
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
