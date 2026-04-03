"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie } from "lucide-react"
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
                className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-md w-full pointer-events-auto shadow-2xl shadow-black/60 overflow-hidden animate-fade-in-up"
                role="dialog"
                aria-label={t("title")}
                aria-live="polite"
            >
                {/* Emerald gradient accent line */}
                <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

                <div className="p-5">
                    {/* Icon + Text */}
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Cookie className="w-[18px] h-[18px] text-emerald-400" />
                        </div>
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
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={decline}
                            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors touch-manipulation"
                        >
                            {t("decline")}
                        </button>
                        <button
                            onClick={accept}
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 transition-opacity touch-manipulation"
                        >
                            {t("accept")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
