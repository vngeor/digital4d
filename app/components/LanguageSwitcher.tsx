"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { locales, localeFlags, type Locale } from "@/i18n/config"

export function LanguageSwitcher() {
  const t = useTranslations("language")
  const currentLocale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setIsOpen(false)
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`
      window.location.reload()
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 transition-all text-sm touch-manipulation"
        disabled={isPending}
      >
        <span className="text-base">{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{currentLocale.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""} ${isPending ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 py-2 bg-slate-900/95 backdrop-blur-xl rounded-xl z-[60] border border-white/10 shadow-xl">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => changeLocale(locale)}
              disabled={isPending || locale === currentLocale}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm whitespace-nowrap transition-colors touch-manipulation ${
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
      )}
    </div>
  )
}
