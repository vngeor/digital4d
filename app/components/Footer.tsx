"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

export default function Footer() {
    const t = useTranslations("footer")

    return (
        <footer className="glass border-t border-white/10 py-6 sm:py-8 mt-12">
            <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-sm text-slate-400">
                <p>&copy; {new Date().getFullYear()} digital4d. {t("rights")}</p>
                <div className="flex items-center gap-4">
                    <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                        {t("termsLink")}
                    </Link>
                    <span className="text-white/20">|</span>
                    <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                        {t("privacyLink")}
                    </Link>
                </div>
            </div>
        </footer>
    )
}
