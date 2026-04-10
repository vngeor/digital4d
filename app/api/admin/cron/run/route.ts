import { NextRequest, NextResponse } from "next/server"
import { requirePermissionApi } from "@/lib/admin"
import { processTemplates, processReminderNotifications } from "@/lib/cronNotifications"

/**
 * Manually trigger the notification cron job.
 * Requires notifications:create permission.
 * Accepts optional { date } body to simulate a specific date.
 */
export async function POST(request: NextRequest) {
  const { error } = await requirePermissionApi("notifications", "create")
  if (error) return error

  try {
    const body = await request.json().catch(() => ({}))
    const overrideDate = body.date ? new Date(body.date) : undefined

    if (overrideDate && isNaN(overrideDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    const result = await processTemplates(overrideDate)
    const reminderResult = await processReminderNotifications()

    return NextResponse.json({
      ...result,
      reminders: { sent: reminderResult.sent, errors: reminderResult.errors },
      simulatedDate: overrideDate ? overrideDate.toISOString() : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
