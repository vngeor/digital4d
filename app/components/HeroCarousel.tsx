"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HeroBanner {
  title: string
  subtitle?: string | null
  image?: string | null
  link?: string | null
  linkText?: string | null
}

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return
      setIsTransitioning(true)
      setCurrent(index)
      setTimeout(() => setIsTransitioning(false), 500)
    },
    [isTransitioning]
  )

  const next = useCallback(() => {
    goTo((current + 1) % banners.length)
  }, [current, banners.length, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + banners.length) % banners.length)
  }, [current, banners.length, goTo])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, banners.length])

  if (!banners.length) return null

  return (
    <section className="relative min-h-[50vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Slides */}
      {banners.map((banner, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-500 ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Image */}
          {banner.image && (
            <div className="absolute inset-0">
              <img
                src={banner.image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/80" />
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center h-full px-4 py-20">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 max-w-4xl">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {banner.title}
              </span>
            </h1>

            {banner.subtitle && (
              <p className="text-sm sm:text-lg md:text-xl text-slate-300 max-w-2xl mb-6 sm:mb-10">
                {banner.subtitle}
              </p>
            )}

            {banner.link && banner.linkText && (
              <Link
                href={banner.link}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full font-semibold text-white text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 transition-all"
              >
                {banner.linkText}
              </Link>
            )}
          </div>
        </div>
      ))}

      {/* Arrows (desktop only) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden md:flex absolute left-4 z-20 w-12 h-12 rounded-full glass items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-4 z-20 w-12 h-12 rounded-full glass items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${
                i === current
                  ? "bg-emerald-400 scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
