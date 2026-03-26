import Link from "next/link"
import { getTranslations, getLocale } from "next-intl/server"
import { Users, ShoppingCart, FileText, TrendingUp, MessageSquare, ArrowRight } from "lucide-react"
import prisma from "@/lib/prisma"
import { StatsCard } from "../components/admin/StatsCard"
import { InteractiveOrdersChart } from "../components/admin/InteractiveOrdersChart"
import { QuickActions } from "../components/admin/QuickActions"
import type { Order, User } from "@prisma/client"

type RecentOrder = Pick<Order, "id" | "customerName" | "customerEmail" | "status"> & {
  user: Pick<User, "name" | "email"> | null
}

type RecentUser = Pick<User, "id" | "name" | "email" | "image" | "createdAt">

async function getStats() {
  const [userCount, orderCount, contentCount, pendingOrders, pendingQuotes] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.content.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.quoteRequest.count({ where: { status: "pending" } }),
  ])

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  })

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  })

  // Monthly order counts for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const monthlyOrders = await prisma.order.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  })

  return {
    userCount,
    orderCount,
    contentCount,
    pendingOrders,
    pendingQuotes,
    recentOrders,
    recentUsers,
    monthlyOrders,
  }
}

export default async function AdminDashboard() {
  const t = await getTranslations("admin")
  const locale = await getLocale()
  const stats = await getStats()

  // Aggregate orders by month for initial chart render
  const now = new Date()
  const localeStr = locale === "bg" ? "bg-BG" : locale === "es" ? "es-ES" : "en-US"
  const chartData: { label: string; orders: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthLabel = d.toLocaleDateString(localeStr, { month: "short", year: "2-digit" })
    const count = stats.monthlyOrders.filter((o: { createdAt: Date }) => {
      const c = new Date(o.createdAt)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
    }).length
    chartData.push({ label: monthLabel, orders: count })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("dashboard.title")}</h1>
        <p className="text-gray-400">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <StatsCard
          title={t("dashboard.totalUsers")}
          value={stats.userCount}
          icon={Users}
          color="emerald"
          href="/admin/users"
        />
        <StatsCard
          title={t("dashboard.totalOrders")}
          value={stats.orderCount}
          icon={ShoppingCart}
          color="cyan"
          href="/admin/orders"
        />
        <StatsCard
          title={t("dashboard.pendingOrders")}
          value={stats.pendingOrders}
          icon={TrendingUp}
          color="amber"
          href="/admin/orders"
        />
        <StatsCard
          title={t("dashboard.contentItems")}
          value={stats.contentCount}
          icon={FileText}
          color="purple"
          href="/admin/content"
        />
        <StatsCard
          title={t("dashboard.pendingQuotes")}
          value={stats.pendingQuotes}
          icon={MessageSquare}
          color="pink"
          href="/admin/quotes"
        />
      </div>

      <QuickActions />

      <InteractiveOrdersChart
        initialData={chartData}
        title={t("dashboard.ordersOverTime")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {t("dashboard.recentOrders")}
            </h2>
            <Link href="/admin/orders" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              {t("dashboard.viewAll")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-gray-500">{t("dashboard.noOrders")}</p>
          ) : (
            <div className="space-y-4">
              {stats.recentOrders.map((order: RecentOrder) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-white">{order.customerName}</p>
                    <p className="text-sm text-gray-400">{order.customerEmail}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-400"
                        : order.status === "IN_PROGRESS"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : order.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {order.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {t("dashboard.recentUsers")}
            </h2>
            <Link href="/admin/users" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              {t("dashboard.viewAll")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="text-gray-500">{t("dashboard.noUsers")}</p>
          ) : (
            <div className="space-y-4">
              {stats.recentUsers.map((user: RecentUser) => (
                <Link
                  key={user.id}
                  href="/admin/users"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || ""}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {user.name || "Anonymous"}
                    </p>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
