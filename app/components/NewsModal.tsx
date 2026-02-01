"use client"

import { useEffect } from "react"

interface NewsItem {
    title: string
    description: string
    date: string
    category: string
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

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (news) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl glass-strong shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Gradient line at top */}
                <div className={`h-1 w-full bg-gradient-to-r ${colors.gradient}`} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-4px)]">
                    {/* Category & Date */}
                    <div className="flex items-center gap-4 mb-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                            {news.category}
                        </span>
                        <span className="text-sm text-slate-500">{news.date}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        {news.title}
                    </h2>

                    {/* Description - render with line breaks */}
                    <div className="text-slate-300 leading-relaxed space-y-4">
                        {news.description.split("\n\n").map((paragraph, index) => (
                            <p key={index} className={paragraph.length < 50 && !paragraph.includes(".") ? "text-lg font-semibold text-white mt-6" : ""}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
