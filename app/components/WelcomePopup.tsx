"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { usePathname } from "next/navigation"
import { X, Copy, Check } from "lucide-react"

interface PopupConfig {
  welcomePopupEnabled:    boolean
  welcomePopupTitleBg:    string
  welcomePopupTitleEn:    string
  welcomePopupTitleEs:    string
  welcomePopupMessageBg:  string
  welcomePopupMessageEn:  string
  welcomePopupMessageEs:  string
  welcomePopupImage:      string
  welcomePopupCouponCode: string
  welcomePopupDelay:      number
  welcomePopupLink:       string
}

const STORAGE_KEY = "d4d-welcome-popup-seen"

function safeLocalStorage(action: "get" | "set", key: string, value?: string): string | null {
  try {
    if (action === "get") return localStorage.getItem(key)
    localStorage.setItem(key, value ?? "")
  } catch { /* private browsing or storage disabled */ }
  return null
}

export function WelcomePopup() {
  // ── All hooks MUST be called unconditionally at the top ──
  const pathname = usePathname()
  const t = useTranslations("welcomePopup")
  const locale = useLocale()
  const [visible, setVisible] = useState<boolean | null>(null)
  const [config, setConfig] = useState<PopupConfig | null>(null)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Don't show on admin, login, or checkout pages
    if (
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      pathname.startsWith("/checkout")
    ) {
      setVisible(false)
      return
    }

    // Already seen in this browser — never show again
    if (safeLocalStorage("get", STORAGE_KEY)) {
      setVisible(false)
      return
    }

    let cancelled = false

    fetch("/api/settings")
      .then(r => r.json())
      .then((data: PopupConfig) => {
        if (cancelled) return
        if (!data.welcomePopupEnabled) {
          setVisible(false)
          return
        }
        setConfig(data)
        // Clamp delay to 0–30 s on frontend as well
        const delay = Math.max(0, Math.min(30, data.welcomePopupDelay ?? 2)) * 1000
        timerRef.current = setTimeout(() => {
          if (!cancelled) setVisible(true)
        }, delay)
      })
      .catch(() => {
        if (!cancelled) setVisible(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
  }, [pathname])

  const close = () => {
    safeLocalStorage("set", STORAGE_KEY, "seen")
    setVisible(false)
  }

  const copyCode = async () => {
    if (!config?.welcomePopupCouponCode) return
    try {
      await navigator.clipboard.writeText(config.welcomePopupCouponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }

  // null = still loading (SSR safe — prevents hydration mismatch)
  if (!visible || !config) return null

  const suffix = locale === "bg" ? "Bg" : locale === "es" ? "Es" : "En"
  const cfg = config as unknown as Record<string, string>
  const title   = cfg[`welcomePopupTitle${suffix}`]   || config.welcomePopupTitleEn
  const message = cfg[`welcomePopupMessage${suffix}`] || config.welcomePopupMessageEn
  const link    = config.welcomePopupLink?.trim() || ""

  // Nothing to show — require at least one piece of content
  if (!title && !message && !config.welcomePopupImage && !config.welcomePopupCouponCode) return null

  return (
    /* Backdrop — z-[62]: above CookieConsent (z-[60]), below lightbox/QuoteForm (z-[65]) */
    <div
      className="fixed inset-0 z-[62] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      {/* Modal — stop propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-md bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Banner image */}
        {config.welcomePopupImage && (
          link
            ? (
              <a href={link} onClick={close} className="block cursor-pointer">
                <img
                  src={config.welcomePopupImage}
                  alt="Welcome offer"
                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                />
              </a>
            )
            : (
              <img
                src={config.welcomePopupImage}
                alt="Welcome offer"
                className="w-full h-48 object-cover"
              />
            )
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Title */}
          {title && (
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent pr-8">
              {title}
            </h2>
          )}

          {/* Message */}
          {message && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {message}
            </p>
          )}

          {/* Coupon box */}
          {config.welcomePopupCouponCode && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3">
              <span className="font-mono font-bold text-amber-300 tracking-widest text-sm truncate">
                {config.welcomePopupCouponCode}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors touch-manipulation shrink-0"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" /> {t("copied")}</>
                  : <><Copy className="w-3.5 h-3.5" /> {t("copy")}</>
                }
              </button>
            </div>
          )}

          {/* CTA buttons */}
          {link ? (
            <>
              <a
                href={link}
                onClick={close}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity touch-manipulation text-center block"
              >
                {t("shopNow")}
              </a>
              <button
                onClick={close}
                className="w-full py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors touch-manipulation"
              >
                {t("noThanks")}
              </button>
            </>
          ) : (
            <button
              onClick={close}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity touch-manipulation"
            >
              {t("close")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
