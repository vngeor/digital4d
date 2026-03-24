import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Validate type against whitelist
  const ALLOWED_TYPES = ["news", "service"]
  const rawType = searchParams.get("type") || "news"
  const type = ALLOWED_TYPES.includes(rawType) ? rawType : "news"

  // Cap limit to prevent excessive data retrieval
  const limit = Math.min(parseInt(searchParams.get("limit") || "10") || 10, 50)

  const content = await prisma.content.findMany({
    where: {
      type,
      published: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: limit,
  })

  return NextResponse.json(content)
}
