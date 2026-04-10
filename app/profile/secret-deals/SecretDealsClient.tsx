"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocale } from "next-intl"
import Link from "next/link"
import { ArrowLeft, Lock, Copy, Check, ShoppingBag, Tag, Store, Layers } from "lucide-react"
import { Header } from "@/app/components/Header"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"

interface LocalizedName {
  nameBg: string
  nameEn: string
  nameEs: string
}

interface SecretDeal {
  code: string
  type: string
  value: string
  minPurchase: string | null
  expiresAt: string | null
  productIds: string[]
  categoryIds: string[]
  brandIds: string[]
  brandNames: LocalizedName[]
  categoryNames: LocalizedName[]
  notificationType: string
  status: "active" | "used" | "expired"
}

interface SecretDealsClientProps {
  secretDeals: SecretDeal[]
  translations: {
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
    secretDealsEmpty: string
    secretDealsEmptySubtitle: string
    secretDealsCount: string
    secretDealsAllProducts: string
    secretDealsProducts: string
    backToProfile: string
    sourceBirthday: string
    sourceChristmas: string
    sourceNewYear: string
    sourceEaster: string
    sourceCustom: string
    sourceSpecial: string
  }
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

  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining>>(null)

  useEffect(() => {
    setRemaining(getRemaining())
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
    <div className="flex items-end gap-0.5 animate-sale-blink">
      {units.map(({ val, label }, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="min-w-[1.6rem] px-1 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono font-black text-xs tabular-nums text-center">
            {val}
          </div>
          <span className="text-[8px] font-bold uppercase text-red-400/70">{label}</span>
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

export function SecretDealsClient({ secretDeals, translations: t }: SecretDealsClientProps) {
  const locale = useLocale()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const nowMs = useMemo(() => new Date().getTime(), [])

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
    return new Date(expiresAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
  }

  const getLocalizedName = (item: LocalizedName) => {
    const key = `name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof LocalizedName
    return item[key] || item.nameEn
  }

  const activeCount = secretDeals.filter(d => d.status === "active").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
      <BackgroundOrbs />
      <Header />

      <div className="relative pt-16 sm:pt-20 md:pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">

          {/* Back link */}
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {t.backToProfile}
          </Link>

          {/* Page header */}
          <div className="flex items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t.secretDealsTitle}</h1>
                <p className="text-slate-400 text-xs mt-0.5">{t.secretDealsSubtitle}</p>
              </div>
            </div>
            {secretDeals.length > 0 && (
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-amber-400">{activeCount}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t.secretDealsCount}</div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {secretDeals.length === 0 ? (
            <div className="glass rounded-2xl border border-white/10 p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Tag className="w-7 h-7 text-amber-500/40" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{t.secretDealsEmpty}</h3>
              <p className="text-slate-400 text-xs max-w-xs mx-auto mb-5 leading-relaxed">{t.secretDealsEmptySubtitle}</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {t.secretDealsShopNow}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                const msLeft = deal.expiresAt ? new Date(deal.expiresAt).getTime() - nowMs : Infinity
                const isExpiringSoon = msLeft < 3 * 24 * 60 * 60 * 1000 && msLeft > 0
                const hasRestrictions = deal.brandIds.length > 0 || deal.categoryIds.length > 0 || deal.productIds.length > 0

                return (
                  <div
                    key={deal.code}
                    className={`glass rounded-2xl border p-4 flex flex-col gap-3 transition-opacity ${
                      isActive ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/[0.02] opacity-55"
                    }`}
                  >
                    {/* Top row: source badge + timer/status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-amber-500/10 text-amber-300/80" : "bg-white/5 text-slate-500"}`}>
                        <span>{source.icon}</span>
                        <span>{sourceLabel}</span>
                      </span>
                      {isActive ? (
                        deal.expiresAt
                          ? <CountdownTimer expiresAt={deal.expiresAt} />
                          : <span className="text-[10px] text-slate-500">{t.secretDealsNoExpiry}</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isUsed ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {isUsed && <Check className="w-2.5 h-2.5" />}
                          {isUsed ? t.secretDealsUsed : t.secretDealsExpired}
                        </span>
                      )}
                    </div>

                    {/* Discount value */}
                    <div className={`text-4xl font-black leading-none ${isActive ? "text-amber-400" : "text-slate-500"}`}>
                      {discountDisplay}
                    </div>

                    {/* Code + copy */}
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 font-mono text-sm font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-2 truncate ${isActive ? "text-white" : "text-slate-500 line-through"}`}>
                        {deal.code}
                      </span>
                      {isActive && (
                        <button
                          onClick={() => handleCopy(deal.code)}
                          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border transition-all touch-manipulation ${
                            isCopied
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-amber-500/15 hover:border-amber-500/25 hover:text-amber-400"
                          }`}
                          title={isCopied ? t.secretDealsCopied : t.secretDealsCopy}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Restriction chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {!hasRestrictions ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Store className="w-2.5 h-2.5" />
                          {t.secretDealsAllProducts}
                        </span>
                      ) : (
                        <>
                          {deal.categoryNames.map((cat, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                              <Layers className="w-2.5 h-2.5" />
                              {getLocalizedName(cat)}
                            </span>
                          ))}
                          {deal.brandNames.map((brand, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                              <Tag className="w-2.5 h-2.5" />
                              {getLocalizedName(brand)}
                            </span>
                          ))}
                          {deal.productIds.length > 0 && deal.brandIds.length === 0 && deal.categoryIds.length === 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">
                              <ShoppingBag className="w-2.5 h-2.5" />
                              {deal.productIds.length} {t.secretDealsProducts}
                            </span>
                          )}
                        </>
                      )}
                      {deal.minPurchase && parseFloat(deal.minPurchase) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                          {t.secretDealsMinPurchase}: €{parseFloat(deal.minPurchase).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Footer: expiry + CTA */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <span className={`text-[10px] ${isExpiringSoon ? "text-amber-400 font-semibold" : "text-slate-500"}`}>
                        {expiryDate ? `${t.secretDealsExpires}: ${expiryDate}` : ""}
                        {isExpiringSoon ? " ⚡" : ""}
                      </span>
                      {isActive && (
                        <Link
                          href="/products"
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold transition-all touch-manipulation"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          {t.secretDealsShopNow}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="glass border-t border-white/10 py-8 mt-12">
        <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
          <p>&copy; 2024 digital4d. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
