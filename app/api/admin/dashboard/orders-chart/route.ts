import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"

function formatBucketKey(date: Date, granularity: "day" | "month" | "year"): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")

  if (granularity === "day") return `${y}-${m}-${d}`
  if (granularity === "month") return `${y}-${m}`
  return `${y}`
}

function buildBuckets(from: Date, to: Date, granularity: "day" | "month" | "year"): Map<string, number> {
  const buckets = new Map<string, number>()
  const cursor = new Date(from)

  while (cursor <= to) {
    buckets.set(formatBucketKey(cursor, granularity), 0)

    if (granularity === "day") {
      cursor.setDate(cursor.getDate() + 1)
    } else if (granularity === "month") {
      cursor.setMonth(cursor.getMonth() + 1)
    } else {
      cursor.setFullYear(cursor.getFullYear() + 1)
    }
  }

  return buckets
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("dashboard", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const granularity = (searchParams.get("granularity") || "month") as "day" | "month" | "year"

    if (!["day", "month", "year"].includes(granularity)) {
      return NextResponse.json({ error: "Invalid granularity. Use day, month, or year." }, { status: 400 })
    }

    // Parse date range with defaults
    const now = new Date()
    let from: Date
    let to: Date

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    if (fromParam) {
      from = new Date(fromParam + "T00:00:00Z")
      if (isNaN(from.getTime())) {
        return NextResponse.json({ error: "Invalid 'from' date" }, { status: 400 })
      }
    } else {
      from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1))
    }

    if (toParam) {
      to = new Date(toParam + "T23:59:59.999Z")
      if (isNaN(to.getTime())) {
        return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 })
      }
    } else {
      to = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))
    }

    // Swap if from > to
    if (from > to) {
      const tmp = from
      from = to
      to = tmp
    }

    // Validate range limits
    const diffMs = to.getTime() - from.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (granularity === "day" && diffDays > 366) {
      return NextResponse.json({ error: "Day granularity is limited to 1 year range" }, { status: 400 })
    }

    if (granularity === "month" && diffDays > 3660) {
      return NextResponse.json({ error: "Month granularity is limited to 10 year range" }, { status: 400 })
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: { createdAt: true },
    })

    const buckets = buildBuckets(from, to, granularity)

    for (const order of orders) {
      const key = formatBucketKey(new Date(order.createdAt), granularity)
      if (buckets.has(key)) {
        buckets.set(key, buckets.get(key)! + 1)
      }
    }

    const data = Array.from(buckets.entries()).map(([label, orders]) => ({
      label,
      orders,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching orders chart data:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
