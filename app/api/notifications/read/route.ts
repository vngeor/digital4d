import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (!notification.read) {
      await prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
