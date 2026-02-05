"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"

interface PromoBanner {
  id: string
  title: string
  link?: string | null
  linkText?: string | null
}

interface RawBanner {
  id: string
  titleBg: string
  titleEn: string
  titleEs: string
  link?: string | null
  linkTextBg?: string | null
  linkTextEn?: string | null
  linkTextEs?: string | null
}

export function GlobalPromoStrip() {
  const locale = useLocale()
  const pathname = usePathname()
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)

  // Don't show on admin pages
  const isAdminPage = pathname?.startsWith("/admin")

  // Fetch banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/banners")
        if (res.ok) {
          const data = await res.json()
          const localeKey = locale === "bg" ? "Bg" : locale === "es" ? "Es" : "En"
          const localizedBanners = (data.promo || []).map((b: RawBanner) => ({
            id: b.id,
            title: b[`title${localeKey}` as keyof RawBanner] || b.titleEn,
            link: b.link,
            linkText: b[`linkText${localeKey}` as keyof RawBanner] || b.linkTextEn,
          }))
          setBanners(localizedBanners)
        }
      } catch (error) {
        console.error("Failed to fetch promo banners:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchBanners()
  }, [locale])

  // Rotate banners
  useEffect(() => {
    if (banners.length <= 1) return

    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length)
        setVisible(true)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [banners.length])

  if (loading || !banners.length || isAdminPage) return null

  const current = banners[currentIndex]

  const content = (
    <div className="max-w-7xl mx-auto px-4 py-1.5 sm:py-2 flex items-center justify-center">
      <span
        className={`text-xs sm:text-sm text-white font-medium text-center transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {current.title}
      </span>
    </div>
  )

  if (current.link) {
    return (
      <Link
        href={current.link}
        className="sticky top-0 z-50 block bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all cursor-pointer"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
      {content}
    </div>
  )
}