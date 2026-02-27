import { NextRequest, NextResponse } from "next/server"
import { processTemplates } from "@/lib/cronNotifications"

/**
 * Vercel Cron endpoint — runs daily at 8 AM UTC.
 * Protected by CRON_SECRET env variable.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("CRON_SECRET not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processTemplates()

    console.log(
      `[Cron Notifications] Processed: ${result.processed}, Sent: ${result.sent}, Coupons: ${result.couponsCreated}`,
      result.errors.length > 0 ? `Errors: ${result.errors.join("; ")}` : ""
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[Cron Notifications] Fatal error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
