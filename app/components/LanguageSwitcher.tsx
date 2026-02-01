"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { locales, localeFlags, type Locale } from "@/i18n/config"

export function LanguageSwitcher() {
  const t = useTranslations("language")
  const currentLocale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const changeLocale = (newLocale: Locale) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`
      window.location.reload()
    })
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 transition-all text-sm"
        disabled={isPending}
      >
        <span className="text-base">{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{currentLocale.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform group-hover:rotate-180 ${isPending ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-40 py-2 glass-strong rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => changeLocale(locale)}
            disabled={isPending || locale === currentLocale}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
              locale === currentLocale
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-base">{localeFlags[locale]}</span>
            <span>{t(locale)}</span>
            {locale === currentLocale && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
