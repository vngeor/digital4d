"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Trash2, Loader2, Shield, User as UserIcon, Eye, X, Package, Pencil, FileText, Save, Download, ChevronDown } from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"
import { ConfirmModal } from "@/app/components/admin/ConfirmModal"

interface User {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  image: string | null
  role: "USER" | "ADMIN"
  createdAt: string
  _count: {
    orders: number
  }
}

interface UserDetails {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  image: string | null
  role: "USER" | "ADMIN"
  country: string | null
  city: string | null
  address: string | null
  birthDate: string | null
  createdAt: string
  orders: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    phone: string | null
    status: string
    description: string
    notes: string | null
    createdAt: string
    updatedAt: string
  }>
  quoteRequests: Array<{
    id: string
    quoteNumber: string
    status: string
    message: string | null
    fileName: string | null
    fileUrl: string | null
    quotedPrice: string | null
    adminNotes: string | null
    userResponse: string | null
    quotedAt: string | null
    createdAt: string
    updatedAt: string
    product: { nameEn: string } | null
    messages: Array<{
      id: string
      senderType: string
      message: string
      quotedPrice: string | null
      createdAt: string
    }>
  }>
}

interface EditForm {
  name: string
  phone: string
  country: string
  city: string
  address: string
  birthDate: string
}

export default function UsersPage() {
  const t = useTranslations("admin.users")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string } | null>(null)
  const [viewingUser, setViewingUser] = useState<UserDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", country: "", city: "", address: "", birthDate: "" })
  const [saving, setSaving] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set())

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleQuote = (id: string) => {
    setExpandedQuotes(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUserDetails = async (id: string) => {
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/admin/users?id=${id}`)
      if (!res.ok) throw new Error("Failed to fetch user details")
      const data = await res.json()
      setViewingUser(data)
      setExpandedOrders(new Set())
      setExpandedQuotes(new Set())
    } catch {
      toast.error("Failed to load user details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const startEditing = (user: UserDetails) => {
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      country: user.country || "",
      city: user.city || "",
      address: user.address || "",
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split("T")[0] : "",
    })
    setEditing(true)
  }

  const handleSaveUser = async () => {
    if (!viewingUser) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingUser.id,
          name: editForm.name || null,
          phone: editForm.phone || null,
          country: editForm.country || null,
          city: editForm.city || null,
          address: editForm.address || null,
          birthDate: editForm.birthDate || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success(t("savedSuccess"))
      setEditing(false)
      // Refresh details
      await fetchUserDetails(viewingUser.id)
      fetchUsers()
    } catch {
      toast.error(t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (user: User, newRole: "USER" | "ADMIN") => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    })
    fetchUsers()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteItem({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/admin/users?id=${deleteItem.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error)
      setDeleteItem(null)
      return
    }
    setDeleteItem(null)
    toast.success(t("deletedSuccess"))
    fetchUsers()
  }

  const filteredUsers =
    filter === "all"
      ? users
      : users.filter((u) => u.role === filter)

  const columns = [
    {
      key: "user",
      header: t("user"),
      className: "min-w-[200px]",
      render: (item: User) => (
        <div className="flex items-center gap-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name || ""}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {item.name?.charAt(0) || item.email?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <p className="font-medium text-white">{item.name || "Anonymous"}</p>
            <p className="text-xs text-gray-500">{item.email}</p>
            {item.phone && <p className="text-xs text-gray-400">{item.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t("role"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: User) => (
        <select
          value={item.role}
          onChange={(e) =>
            handleRoleChange(item, e.target.value as "USER" | "ADMIN")
          }
          onClick={(e) => e.stopPropagation()}
          className={`px-3 py-1 rounded-full text-xs font-medium border-none focus:outline-none cursor-pointer ${
            item.role === "ADMIN"
              ? "bg-purple-500/20 text-purple-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      ),
    },
    {
      key: "orders",
      header: t("orders"),
      className: "whitespace-nowrap w-[80px]",
      render: (item: User) => (
        <span className="text-gray-400">{item._count.orders}</span>
      ),
    },
    {
      key: "createdAt",
      header: t("joined"),
      className: "whitespace-nowrap w-[100px]",
      render: (item: User) => (
        <span className="text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-[60px]",
      render: (item: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              fetchUserDetails(item.id)
            }}
            className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id, item.name || item.email || "this user")
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ),
    },
  ]

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    users: users.filter((u) => u.role === "USER").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">{t("totalUsers")}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.admins}</p>
              <p className="text-xs text-gray-400">{t("admins")}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.users}</p>
              <p className="text-xs text-gray-400">{t("regularUsers")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "ADMIN", "USER"].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === role
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {role === "all"
              ? t("all")
              : role === "ADMIN"
              ? t("admins")
              : t("regularUsers")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          data={filteredUsers}
          columns={columns}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noUsers")}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage", { name: deleteItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />

      {/* Loading overlay for fetching user details */}
      {loadingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      )}

      {/* User Details Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setViewingUser(null); setEditing(false) }}>
          <div className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                {viewingUser.image ? (
                  <img src={viewingUser.image} alt={viewingUser.name || ""} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {viewingUser.name?.charAt(0) || viewingUser.email?.charAt(0) || "U"}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white">{viewingUser.name || "Anonymous"}</h2>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    viewingUser.role === "ADMIN"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {viewingUser.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editing && (
                  <button onClick={() => startEditing(viewingUser)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <button onClick={() => { setViewingUser(null); setEditing(false) }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Personal Info */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t("personalInfo")}</h3>
                {editing && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(false)} className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                      {t("close")}
                    </button>
                    <button onClick={handleSaveUser} disabled={saving} className="px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 text-white disabled:opacity-50 flex items-center gap-1">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {t("save")}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">{t("name")}</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t("phone")}</label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t("country")}</label>
                    <input type="text" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t("city")}</label>
                    <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t("birthDate")}</label>
                    <input type="date" value={editForm.birthDate} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">{t("address")}</label>
                    <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t("email")}</p>
                    <p className="text-sm text-white">{viewingUser.email || t("notProvided")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("phone")}</p>
                    <p className="text-sm text-white">{viewingUser.phone || t("notProvided")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("country")}</p>
                    <p className="text-sm text-white">{viewingUser.country || t("notProvided")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("city")}</p>
                    <p className="text-sm text-white">{viewingUser.city || t("notProvided")}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">{t("address")}</p>
                    <p className="text-sm text-white">{viewingUser.address || t("notProvided")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("birthDate")}</p>
                    <p className="text-sm text-white">
                      {viewingUser.birthDate
                        ? new Date(viewingUser.birthDate).toLocaleDateString()
                        : t("notProvided")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("joined")}</p>
                    <p className="text-sm text-white">{new Date(viewingUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order History */}
            <div className="p-6 border-b border-white/10">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                {t("orderHistory")} ({viewingUser.orders.length})
              </h3>
              {viewingUser.orders.length === 0 ? (
                <div className="text-center py-4">
                  <Package className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t("noOrders")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {viewingUser.orders.map((order) => (
                    <div key={order.id} className="glass rounded-lg border border-white/5 overflow-hidden">
                      <button onClick={() => toggleOrder(order.id)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedOrders.has(order.id) ? "rotate-180" : ""}`} />
                          <span className="text-xs font-medium text-white">{order.orderNumber}</span>
                          <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          order.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
                          order.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" :
                          order.status === "CANCELLED" ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>
                          {order.status}
                        </span>
                      </button>
                      {expandedOrders.has(order.id) && (
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-gray-500">{t("orderCustomer")}</p>
                              <p className="text-xs text-white">{order.customerName}</p>
                              <p className="text-[10px] text-gray-400">{order.customerEmail}</p>
                            </div>
                            {order.phone && (
                              <div>
                                <p className="text-[10px] text-gray-500">{t("orderPhone")}</p>
                                <p className="text-xs text-white">{order.phone}</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">{t("orderDescription")}</p>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap">{order.description}</p>
                          </div>
                          {order.notes && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("orderNotes")}</p>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">{order.notes}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                            <p className="text-[10px] text-gray-500">{t("orderDate")}: {new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="text-[10px] text-gray-500">{t("orderUpdated")}: {new Date(order.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quote History */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                {t("quoteHistory")} ({viewingUser.quoteRequests.length})
              </h3>
              {viewingUser.quoteRequests.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t("noQuotes")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {viewingUser.quoteRequests.map((quote) => (
                    <div key={quote.id} className="glass rounded-lg border border-white/5 overflow-hidden">
                      <button onClick={() => toggleQuote(quote.id)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expandedQuotes.has(quote.id) ? "rotate-180" : ""}`} />
                          <span className="text-xs font-medium text-white">{quote.quoteNumber}</span>
                          <span className="text-xs text-gray-500">{new Date(quote.createdAt).toLocaleDateString()}</span>
                          {quote.quotedPrice && (
                            <span className="text-[10px] font-medium text-emerald-400">{quote.quotedPrice} EUR</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          quote.status === "accepted" ? "bg-emerald-500/20 text-emerald-400" :
                          quote.status === "quoted" ? "bg-blue-500/20 text-blue-400" :
                          quote.status === "rejected" || quote.status === "user_declined" ? "bg-red-500/20 text-red-400" :
                          quote.status === "counter_offer" ? "bg-purple-500/20 text-purple-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>
                          {quote.status}
                        </span>
                      </button>
                      {expandedQuotes.has(quote.id) && (
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                          {quote.product && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quoteProduct")}</p>
                              <p className="text-xs text-white">{quote.product.nameEn}</p>
                            </div>
                          )}
                          {quote.message && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quoteMessage")}</p>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">{quote.message}</p>
                            </div>
                          )}
                          {quote.quotedPrice && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quotedPrice")}</p>
                              <p className="text-xs font-medium text-emerald-400">{quote.quotedPrice} EUR</p>
                            </div>
                          )}
                          {quote.adminNotes && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quoteAdminNotes")}</p>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">{quote.adminNotes}</p>
                            </div>
                          )}
                          {quote.userResponse && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quoteUserResponse")}</p>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">{quote.userResponse}</p>
                            </div>
                          )}
                          {quote.fileUrl && (
                            <div>
                              <p className="text-[10px] text-gray-500">{t("quoteFile")}</p>
                              <a href={quote.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                <Download className="w-3 h-3" />
                                {quote.fileName || "Download"}
                              </a>
                            </div>
                          )}
                          {/* Conversation History */}
                          {quote.messages.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1.5">{t("conversation")} ({quote.messages.length})</p>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg bg-white/5 p-2">
                                {quote.messages.map((msg) => (
                                  <div key={msg.id} className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                                      msg.senderType === "admin"
                                        ? "bg-blue-500/15 border border-blue-500/20"
                                        : "bg-emerald-500/15 border border-emerald-500/20"
                                    }`}>
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`text-[10px] font-medium ${msg.senderType === "admin" ? "text-blue-400" : "text-emerald-400"}`}>
                                          {msg.senderType === "admin" ? "Admin" : "User"}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                          {new Date(msg.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-white">{msg.message}</p>
                                      {msg.quotedPrice && (
                                        <p className="text-xs font-medium text-emerald-400 mt-0.5">€{parseFloat(msg.quotedPrice).toFixed(2)}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                            <p className="text-[10px] text-gray-500">{t("quoteDate")}: {new Date(quote.createdAt).toLocaleDateString()}</p>
                            {quote.quotedAt && (
                              <p className="text-[10px] text-gray-500">{t("quoteQuotedAt")}: {new Date(quote.quotedAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button
                onClick={() => { setViewingUser(null); setEditing(false) }}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
