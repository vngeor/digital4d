import { NextRequest, NextResponse } from "next/server"
import { requirePermissionApi } from "@/lib/admin"
import { sendTemplateToAllUsers } from "@/lib/cronNotifications"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermissionApi("notifications", "create")
  if (error) return error

  const { id } = await params

  try {
    const result = await sendTemplateToAllUsers(id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 400 }
    )
  }
}
