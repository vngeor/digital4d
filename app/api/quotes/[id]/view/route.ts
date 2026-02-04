import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Find the quote and verify it belongs to this user
    const quote = await prisma.quoteRequest.findUnique({
      where: { id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    if (quote.email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only mark as viewed if it's in "quoted" status and not already viewed
    if (quote.status === "quoted" && !quote.viewedAt) {
      await prisma.quoteRequest.update({
        where: { id },
        data: { viewedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking quote as viewed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}