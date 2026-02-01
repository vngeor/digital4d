"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { NewsModal } from "./NewsModal"

interface NewsItem {
    title: string
    description: string
    date: string
    category: string
}

interface NewsSectionProps {
    newsItems: NewsItem[]
}

export function NewsSection({ newsItems }: NewsSectionProps) {
    const t = useTranslations("news")
    const [selectedNews, setSelectedNews] = useState<{ item: NewsItem; index: number } | null>(null)

    return (
        <>
            <section id="news" className="relative py-24 px-4">
                <div className="mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            {t("title")}
                        </h2>
                        <p className="text-slate-400 text-lg">{t("subtitle")}</p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {newsItems.map((item, index) => (
                            <article
                                key={index}
                                className="group glass rounded-2xl overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer"
                                onClick={() => setSelectedNews({ item, index })}
                            >
                                {/* Category Badge */}
                                <div className="p-6 pb-0">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                        index === 0
                                            ? "bg-cyan-500/20 text-cyan-300"
                                            : index === 1
                                                ? "bg-amber-500/20 text-amber-300"
                                                : "bg-emerald-500/20 text-emerald-300"
                                    }`}>
                                        {item.category}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                                        {item.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{item.date}</span>
                                        <button
                                            className="text-emerald-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedNews({ item, index })
                                            }}
                                        >
                                            {t("readMore")}
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Decorative gradient line */}
                                <div className={`h-1 w-full ${
                                    index === 0
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                        : index === 1
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                            : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                                } opacity-0 group-hover:opacity-100 transition-opacity`} />
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Modal */}
            <NewsModal
                news={selectedNews?.item || null}
                categoryIndex={selectedNews?.index || 0}
                onClose={() => setSelectedNews(null)}
            />
        </>
    )
}
