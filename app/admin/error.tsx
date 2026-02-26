"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { RotateCcw, AlertTriangle, LayoutDashboard } from "lucide-react"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("error")

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {t("title")}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm hover:from-emerald-600 hover:to-cyan-600 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {t("tryAgain")}
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:border-emerald-500/30 hover:text-white transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("backToDashboard")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
