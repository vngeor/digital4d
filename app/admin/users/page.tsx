"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Trash2, Loader2, Shield, User as UserIcon } from "lucide-react"
import { DataTable } from "@/app/components/admin/DataTable"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: "USER" | "ADMIN"
  createdAt: string
  _count: {
    orders: number
  }
}

export default function UsersPage() {
  const t = useTranslations("admin.users")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

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

  const handleRoleChange = async (user: User, newRole: "USER" | "ADMIN") => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    })
    fetchUsers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
      return
    }
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
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t("role"),
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
      render: (item: User) => (
        <span className="text-gray-400">{item._count.orders}</span>
      ),
    },
    {
      key: "createdAt",
      header: t("joined"),
      render: (item: User) => (
        <span className="text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (item: User) => (
        <div className="flex items-center gap-2">
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
    </div>
  )
}
