import Link from "next/link"

interface CardBanner {
  title: string
  subtitle?: string | null
  image?: string | null
  link?: string | null
  linkText?: string | null
}

export function FeaturedCards({ cards }: { cards: CardBanner[] }) {
  if (!cards.length) return null

  return (
    <section className="relative py-12 sm:py-20 px-4 sm:px-8 z-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="group glass rounded-2xl overflow-hidden hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
            >
              {card.image && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 line-clamp-2">
                    {card.subtitle}
                  </p>
                )}
                {card.link && card.linkText && (
                  <Link
                    href={card.link}
                    className="inline-flex items-center text-xs sm:text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {card.linkText}
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
