import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Find the quote and verify access
    const quote = await prisma.quoteRequest.findUnique({
      where: { id },
      select: { email: true },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Allow access if user owns the quote or is admin/editor
    const isStaff = session.user.role === "ADMIN" || session.user.role === "EDITOR"
    const isOwner = quote.email === session.user.email

    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await prisma.quoteMessage.findMany({
      where: { quoteId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        message: true,
        quotedPrice: true,
        createdAt: true,
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching quote messages:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}