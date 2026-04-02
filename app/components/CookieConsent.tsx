"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie, X } from "lucide-react"
import { useTranslations } from "next-intl"

const STORAGE_KEY = "d4d-cookie-consent"

export function CookieConsent() {
    const t = useTranslations("cookieConsent")
    // null = not yet checked (SSR), false = hidden, true = visible
    const [visible, setVisible] = useState<boolean | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            // Small delay so it doesn't flash on initial page load
            const timer = setTimeout(() => setVisible(true), 800)
            return () => clearTimeout(timer)
        }
        setVisible(false)
    }, [])

    const accept = () => {
        localStorage.setItem(STORAGE_KEY, "accepted")
        setVisible(false)
    }

    const decline = () => {
        localStorage.setItem(STORAGE_KEY, "declined")
        setVisible(false)
    }

    // Render nothing until client-side check completes (prevents hydration mismatch)
    if (visible === null || visible === false) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[60] flex justify-center pointer-events-none">
            <div
                className="glass border border-white/10 rounded-2xl p-4 sm:p-5 max-w-lg w-full pointer-events-auto shadow-2xl animate-fade-in-up"
                role="dialog"
                aria-label={t("title")}
                aria-live="polite"
            >
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Cookie className="w-4 h-4 text-emerald-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white mb-1">{t("title")}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {t("message")}{" "}
                            <Link
                                href="/privacy"
                                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                            >
                                {t("privacyLink")}
                            </Link>
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <button
                                onClick={accept}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity touch-manipulation"
                            >
                                {t("accept")}
                            </button>
                            <button
                                onClick={decline}
                                className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors touch-manipulation"
                            >
                                {t("decline")}
                            </button>
                        </div>
                    </div>

                    {/* Dismiss (same as decline) */}
                    <button
                        onClick={decline}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-300 shrink-0 touch-manipulation"
                        aria-label="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
