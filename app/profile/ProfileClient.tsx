"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, Mail, Phone, MapPin, Calendar, Package, Edit2, ArrowLeft, Globe, Building, Cake, MessageSquare } from "lucide-react"
import { ProfileEditForm } from "@/app/components/ProfileEditForm"

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

interface OrderData {
  id: string
  description: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  createdAt: string
}

interface QuoteData {
  id: string
  status: string
  quotedPrice: string | null
  message: string | null
  adminNotes: string | null
  userResponse: string | null
  createdAt: string
  product: {
    nameEn: string
    nameBg: string
    nameEs: string
    slug: string
  } | null
}

interface ProfileClientProps {
  user: UserData
  orders: OrderData[]
  quotes: QuoteData[]
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
    quoteRequests: string
    noQuotes: string
    noQuotesDescription: string
    quotePending: string
    quoteQuoted: string
    quoteAccepted: string
    quoteRejected: string
    quotedPrice: string
    viewProduct: string
    rejectionReason: string
    acceptOffer: string
    declineOffer: string
    counterOffer: string
    yourMessage: string
    sendCounterOffer: string
    quoteCounterOffer: string
    quoteUserDeclined: string
    respondToOffer: string
    counterOfferSent: string
  }
}

const statusColors = {
  PENDING: "bg-amber-500/20 text-amber-400",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-400",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-red-500/20 text-red-400",
}

const quoteStatusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  quoted: "bg-blue-500/20 text-blue-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  counter_offer: "bg-purple-500/20 text-purple-400",
  user_declined: "bg-gray-500/20 text-gray-400",
}

export function ProfileClient({ user, orders, quotes: initialQuotes, translations: t }: ProfileClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [quotes, setQuotes] = useState(initialQuotes)
  const [respondingToQuote, setRespondingToQuote] = useState<string | null>(null)
  const [counterOfferMessage, setCounterOfferMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleQuoteResponse = async (quoteId: string, action: "accept" | "decline" | "counter_offer", message?: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/quotes/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, action, message }),
      })

      if (res.ok) {
        const updatedQuote = await res.json()
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: updatedQuote.status, userResponse: updatedQuote.userResponse } : q))
        setRespondingToQuote(null)
        setCounterOfferMessage("")
      }
    } catch (error) {
      console.error("Error responding to quote:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const getQuoteStatusLabel = (status: string, hasCounterOffer: boolean) => {
    if (status === "pending" && hasCounterOffer) {
      return t.quoteCounterOffer
    }
    switch (status) {
      case "pending":
        return t.quotePending
      case "quoted":
        return t.quoteQuoted
      case "accepted":
        return t.quoteAccepted
      case "rejected":
        return t.quoteRejected
      case "counter_offer":
        return t.quoteCounterOffer
      case "user_declined":
        return t.quoteUserDeclined
      default:
        return status
    }
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

            {/* Quote Requests */}
            <div className="glass rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                {t.quoteRequests}
              </h3>

              {quotes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">{t.noQuotes}</p>
                  <p className="text-sm text-slate-500 mt-1">{t.noQuotesDescription}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className={`p-4 rounded-xl border ${
                        quote.status === "rejected"
                          ? "bg-red-500/5 border-red-500/20"
                          : quote.status === "quoted"
                          ? "bg-blue-500/5 border-blue-500/20"
                          : quote.status === "accepted"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-white/5 border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          {quote.product ? (
                            <Link
                              href={`/products/${quote.product.slug}`}
                              className="text-white hover:text-emerald-400 transition-colors font-medium"
                            >
                              {quote.product.nameEn}
                            </Link>
                          ) : (
                            <p className="text-white">
                              {quote.message ? quote.message.slice(0, 50) + (quote.message.length > 50 ? "..." : "") : "Quote Request"}
                            </p>
                          )}
                          {quote.quotedPrice && parseFloat(quote.quotedPrice) >= 0 && (
                            <p className="text-emerald-400 font-semibold mt-1">
                              {t.quotedPrice}: €{parseFloat(quote.quotedPrice).toFixed(2)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                            quote.status === "pending" && quote.userResponse
                              ? quoteStatusColors.counter_offer
                              : quoteStatusColors[quote.status] || quoteStatusColors.pending
                          }`}
                        >
                          {getQuoteStatusLabel(quote.status, !!quote.userResponse)}
                        </span>
                      </div>

                      {/* Response buttons for quoted status */}
                      {quote.status === "quoted" && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs text-blue-400 font-medium mb-3">{t.respondToOffer}</p>
                          {respondingToQuote === quote.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={counterOfferMessage}
                                onChange={(e) => setCounterOfferMessage(e.target.value)}
                                placeholder={t.yourMessage}
                                rows={3}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleQuoteResponse(quote.id, "counter_offer", counterOfferMessage)}
                                  disabled={isSubmitting || !counterOfferMessage.trim()}
                                  className="flex-1 px-3 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
                                >
                                  {t.sendCounterOffer}
                                </button>
                                <button
                                  onClick={() => { setRespondingToQuote(null); setCounterOfferMessage(""); }}
                                  className="px-3 py-2 rounded-lg bg-white/10 text-slate-300 text-sm hover:bg-white/20 transition-colors"
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleQuoteResponse(quote.id, "accept")}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                              >
                                {t.acceptOffer}
                              </button>
                              <button
                                onClick={() => setRespondingToQuote(quote.id)}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
                              >
                                {t.counterOffer}
                              </button>
                              <button
                                onClick={() => handleQuoteResponse(quote.id, "decline")}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-lg bg-white/10 text-slate-300 text-sm font-medium hover:bg-white/20 disabled:opacity-50 transition-colors"
                              >
                                {t.declineOffer}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show user's counter offer */}
                      {quote.status === "pending" && quote.userResponse && (
                        <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-xs text-purple-400 font-medium mb-1">{t.counterOfferSent}:</p>
                          <p className="text-sm text-purple-300">{quote.userResponse}</p>
                        </div>
                      )}

                      {/* Rejection reason */}
                      {quote.status === "rejected" && quote.adminNotes && (
                        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-400 font-medium mb-1">{t.rejectionReason}:</p>
                          <p className="text-sm text-red-300">{quote.adminNotes}</p>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        {formatDate(quote.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
          country={user.country}
          city={user.city}
          address={user.address}
          birthDate={user.birthDate}
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