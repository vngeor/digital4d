"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { NewsModal } from "./NewsModal"

interface NewsItem {
    title: string
    description: string
    date: string
    category: string
    image?: string | null
    slug?: string | null
}

interface NewsSectionProps {
    newsItems: NewsItem[]
    showAllLink?: boolean
}

export function NewsSection({ newsItems, showAllLink = false }: NewsSectionProps) {
    const t = useTranslations("news")
    const [selectedNews, setSelectedNews] = useState<{ item: NewsItem; index: number } | null>(null)

    const renderNewsCard = (item: NewsItem, index: number) => (
        <>
            {/* Image */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                {item.image ? (
                    <>
                        <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Badge */}
            <div className="px-6 pt-4 -mt-6 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300">
                    {item.category}
                </span>
            </div>

            {/* Content */}
            <div className="p-6 pt-3">
                <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[3.5rem]">
                    {item.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-3 min-h-[3.75rem]">
                    {item.description}
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.date}</span>
                    <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t("readMore")}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                </div>
            </div>

            {/* Decorative gradient line */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
    )

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
                        {newsItems.map((item, index) => {
                            const hasSlug = item.slug && item.slug.trim() !== ""

                            if (hasSlug) {
                                return (
                                    <Link
                                        key={index}
                                        href={`/news/${item.slug}`}
                                        className="group glass rounded-2xl overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
                                    >
                                        {renderNewsCard(item, index)}
                                    </Link>
                                )
                            }

                            return (
                                <article
                                    key={index}
                                    className="group glass rounded-2xl overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedNews({ item, index })}
                                >
                                    {renderNewsCard(item, index)}
                                </article>
                            )
                        })}
                    </div>

                    {/* See All Button */}
                    {showAllLink && (
                        <div className="mt-12 text-center">
                            <Link
                                href="/news"
                                className="inline-flex items-center gap-2 px-8 py-4 glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-all"
                            >
                                {t("seeAll")}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Modal - only used when item has no slug */}
            <NewsModal
                news={selectedNews?.item || null}
                categoryIndex={selectedNews?.index || 0}
                onClose={() => setSelectedNews(null)}
            />
        </>
    )
}
