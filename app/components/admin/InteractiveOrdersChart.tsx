"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { toast } from "sonner"
import { OrdersChart } from "./OrdersChart"

type Granularity = "day" | "month" | "year"

interface InteractiveOrdersChartProps {
  initialData: { label: string; orders: number }[]
  title: string
}

const LOCALE_MAP: Record<string, string> = {
  bg: "bg-BG",
  en: "en-US",
  es: "es-ES",
}

function formatLabel(raw: string, granularity: Granularity, locale: string): string {
  const localeStr = LOCALE_MAP[locale] || "en-US"

  if (granularity === "day") {
    const date = new Date(raw + "T00:00:00Z")
    return new Intl.DateTimeFormat(localeStr, { day: "numeric", month: "short", timeZone: "UTC" }).format(date)
  }

  if (granularity === "month") {
    const date = new Date(raw + "-01T00:00:00Z")
    return new Intl.DateTimeFormat(localeStr, { month: "short", year: "2-digit", timeZone: "UTC" }).format(date)
  }

  return raw // year is just "2026"
}

function getDefaultFrom(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 5)
  d.setDate(1)
  return d.toISOString().split("T")[0]
}

function getDefaultTo(): string {
  return new Date().toISOString().split("T")[0]
}

export function InteractiveOrdersChart({ initialData, title }: InteractiveOrdersChartProps) {
  const t = useTranslations("admin.dashboard")
  const locale = useLocale()

  const [granularity, setGranularity] = useState<Granularity>("month")
  const [dateFrom, setDateFrom] = useState(getDefaultFrom)
  const [dateTo, setDateTo] = useState(getDefaultTo)
  const [chartData, setChartData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [isInitial, setIsInitial] = useState(true)

  const fetchChartData = useCallback(async (g: Granularity, from: string, to: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ granularity: g, from, to })
      const res = await fetch(`/api/admin/dashboard/orders-chart?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(err.error || t("chartLoadError"))
        setLoading(false)
        return
      }
      const { data } = await res.json()
      const formatted = data.map((item: { label: string; orders: number }) => ({
        label: formatLabel(item.label, g, locale),
        orders: item.orders,
      }))
      setChartData(formatted)
      setIsInitial(false)
    } catch {
      toast.error(t("chartLoadError"))
    } finally {
      setLoading(false)
    }
  }, [locale, t])

  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g)
    fetchChartData(g, dateFrom, dateTo)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    if (value && dateTo) {
      fetchChartData(granularity, value, dateTo)
    }
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    if (dateFrom && value) {
      fetchChartData(granularity, dateFrom, value)
    }
  }

  const granularityOptions: { key: Granularity; label: string }[] = [
    { key: "day", label: t("granularityDay") },
    { key: "month", label: t("granularityMonth") },
    { key: "year", label: t("granularityYear") },
  ]

  const hasData = chartData.some(d => d.orders > 0)

  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">{t("dateFrom")}</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">{t("dateTo")}</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Granularity toggle */}
          <div className="flex gap-1">
            {granularityOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleGranularityChange(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  granularity === opt.key
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && !isInitial && !hasData ? (
        <div className="h-64 sm:h-72 flex items-center justify-center">
          <p className="text-gray-500 text-sm">{t("noChartData")}</p>
        </div>
      ) : (
        <OrdersChart data={chartData} loading={loading} />
      )}
    </div>
  )
}
