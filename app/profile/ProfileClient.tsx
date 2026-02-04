"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, Mail, Phone, MapPin, Calendar, Package, Edit2, ArrowLeft } from "lucide-react"
import { ProfileEditForm } from "@/app/components/ProfileEditForm"

interface UserData {
  id: string
  name: string | null
  email: string
  phone: string | null
  address: string | null
  image: string | null
  createdAt: string
}

interface OrderData {
  id: string
  description: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  createdAt: string
}

interface ProfileClientProps {
  user: UserData
  orders: OrderData[]
  translations: {
    title: string
    subtitle: string
    personalInfo: string
    name: string
    email: string
    phone: string
    address: string
    noPhone: string
    noAddress: string
    memberSince: string
    editProfile: string
    editProfileTitle: string
    phonePlaceholder: string
    addressPlaceholder: string
    phoneRequired: string
    save: string
    saving: string
    cancel: string
    updateSuccess: string
    updateError: string
    orderHistory: string
    noOrders: string
    noOrdersDescription: string
    orderDate: string
    orderStatus: string
    orderDescription: string
    statusPending: string
    statusInProgress: string
    statusCompleted: string
    statusCancelled: string
  }
}

const statusColors = {
  PENDING: "bg-amber-500/20 text-amber-400",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-400",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-red-500/20 text-red-400",
}

export function ProfileClient({ user, orders, translations: t }: ProfileClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const getStatusLabel = (status: OrderData["status"]) => {
    switch (status) {
      case "PENDING":
        return t.statusPending
      case "IN_PROGRESS":
        return t.statusInProgress
      case "COMPLETED":
        return t.statusCompleted
      case "CANCELLED":
        return t.statusCancelled
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{t.title}</h1>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="glass rounded-2xl border border-white/10 p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-3xl font-bold mb-4">
                    {user.name?.charAt(0) || "U"}
                  </div>
                )}
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>

              {/* Member since */}
              <div className="flex items-center gap-2 text-sm text-slate-400 justify-center">
                <Calendar className="w-4 h-4" />
                <span>{t.memberSince} {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Info & Orders */}
          <div className="md:col-span-2 space-y-8">
            {/* Personal Info */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  {t.personalInfo}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  {t.editProfile}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.name}</p>
                    <p className="text-white">{user.name || "-"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.email}</p>
                    <p className="text-white">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.phone}</p>
                    <p className={user.phone ? "text-white" : "text-slate-500 italic"}>
                      {user.phone || t.noPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.address}</p>
                    <p className={user.address ? "text-white whitespace-pre-wrap" : "text-slate-500 italic"}>
                      {user.address || t.noAddress}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Package className="w-5 h-5 text-emerald-400" />
                {t.orderHistory}
              </h3>

              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">{t.noOrders}</p>
                  <p className="text-sm text-slate-500 mt-1">{t.noOrdersDescription}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-white line-clamp-2">{order.description}</p>
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProfileEditForm
          phone={user.phone}
          address={user.address}
          onClose={() => setIsEditModalOpen(false)}
          translations={{
            editProfileTitle: t.editProfileTitle,
            phone: t.phone,
            phonePlaceholder: t.phonePlaceholder,
            phoneRequired: t.phoneRequired,
            address: t.address,
            addressPlaceholder: t.addressPlaceholder,
            save: t.save,
            saving: t.saving,
            cancel: t.cancel,
            updateSuccess: t.updateSuccess,
            updateError: t.updateError,
          }}
        />
      )}
    </div>
  )
}