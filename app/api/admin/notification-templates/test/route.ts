import { NextRequest, NextResponse } from "next/server"
import { requirePermissionApi } from "@/lib/admin"
import { testSendTemplate } from "@/lib/cronNotifications"

/**
 * Test-send a notification template to a single user.
 * POST body: { templateId: string, userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("notifications", "create")
    if (error) return error

    const { templateId, userId } = await request.json()

    if (!templateId || !userId) {
      return NextResponse.json(
        { error: "Template ID and user ID are required" },
        { status: 400 }
      )
    }

    const result = await testSendTemplate(templateId, userId)

    void session

    return NextResponse.json({
      success: true,
      notificationId: result.notificationId,
      couponId: result.couponId || null,
    })
  } catch (error) {
    console.error("Error test-sending template:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
