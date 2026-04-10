"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, Mail, Phone, MapPin, Calendar, Edit2, ArrowLeft, Globe, Building, Cake, Lock, Copy, Check, ShoppingBag } from "lucide-react"
import { ProfileEditForm } from "@/app/components/ProfileEditForm"
import { Header } from "@/app/components/Header"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"

interface SecretDeal {
  code: string
  type: string
  value: string
  minPurchase: string | null
  expiresAt: string | null
  productIds: string[]
  notificationType: string
  status: "active" | "used" | "expired"
}

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
    secretDealsTitle: string
    secretDealsSubtitle: string
    secretDealsExpires: string
    secretDealsNoExpiry: string
    secretDealsExpiresSoon: string
    secretDealsActive: string
    secretDealsMinPurchase: string
    secretDealsCopy: string
    secretDealsCopied: string
    secretDealsShopNow: string
    secretDealsUsed: string
    secretDealsExpired: string
    sourceBirthday: string
    sourceChristmas: string
    sourceNewYear: string
    sourceEaster: string
    sourceCustom: string
    sourceSpecial: string
  }
  secretDeals: SecretDeal[]
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const getRemaining = () => {
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return null
    const totalSecs = Math.floor(ms / 1000)
    const d = Math.floor(totalSecs / 86400)
    const h = Math.floor((totalSecs % 86400) / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return { d, h, m, s }
  }

  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt])

  if (!remaining) return null

  const { d, h, m, s } = remaining
  const pad = (n: number) => String(n).padStart(2, "0")

  const units = d > 0
    ? [{ val: pad(d), label: "д" }, { val: pad(h), label: "ч" }, { val: pad(m), label: "м" }, { val: pad(s), label: "с" }]
    : [{ val: pad(h), label: "ч" }, { val: pad(m), label: "м" }, { val: pad(s), label: "с" }]

  return (
    <div className="flex items-end gap-1 animate-sale-blink">
      {units.map(({ val, label }, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="min-w-[2rem] px-1.5 py-0.5 rounded-md border bg-red-500/20 border-red-500/50 text-red-300 font-mono font-black text-sm tabular-nums text-center">
            {val}
          </div>
          <span className="text-[9px] font-bold uppercase text-red-500">{label}</span>
        </div>
      ))}
    </div>
  )
}

const SOURCE_MAP: Record<string, { icon: string; labelKey: string }> = {
  auto_birthday: { icon: "🎂", labelKey: "sourceBirthday" },
  auto_christmas: { icon: "🎄", labelKey: "sourceChristmas" },
  auto_new_year: { icon: "🎆", labelKey: "sourceNewYear" },
  auto_easter: { icon: "🐣", labelKey: "sourceEaster" },
  auto_custom: { icon: "🎁", labelKey: "sourceCustom" },
}

export function ProfileClient({ user, translations: t, secretDeals }: ProfileClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }).catch(() => {
      const el = document.createElement("textarea")
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return null
    return new Date(expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
      <BackgroundOrbs />

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
        {/* Secret Deals Section */}
          {secretDeals.length > 0 && (
            <div className="mt-6 md:mt-8">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t.secretDealsTitle}</h3>
                  <p className="text-sm text-slate-400">{t.secretDealsSubtitle}</p>
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {secretDeals.map(deal => {
                  const source = SOURCE_MAP[deal.notificationType] || { icon: "🎟️", labelKey: "sourceSpecial" }
                  const sourceLabel = t[source.labelKey as keyof typeof t] as string
                  const expiryDate = formatExpiryDate(deal.expiresAt)
                  const discountDisplay = deal.type === "percentage"
                    ? `${parseFloat(deal.value).toFixed(0)}%`
                    : `€${parseFloat(deal.value).toFixed(2)}`
                  const isCopied = copiedCode === deal.code
                  const isActive = deal.status === "active"
                  const isUsed = deal.status === "used"

                  const cardClass = isActive
                    ? "glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5 flex flex-col gap-3"
                    : "glass rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 flex flex-col gap-3 opacity-60"

                  return (
                    <div key={deal.code} className={cardClass}>
                      {/* Top row: source badge + status chip / countdown */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isActive ? "text-amber-300/80 bg-amber-500/10" : "text-slate-400 bg-white/5"}`}>
                          <span>{source.icon}</span>
                          <span>{sourceLabel}</span>
                        </span>
                        {isActive ? (
                          deal.expiresAt
                            ? <CountdownTimer expiresAt={deal.expiresAt} />
                            : <span className="text-xs font-medium text-slate-400">{t.secretDealsNoExpiry}</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isUsed ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                            {isUsed ? <Check className="w-3 h-3" /> : null}
                            {isUsed ? t.secretDealsUsed : t.secretDealsExpired}
                          </span>
                        )}
                      </div>

                      {/* Discount value */}
                      <div className={`text-4xl font-black leading-none py-1 ${isActive ? "text-amber-400" : "text-slate-500"}`}>
                        {discountDisplay}
                      </div>

                      {/* Coupon code + copy */}
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 font-mono text-sm font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-2 truncate ${isActive ? "text-white" : "text-slate-500 line-through"}`}>
                          {deal.code}
                        </span>
                        {isActive && (
                          <button
                            onClick={() => handleCopy(deal.code)}
                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all touch-manipulation"
                            title={isCopied ? t.secretDealsCopied : t.secretDealsCopy}
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Footer: expiry date + min purchase + CTA */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <div className="flex flex-col gap-0.5">
                          {expiryDate && (
                            <span className="text-[11px] text-slate-500">
                              {t.secretDealsExpires}: {expiryDate}
                            </span>
                          )}
                          {deal.minPurchase && parseFloat(deal.minPurchase) > 0 && (
                            <span className="text-[11px] text-slate-500">
                              {t.secretDealsMinPurchase}: €{parseFloat(deal.minPurchase).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <Link
                            href="/products"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold transition-all touch-manipulation"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {t.secretDealsShopNow}
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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