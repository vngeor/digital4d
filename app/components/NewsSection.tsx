"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { NewsModal } from "./NewsModal"
import { getColorClass } from "@/lib/colors"

interface NewsItem {
    title: string
    description: string
    date: string
    category: string
    categoryColor?: string
    image?: string | null
    slug?: string | null
}

interface NewsSectionProps {
    newsItems: NewsItem[]
    showAllLink?: boolean
    compact?: boolean
    initialLimit?: number
    loadMoreCount?: number
}

export function NewsSection({ newsItems, showAllLink = false, compact = false, initialLimit, loadMoreCount = 6 }: NewsSectionProps) {
    const t = useTranslations("news")
    const [selectedNews, setSelectedNews] = useState<{ item: NewsItem; index: number } | null>(null)
    const [visibleCount, setVisibleCount] = useState(initialLimit || newsItems.length)

    const visibleItems = newsItems.slice(0, visibleCount)
    const hasMore = visibleCount < newsItems.length

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + loadMoreCount, newsItems.length))
    }

    const renderNewsCard = (item: NewsItem, index: number, compact: boolean = false) => (
        <>
            {/* Image */}
            <div className={`relative ${compact ? 'h-32 sm:h-40' : 'h-40'} overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900`}>
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
                        <div className={`${compact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-16 h-16'} rounded-xl bg-cyan-500/20 flex items-center justify-center`}>
                            <svg className={`${compact ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-8 h-8'} text-cyan-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Badge */}
            <div className={`${compact ? 'px-3 sm:px-4 pt-2' : 'px-6 pt-4'} -mt-4 relative z-10`}>
                <span className={`inline-block px-2 py-0.5 rounded-full ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'} font-semibold ${getColorClass(item.categoryColor || 'cyan')}`}>
                    {item.category}
                </span>
            </div>

            {/* Content */}
            <div className={`${compact ? 'p-3 sm:p-4 pt-1' : 'p-3 sm:p-6 pt-2 sm:pt-3'}`}>
                <h3 className={`${compact ? 'text-base sm:text-lg' : 'text-base sm:text-xl'} font-bold mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2`}>
                    {item.title}
                </h3>
                {/* Description - truncated to 200 chars */}
                {item.description && (
                    <p className={`${compact ? 'text-xs sm:text-sm line-clamp-2' : 'text-xs sm:text-sm line-clamp-3'} text-slate-400 mb-2`}>
                        {item.description.length > 200
                            ? item.description.substring(0, 200) + '...'
                            : item.description}
                    </p>
                )}
                <div className="flex items-center justify-between mt-2">
                    <span className={`${compact ? 'text-[10px] sm:text-xs' : 'text-[10px] sm:text-xs'} text-slate-500`}>{item.date}</span>
                    <span className={`text-emerald-400 ${compact ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm'} font-semibold flex items-center gap-1 group-hover:gap-2 transition-all`}>
                        {t("readMore")}
                        <svg className={`${compact ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-3 h-3 sm:w-4 sm:h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                </div>
            </div>
        </>
    )

    return (
        <>
            <section id="news" className={`relative ${compact ? 'py-10 sm:py-12' : 'py-24'} px-4`}>
                <div className={`mx-auto ${compact ? 'max-w-4xl' : 'max-w-6xl'}`}>
                    <div className={`text-center ${compact ? 'mb-6 sm:mb-8' : 'mb-16'}`}>
                        <h2 className={`${compact ? 'text-2xl sm:text-3xl' : 'text-4xl'} font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent`}>
                            {t("title")}
                        </h2>
                        <p className={`text-slate-400 ${compact ? 'text-sm sm:text-base' : 'text-lg'}`}>{t("subtitle")}</p>
                    </div>

                    <div className={`grid ${compact ? 'grid-cols-2 gap-2 sm:gap-3 md:gap-5 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6'}`}>
                        {visibleItems.map((item, index) => {
                            const hasSlug = item.slug && item.slug.trim() !== ""

                            if (hasSlug) {
                                return (
                                    <Link
                                        key={index}
                                        href={`/news/${item.slug}`}
                                        className={`group glass ${compact ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300`}
                                    >
                                        {renderNewsCard(item, index, compact)}
                                    </Link>
                                )
                            }

                            return (
                                <article
                                    key={index}
                                    className={`group glass ${compact ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer`}
                                    onClick={() => setSelectedNews({ item, index })}
                                >
                                    {renderNewsCard(item, index, compact)}
                                </article>
                            )
                        })}
                    </div>

                    {/* Load More Button */}
                    {hasMore && !showAllLink && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={loadMore}
                                className="inline-flex items-center gap-2 px-6 py-3 glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-all"
                            >
                                {t("readMore")}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* See All Button */}
                    {showAllLink && (
                        <div className={`${compact ? 'mt-4 sm:mt-6' : 'mt-12'} text-center`}>
                            <Link
                                href="/news"
                                className={`inline-flex items-center gap-1.5 ${compact ? 'px-4 py-2 text-xs sm:text-sm' : 'px-8 py-4'} glass rounded-full font-semibold hover:bg-white/10 hover:scale-105 transition-all`}
                            >
                                {t("seeAll")}
                                <svg className={`${compact ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
