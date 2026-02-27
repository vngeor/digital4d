"use client"

import { useEffect } from "react"

interface NewsItem {
    title: string
    description: string
    date: string
    category: string
    image?: string | null
}

interface NewsModalProps {
    news: NewsItem | null
    onClose: () => void
    categoryIndex: number
}

export function NewsModal({ news, onClose, categoryIndex }: NewsModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [onClose])

    // Prevent body scroll when modal is open (iOS-safe pattern)
    useEffect(() => {
        if (news) {
            const scrollY = window.scrollY
            document.body.style.position = "fixed"
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = "100%"
            document.body.style.overflow = "hidden"
            return () => {
                document.body.style.position = ""
                document.body.style.top = ""
                document.body.style.width = ""
                document.body.style.overflow = ""
                window.scrollTo(0, scrollY)
            }
        }
    }, [news])

    if (!news) return null

    const categoryColors = [
        { badge: "bg-cyan-500/20 text-cyan-300", gradient: "from-cyan-500 to-blue-500" },
        { badge: "bg-amber-500/20 text-amber-300", gradient: "from-amber-500 to-orange-500" },
        { badge: "bg-emerald-500/20 text-emerald-300", gradient: "from-emerald-500 to-cyan-500" },
    ]

    const colors = categoryColors[categoryIndex] || categoryColors[2]

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-safe pb-safe"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-3xl glass-strong shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Gradient line at top */}
                <div className={`h-1 w-full flex-shrink-0 bg-gradient-to-r ${colors.gradient}`} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-10 sm:h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all z-20 touch-manipulation"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {/* Image */}
                    {news.image && (
                        <div className="relative h-48 flex-shrink-0 overflow-hidden">
                            <img
                                src={news.image}
                                alt={news.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        </div>
                    )}

                    {/* Content */}
                    <div className={`p-5 sm:p-8 ${news.image ? "-mt-12 relative z-10" : ""}`}>
                        {/* Category & Date */}
                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                                {news.category}
                            </span>
                            <span className="text-sm text-slate-500">{news.date}</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent break-words">
                            {news.title}
                        </h2>

                        {/* Description - render HTML content */}
                        <div
                            className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed pb-4"
                            dangerouslySetInnerHTML={{ __html: news.description }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
