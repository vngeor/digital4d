"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface PromoBanner {
  title: string
  link?: string | null
  linkText?: string | null
}

export function PromoStrip({ banners }: { banners: PromoBanner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(true)

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

  if (!banners.length) return null

  const current = banners[currentIndex]

  return (
    <div className="relative z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
      <div className="max-w-7xl mx-auto px-4 py-1.5 sm:py-2 flex items-center justify-center gap-2 sm:gap-3">
        <span
          className={`text-xs sm:text-sm text-white font-medium text-center transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {current.title}
        </span>
        {current.link && current.linkText && (
          <Link
            href={current.link}
            className={`text-xs sm:text-sm text-white/90 underline underline-offset-2 hover:text-white whitespace-nowrap transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {current.linkText}
          </Link>
        )}
      </div>
    </div>
  )
}
