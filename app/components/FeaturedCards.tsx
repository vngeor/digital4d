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
                  <div className="flex justify-center mt-2">
                    <Link
                      href={card.link}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                        />
                        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                      </svg>
                      {card.linkText}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
