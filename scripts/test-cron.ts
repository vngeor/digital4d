/**
 * Manually run the notification cron job for testing.
 *
 * Usage:
 *   npm run test:cron                        # Run against today's date
 *   npm run test:cron -- --date=2026-04-12   # Simulate a specific date (Easter)
 *   npm run test:cron -- --date=2026-12-25   # Simulate Christmas
 */

import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

import { processTemplates, processReminderNotifications } from "../lib/cronNotifications"

async function main() {
  // Parse --date=YYYY-MM-DD argument
  const dateArg = process.argv.find((a) => a.startsWith("--date="))
  let overrideDate: Date | undefined

  if (dateArg) {
    const dateStr = dateArg.split("=")[1]
    overrideDate = new Date(dateStr)
    if (isNaN(overrideDate.getTime())) {
      console.error(`Invalid date: "${dateStr}". Use YYYY-MM-DD format.`)
      process.exit(1)
    }
  }

  const runningAs = overrideDate
    ? `Simulating date: ${overrideDate.toDateString()}`
    : `Running against today: ${new Date().toDateString()}`

  console.log(`\n[test-cron] ${runningAs}\n`)

  console.log("Processing templates...")
  const result = await processTemplates(overrideDate)

  console.log(`  Processed : ${result.processed} templates`)
  console.log(`  Sent      : ${result.sent} notifications`)
  console.log(`  Coupons   : ${result.couponsCreated} created`)

  if (result.errors.length > 0) {
    console.log(`  Errors    : ${result.errors.length}`)
    result.errors.forEach((e) => console.error(`    - ${e}`))
  }

  console.log("\nProcessing 48h coupon reminders...")
  const reminders = await processReminderNotifications()

  console.log(`  Reminders sent: ${reminders.sent}`)

  if (reminders.errors.length > 0) {
    console.log(`  Errors: ${reminders.errors.length}`)
    reminders.errors.forEach((e) => console.error(`    - ${e}`))
  }

  const totalErrors = result.errors.length + reminders.errors.length
  console.log(`\n[test-cron] Done. ${totalErrors > 0 ? `${totalErrors} error(s) — see above.` : "No errors."}\n`)

  process.exit(totalErrors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("[test-cron] Fatal:", err)
  process.exit(1)
})
