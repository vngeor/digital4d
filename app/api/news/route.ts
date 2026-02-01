import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") || "news"
  const limit = parseInt(searchParams.get("limit") || "10")

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
