"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, Mail, Phone, MapPin, Calendar, Edit2, ArrowLeft, Globe, Building, Cake } from "lucide-react"
import { ProfileEditForm } from "@/app/components/ProfileEditForm"
import { Header } from "@/app/components/Header"

interface UserData {
  id: string
  name: string | null
  email: string
  phone: string | null
  country: string | null
  city: string | null
  address: string | null
  birthDate: string | null
  image: string | null
  createdAt: string
}

interface ProfileClientProps {
  user: UserData
  translations: {
    title: string
    subtitle: string
    personalInfo: string
    name: string
    email: string
    phone: string
    country: string
    city: string
    address: string
    birthDate: string
    noPhone: string
    noCountry: string
    noCity: string
    noAddress: string
    noBirthDate: string
    memberSince: string
    editProfile: string
    editProfileTitle: string
    phonePlaceholder: string
    countryPlaceholder: string
    cityPlaceholder: string
    addressPlaceholder: string
    phoneRequired: string
    birthDateRequired: string
    save: string
    saving: string
    cancel: string
    updateSuccess: string
    updateError: string
    backToHome: string
    addBirthday: string
    addBirthdayButton: string
  }
}

export function ProfileClient({ user, translations: t }: ProfileClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatBirthDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
      </div>

      <Header />

      <div className="relative pt-16 sm:pt-20 md:pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">{t.title}</h1>
            <p className="text-slate-400">{t.subtitle}</p>
          </div>

          {/* Birthday banner — shown when user hasn't set birthDate */}
          {!user.birthDate && (
            <div className="mb-8 glass rounded-2xl border border-pink-500/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10">
              <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Cake className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-sm text-gray-300 flex-1">{t.addBirthday}</p>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="shrink-0 w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all"
              >
                {t.addBirthdayButton}
              </button>
            </div>
          )}

        <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="glass rounded-2xl border border-white/10 p-4 sm:p-6">
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

          {/* Personal Info */}
          <div className="md:col-span-2">
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
                  <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.country}</p>
                    <p className={user.country ? "text-white" : "text-slate-500 italic"}>
                      {user.country || t.noCountry}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.city}</p>
                    <p className={user.city ? "text-white" : "text-slate-500 italic"}>
                      {user.city || t.noCity}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.address}</p>
                    <p className={user.address ? "text-white" : "text-slate-500 italic"}>
                      {user.address || t.noAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Cake className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t.birthDate}</p>
                    <p className={user.birthDate ? "text-white" : "text-slate-500 italic"}>
                      {formatBirthDate(user.birthDate) || t.noBirthDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="glass border-t border-white/10 py-8 mt-12">
        <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
          <p>&copy; 2024 digital4d. All rights reserved.</p>
        </div>
      </footer>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProfileEditForm
          phone={user.phone}
          country={user.country}
          city={user.city}
          address={user.address}
          birthDate={user.birthDate}
          highlightBirthDate={!user.birthDate}
          onClose={() => setIsEditModalOpen(false)}
          translations={{
            editProfileTitle: t.editProfileTitle,
            phone: t.phone,
            phonePlaceholder: t.phonePlaceholder,
            phoneRequired: t.phoneRequired,
            country: t.country,
            countryPlaceholder: t.countryPlaceholder,
            city: t.city,
            cityPlaceholder: t.cityPlaceholder,
            address: t.address,
            addressPlaceholder: t.addressPlaceholder,
            birthDate: t.birthDate,
            birthDateRequired: t.birthDateRequired,
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