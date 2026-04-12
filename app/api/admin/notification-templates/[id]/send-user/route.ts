import { NextRequest, NextResponse } from "next/server"
import { requirePermissionApi } from "@/lib/admin"
import { sendTemplateToUser } from "@/lib/cronNotifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermissionApi("notifications", "create")
  if (error) return error

  const { id } = await params

  try {
    const body = await request.json()
    const { userId, force = false } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const result = await sendTemplateToUser(id, userId, !!force)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 400 }
    )
  }
}
