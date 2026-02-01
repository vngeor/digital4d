import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: "emerald" | "cyan" | "purple" | "amber" | "pink"
}

const colorClasses = {
  emerald: {
    bg: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    icon: "from-emerald-500 to-emerald-600",
    text: "text-emerald-400",
  },
  cyan: {
    bg: "from-cyan-500/20 to-cyan-600/10",
    border: "border-cyan-500/30",
    icon: "from-cyan-500 to-cyan-600",
    text: "text-cyan-400",
  },
  purple: {
    bg: "from-purple-500/20 to-purple-600/10",
    border: "border-purple-500/30",
    icon: "from-purple-500 to-purple-600",
    text: "text-purple-400",
  },
  amber: {
    bg: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/30",
    icon: "from-amber-500 to-amber-600",
    text: "text-amber-400",
  },
  pink: {
    bg: "from-pink-500/20 to-pink-600/10",
    border: "border-pink-500/30",
    icon: "from-pink-500 to-pink-600",
    text: "text-pink-400",
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "emerald",
}: StatsCardProps) {
  const colors = colorClasses[color]

  return (
    <div
      className={`glass rounded-2xl p-6 border ${colors.border} bg-gradient-to-br ${colors.bg}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-2 ${
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
              <span className="text-gray-500 ml-1">vs last month</span>
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}
