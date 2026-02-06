"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Package, ArrowLeft, MessageSquare, ChevronDown } from "lucide-react"
import { Header } from "@/app/components/Header"

interface OrderData {
  id: string
  orderNumber: string
  description: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  createdAt: string
}

interface QuoteMessage {
  id: string
  senderType: string
  message: string
  quotedPrice: string | null
  createdAt: string
}

interface QuoteData {
  id: string
  quoteNumber: string
  status: string
  quotedPrice: string | null
  message: string | null
  adminNotes: string | null
  userResponse: string | null
  viewedAt: string | null
  createdAt: string
  product: {
    nameEn: string
    nameBg: string
    nameEs: string
    slug: string
    image: string | null
  } | null
  messages: QuoteMessage[]
}

interface MyOrdersClientProps {
  orders: OrderData[]
  quotes: QuoteData[]
  translations: {
    myOrdersTitle: string
    myOrdersSubtitle: string
    orderHistory: string
    noOrders: string
    noOrdersDescription: string
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
    newBadge: string
    conversationHistory: string
    you: string
    admin: string
    cancel: string
    backToHome: string
    seeMore: string
    showLess: string
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

export function MyOrdersClient({ orders, quotes: initialQuotes, translations: t }: MyOrdersClientProps) {
  const [quotes, setQuotes] = useState(initialQuotes)
  const [respondingToQuote, setRespondingToQuote] = useState<string | null>(null)
  const [counterOfferMessage, setCounterOfferMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [showAllQuotes, setShowAllQuotes] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState(false)

  const markQuotesAsViewed = useCallback(async () => {
    const unviewedQuotes = quotes.filter(q => q.status === "quoted" && !q.viewedAt)
    for (const quote of unviewedQuotes) {
      try {
        await fetch(`/api/quotes/${quote.id}/view`, { method: "POST" })
        setQuotes(prev => prev.map(q =>
          q.id === quote.id ? { ...q, viewedAt: new Date().toISOString() } : q
        ))
      } catch (error) {
        console.error("Error marking quote as viewed:", error)
      }
    }
  }, [quotes])

  useEffect(() => {
    const timer = setTimeout(markQuotesAsViewed, 2000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      case "PENDING": return t.statusPending
      case "IN_PROGRESS": return t.statusInProgress
      case "COMPLETED": return t.statusCompleted
      case "CANCELLED": return t.statusCancelled
    }
  }

  const getQuoteStatusLabel = (status: string, hasCounterOffer: boolean) => {
    if (status === "pending" && hasCounterOffer) return t.quoteCounterOffer
    switch (status) {
      case "pending": return t.quotePending
      case "quoted": return t.quoteQuoted
      case "accepted": return t.quoteAccepted
      case "rejected": return t.quoteRejected
      case "counter_offer": return t.quoteCounterOffer
      case "user_declined": return t.quoteUserDeclined
      default: return status
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
      </div>

      <Header />

      <div className="relative pt-8 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToHome}
          </Link>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">{t.myOrdersTitle}</h1>
            <p className="text-slate-400">{t.myOrdersSubtitle}</p>
          </div>

        <div className="space-y-8">
          {/* Quote Requests */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              {t.quoteRequests}
              {quotes.length > 0 && (
                <span className="text-sm font-normal text-slate-400">({quotes.length})</span>
              )}
            </h3>

            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">{t.noQuotes}</p>
                <p className="text-sm text-slate-500 mt-1">{t.noQuotesDescription}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(showAllQuotes ? quotes : quotes.slice(0, 3)).map((quote) => {
                  return (
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
                      <div className="flex items-start gap-3 mb-2">
                        {/* Product Image */}
                        {quote.product && (
                          <Link href={`/products/${quote.product.slug}`} className="shrink-0">
                            {quote.product.image ? (
                              <img
                                src={quote.product.image}
                                alt={quote.product.nameEn}
                                className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-white/10 hover:border-emerald-500/30 transition-colors"
                              />
                            ) : (
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-emerald-500/30 transition-colors">
                                <Package className="w-5 h-5 text-slate-600" />
                              </div>
                            )}
                          </Link>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-400 font-mono shrink-0">{quote.quoteNumber}</span>
                                {quote.product ? (
                                  <Link
                                    href={`/products/${quote.product.slug}`}
                                    className="text-white hover:text-emerald-400 transition-colors font-medium truncate"
                                  >
                                    {quote.product.nameEn}
                                  </Link>
                                ) : (
                                  <p className="text-white truncate">
                                    {quote.message ? quote.message.slice(0, 50) + (quote.message.length > 50 ? "..." : "") : "Quote Request"}
                                  </p>
                                )}
                                {quote.status === "quoted" && !quote.viewedAt && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                                    {t.newBadge}
                                  </span>
                                )}
                              </div>
                              {quote.quotedPrice && parseFloat(quote.quotedPrice) >= 0 && (
                                <p className="text-emerald-400 font-semibold text-sm mt-1">
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
                        </div>
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

                      {/* Message History - Expandable */}
                      {quote.messages && quote.messages.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <button
                            onClick={() => setExpandedHistory(expandedHistory === quote.id ? null : quote.id)}
                            className="flex items-center justify-between w-full text-left group"
                          >
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3" />
                              {t.conversationHistory} ({quote.messages.length})
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedHistory === quote.id ? "rotate-180" : ""}`} />
                          </button>

                          {expandedHistory === quote.id && (
                            <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                              {quote.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.senderType === "user" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[75%] rounded-lg px-2.5 py-1.5 ${
                                      msg.senderType === "user"
                                        ? "bg-emerald-500/15 border border-emerald-500/20"
                                        : "bg-blue-500/15 border border-blue-500/20"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`text-[10px] font-medium ${
                                        msg.senderType === "user" ? "text-emerald-400" : "text-blue-400"
                                      }`}>
                                        {msg.senderType === "user" ? t.you : t.admin}
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-white leading-snug">{msg.message}</p>
                                    {msg.quotedPrice && (
                                      <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                                        €{parseFloat(msg.quotedPrice).toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        {formatDate(quote.createdAt)}
                      </p>
                    </div>
                  )
                })}
                {quotes.length > 3 && (
                  <button
                    onClick={() => setShowAllQuotes(!showAllQuotes)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-emerald-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllQuotes ? "rotate-180" : ""}`} />
                    {showAllQuotes ? t.showLess : `${t.seeMore} (${quotes.length - 3})`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-emerald-400" />
              {t.orderHistory}
              {orders.length > 0 && (
                <span className="text-sm font-normal text-slate-400">({orders.length})</span>
              )}
            </h3>

            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">{t.noOrders}</p>
                <p className="text-sm text-slate-500 mt-1">{t.noOrdersDescription}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(showAllOrders ? orders : orders.slice(0, 3)).map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-xs text-emerald-400 font-mono shrink-0 mt-0.5">{order.orderNumber}</span>
                          <p className="text-white line-clamp-2">{order.description}</p>
                        </div>
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
                  )
                })}
                {orders.length > 3 && (
                  <button
                    onClick={() => setShowAllOrders(!showAllOrders)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-emerald-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllOrders ? "rotate-180" : ""}`} />
                    {showAllOrders ? t.showLess : `${t.seeMore} (${orders.length - 3})`}
                  </button>
                )}
              </div>
            )}
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
    </div>
  )
}