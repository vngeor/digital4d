"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Header } from "./components/Header"
import { Home, RotateCcw, AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("error")

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
      </div>

      <Header />

      <section className="relative flex flex-1 items-start justify-center pt-16 sm:pt-24 px-4">
        <div className="text-center max-w-lg mx-auto">
          <div className="glass rounded-2xl border border-white/10 p-8 mb-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t("title")}
            </h1>
            <p className="text-slate-400 mb-8">
              {t("description")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => reset()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                {t("tryAgain")}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass border border-white/10 text-slate-300 font-semibold hover:border-emerald-500/30 hover:text-white transition-all"
              >
                <Home className="w-5 h-5" />
                {t("backHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="glass border-t border-white/10 py-8 mt-auto">
        <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
          <p>&copy; 2024 digital4d.</p>
        </div>
      </footer>
    </div>
  )
}
