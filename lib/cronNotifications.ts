import prisma from "@/lib/prisma"
import { getOrthodoxEasterDate } from "@/lib/orthodoxEaster"

/** Coupon code prefixes by trigger type */
const COUPON_PREFIXES: Record<string, string> = {
  birthday: "BDAY",
  christmas: "XMAS",
  new_year: "NEWYEAR",
  orthodox_easter: "EASTER",
  custom_date: "TMPL",
}

/** Map trigger type to notification type */
function getNotificationType(trigger: string): string {
  if (trigger === "birthday") return "auto_birthday"
  if (trigger === "christmas") return "auto_christmas"
  if (trigger === "new_year") return "auto_new_year"
  if (trigger === "orthodox_easter") return "auto_easter"
  return "auto_custom"
}

/** Check if a year is a leap year */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Find users matching the event date for a given trigger type.
 * Returns an array of { id, name } objects.
 */
async function findMatchingUsers(
  trigger: string,
  eventDate: Date,
  customMonth?: number | null,
  customDay?: number | null,
  recurring?: boolean
): Promise<Array<{ id: string; name: string | null }>> {
  const eventMonth = eventDate.getMonth() // 0-indexed
  const eventDay = eventDate.getDate()
  const eventYear = eventDate.getFullYear()

  if (trigger === "birthday") {
    // Fetch all users with birthDate set
    const users = await prisma.user.findMany({
      where: { birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    })

    return users.filter((user) => {
      if (!user.birthDate) return false
      const bd = new Date(user.birthDate)
      const bdMonth = bd.getMonth()
      const bdDay = bd.getDate()

      // Direct match
      if (bdMonth === eventMonth && bdDay === eventDay) return true

      // Feb 29 fallback: in non-leap years, match Feb 29 birthdays on Feb 28
      if (!isLeapYear(eventYear) && eventMonth === 1 && eventDay === 28 && bdMonth === 1 && bdDay === 29) {
        return true
      }

      return false
    })
  }

  if (trigger === "christmas") {
    // Dec 25
    if (eventMonth !== 11 || eventDay !== 25) return []
    return prisma.user.findMany({ select: { id: true, name: true } })
  }

  if (trigger === "new_year") {
    // Jan 1
    if (eventMonth !== 0 || eventDay !== 1) return []
    return prisma.user.findMany({ select: { id: true, name: true } })
  }

  if (trigger === "orthodox_easter") {
    const easterDate = getOrthodoxEasterDate(eventYear)
    if (
      easterDate.getMonth() !== eventMonth ||
      easterDate.getDate() !== eventDay
    ) {
      return []
    }
    return prisma.user.findMany({ select: { id: true, name: true } })
  }

  if (trigger === "custom_date") {
    if (!customMonth || !customDay) return []
    // customMonth is 1-indexed, eventMonth is 0-indexed
    if (eventMonth !== customMonth - 1 || eventDay !== customDay) return []
    // One-time (non-recurring) — only fire in the first year it's created
    // The recurring check is handled by the caller, but we still match the date
    if (recurring === false) {
      // Will be filtered out in processTemplates if already sent in a previous year
    }
    return prisma.user.findMany({ select: { id: true, name: true } })
  }

  return []
}

/**
 * Resolve placeholders in a template string.
 * Supported: {name}, {couponCode}, {couponValue}, {expiresAt}
 */
function resolvePlaceholders(
  template: string,
  data: { name?: string | null; couponCode?: string; couponValue?: string; expiresAt?: string }
): string {
  let result = template
  if (data.name) result = result.replace(/\{name\}/g, data.name)
  if (data.couponCode) result = result.replace(/\{couponCode\}/g, data.couponCode)
  if (data.couponValue) result = result.replace(/\{couponValue\}/g, data.couponValue)
  if (data.expiresAt) result = result.replace(/\{expiresAt\}/g, data.expiresAt)
  // Clean up any remaining placeholders
  result = result.replace(/\{name\}/g, "")
  result = result.replace(/\{couponCode\}/g, "")
  result = result.replace(/\{couponValue\}/g, "")
  result = result.replace(/\{expiresAt\}/g, "")
  return result
}

/**
 * Process all active notification templates.
 * Called by the daily cron job.
 */
export async function processTemplates(): Promise<{
  processed: number
  sent: number
  couponsCreated: number
  errors: string[]
}> {
  const result = { processed: 0, sent: 0, couponsCreated: 0, errors: [] as string[] }

  const templates = await prisma.notificationTemplate.findMany({
    where: { active: true },
  })

  const today = new Date()
  const currentYear = today.getFullYear()

  for (const template of templates) {
    try {
      result.processed++

      // Calculate the event date: today + daysBefore
      // If daysBefore = 7 and trigger = birthday, we look for birthdays 7 days from now
      const eventDate = new Date(today)
      eventDate.setDate(eventDate.getDate() + template.daysBefore)

      // Non-recurring custom_date templates: only fire in current year
      if (template.trigger === "custom_date" && !template.recurring) {
        // Check if this template has ever been sent (any year)
        const existingLog = await prisma.templateSendLog.findFirst({
          where: { templateId: template.id },
        })
        if (existingLog) continue // Already fired once
      }

      // Find matching users
      const users = await findMatchingUsers(
        template.trigger,
        eventDate,
        template.customMonth,
        template.customDay,
        template.recurring
      )

      if (users.length === 0) {
        // Update lastRunAt even if no matches
        await prisma.notificationTemplate.update({
          where: { id: template.id },
          data: { lastRunAt: new Date(), lastRunCount: 0 },
        })
        continue
      }

      // Get existing send logs for this template + year to filter out already-sent users
      const existingLogs = await prisma.templateSendLog.findMany({
        where: {
          templateId: template.id,
          year: currentYear,
        },
        select: { userId: true },
      })
      const alreadySentUserIds = new Set(existingLogs.map((l) => l.userId))

      const eligibleUsers = users.filter((u) => !alreadySentUserIds.has(u.id))

      if (eligibleUsers.length === 0) {
        await prisma.notificationTemplate.update({
          where: { id: template.id },
          data: { lastRunAt: new Date(), lastRunCount: 0 },
        })
        continue
      }

      let templateSentCount = 0
      const notificationType = getNotificationType(template.trigger)

      for (const user of eligibleUsers) {
        try {
          let couponId: string | undefined
          let couponCode: string | undefined
          let couponValueStr: string | undefined
          let expiresAtStr: string | undefined

          // Create auto-coupon if enabled
          if (template.couponEnabled && template.couponType && template.couponValue) {
            const prefix = COUPON_PREFIXES[template.trigger] || "TMPL"
            const userSuffix = user.id.slice(-6).toUpperCase()
            couponCode = `${prefix}-${userSuffix}-${currentYear}`

            // Idempotent: check if coupon already exists
            const existingCoupon = await prisma.coupon.findUnique({
              where: { code: couponCode },
            })

            if (existingCoupon) {
              couponId = existingCoupon.id
              couponCode = existingCoupon.code
              // Update coupon settings in case template changed
              const updatedExpiresAt = new Date()
              if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
                updatedExpiresAt.setTime(new Date(template.couponExpiresAt).getTime())
              } else {
                updatedExpiresAt.setDate(updatedExpiresAt.getDate() + (template.couponDuration || 30))
              }
              await prisma.coupon.update({
                where: { id: existingCoupon.id },
                data: {
                  expiresAt: updatedExpiresAt,
                  type: template.couponType,
                  value: template.couponValue,
                  currency: template.couponCurrency,
                  minPurchase: template.couponMinPurchase,
                  perUserLimit: template.couponPerUser,
                  productIds: template.couponProductIds,
                  allowOnSale: template.couponAllowOnSale,
                },
              })
            } else {
              const expiresAt = new Date()
              if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
                expiresAt.setTime(new Date(template.couponExpiresAt).getTime())
              } else {
                expiresAt.setDate(expiresAt.getDate() + (template.couponDuration || 30))
              }

              const coupon = await prisma.coupon.create({
                data: {
                  code: couponCode,
                  type: template.couponType,
                  value: template.couponValue,
                  currency: template.couponCurrency,
                  minPurchase: template.couponMinPurchase,
                  maxUses: 1,
                  perUserLimit: template.couponPerUser,
                  productIds: template.couponProductIds,
                  allowOnSale: template.couponAllowOnSale,
                  showOnProduct: false, // Auto-generated coupons don't show on product pages
                  active: true,
                  expiresAt,
                },
              })

              couponId = coupon.id
              result.couponsCreated++
            }

            couponValueStr = template.couponType === "percentage"
              ? `${template.couponValue}%`
              : `${template.couponValue} ${template.couponCurrency || "EUR"}`

            let expDate: Date
            if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
              expDate = new Date(template.couponExpiresAt)
            } else {
              expDate = new Date()
              expDate.setDate(expDate.getDate() + (template.couponDuration || 30))
            }
            expiresAtStr = expDate.toLocaleDateString("en-GB") // DD/MM/YYYY
          }

          // Resolve placeholders for each language
          const placeholderData = {
            name: user.name,
            couponCode,
            couponValue: couponValueStr,
            expiresAt: expiresAtStr,
          }

          const title = JSON.stringify({
            bg: resolvePlaceholders(template.titleBg, placeholderData),
            en: resolvePlaceholders(template.titleEn, placeholderData),
            es: resolvePlaceholders(template.titleEs, placeholderData),
          })

          const message = JSON.stringify({
            bg: resolvePlaceholders(template.messageBg, placeholderData),
            en: resolvePlaceholders(template.messageEn, placeholderData),
            es: resolvePlaceholders(template.messageEs, placeholderData),
          })

          // Create notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: notificationType,
              title,
              message,
              link: template.link,
              couponId: couponId || null,
            },
          })

          // Create send log entry
          await prisma.templateSendLog.create({
            data: {
              templateId: template.id,
              userId: user.id,
              year: currentYear,
              couponId: couponId || null,
            },
          })

          templateSentCount++
          result.sent++
        } catch (userError) {
          result.errors.push(
            `Template "${template.name}" user ${user.id}: ${userError instanceof Error ? userError.message : "Unknown error"}`
          )
        }
      }

      // Update template stats
      await prisma.notificationTemplate.update({
        where: { id: template.id },
        data: {
          lastRunAt: new Date(),
          lastRunCount: templateSentCount,
        },
      })
    } catch (templateError) {
      result.errors.push(
        `Template "${template.name}": ${templateError instanceof Error ? templateError.message : "Unknown error"}`
      )
    }
  }

  return result
}

/**
 * Test-send a notification template to a single user.
 * Bypasses dedup checks and always sends.
 */
export async function testSendTemplate(
  templateId: string,
  userId: string
): Promise<{ couponId?: string; notificationId: string }> {
  const template = await prisma.notificationTemplate.findUnique({
    where: { id: templateId },
  })

  if (!template) throw new Error("Template not found")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  })

  if (!user) throw new Error("User not found")

  const currentYear = new Date().getFullYear()
  let couponId: string | undefined
  let couponCode: string | undefined
  let couponValueStr: string | undefined
  let expiresAtStr: string | undefined

  // Create coupon if enabled
  if (template.couponEnabled && template.couponType && template.couponValue) {
    const prefix = COUPON_PREFIXES[template.trigger] || "TMPL"
    const userSuffix = user.id.slice(-6).toUpperCase()
    // Test sends use a slightly different code to avoid collisions with real cron
    couponCode = `${prefix}-${userSuffix}-${currentYear}T`

    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    })

    if (existingCoupon) {
      couponId = existingCoupon.id
      // Update coupon settings in case template changed
      const updatedExpiresAt = new Date()
      if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
        updatedExpiresAt.setTime(new Date(template.couponExpiresAt).getTime())
      } else {
        updatedExpiresAt.setDate(updatedExpiresAt.getDate() + (template.couponDuration || 30))
      }
      await prisma.coupon.update({
        where: { id: existingCoupon.id },
        data: {
          expiresAt: updatedExpiresAt,
          type: template.couponType,
          value: template.couponValue,
          currency: template.couponCurrency,
          minPurchase: template.couponMinPurchase,
          perUserLimit: template.couponPerUser,
          productIds: template.couponProductIds,
          allowOnSale: template.couponAllowOnSale,
        },
      })
    } else {
      const expiresAt = new Date()
      if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
        expiresAt.setTime(new Date(template.couponExpiresAt).getTime())
      } else {
        expiresAt.setDate(expiresAt.getDate() + (template.couponDuration || 30))
      }

      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          type: template.couponType,
          value: template.couponValue,
          currency: template.couponCurrency,
          minPurchase: template.couponMinPurchase,
          maxUses: 1,
          perUserLimit: template.couponPerUser,
          productIds: template.couponProductIds,
          allowOnSale: template.couponAllowOnSale,
          showOnProduct: false,
          active: true,
          expiresAt,
        },
      })

      couponId = coupon.id
    }

    couponValueStr = template.couponType === "percentage"
      ? `${template.couponValue}%`
      : `${template.couponValue} ${template.couponCurrency || "EUR"}`

    let expDateTest: Date
    if (template.couponExpiryMode === "date" && template.couponExpiresAt) {
      expDateTest = new Date(template.couponExpiresAt)
    } else {
      expDateTest = new Date()
      expDateTest.setDate(expDateTest.getDate() + (template.couponDuration || 30))
    }
    expiresAtStr = expDateTest.toLocaleDateString("en-GB")
  }

  const placeholderData = {
    name: user.name,
    couponCode,
    couponValue: couponValueStr,
    expiresAt: expiresAtStr,
  }

  const notificationType = getNotificationType(template.trigger)

  const title = JSON.stringify({
    bg: resolvePlaceholders(template.titleBg, placeholderData),
    en: resolvePlaceholders(template.titleEn, placeholderData),
    es: resolvePlaceholders(template.titleEs, placeholderData),
  })

  const message = JSON.stringify({
    bg: resolvePlaceholders(template.messageBg, placeholderData),
    en: resolvePlaceholders(template.messageEn, placeholderData),
    es: resolvePlaceholders(template.messageEs, placeholderData),
  })

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: notificationType,
      title,
      message,
      link: template.link,
      couponId: couponId || null,
    },
  })

  return { couponId, notificationId: notification.id }
}

/**
 * Process 48-hour coupon reminder notifications.
 * Finds notifications with coupons that were opened (read) but not yet used,
 * and whose coupon expires within the next 48 hours.
 */
export async function processReminderNotifications(): Promise<{
  sent: number
  errors: string[]
}> {
  const result = { sent: 0, errors: [] as string[] }
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  try {
    // Find notifications with coupons that were opened but not yet reminded
    const candidates = await prisma.notification.findMany({
      where: {
        couponId: { not: null },
        read: true,
        reminderSentAt: null,
        type: { in: ["auto_birthday", "auto_christmas", "auto_new_year", "auto_easter", "auto_custom", "coupon"] },
      },
      include: {
        coupon: { select: { id: true, code: true, type: true, value: true, currency: true, expiresAt: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    })

    for (const notification of candidates) {
      try {
        if (!notification.coupon?.expiresAt) continue
        const expiresAt = new Date(notification.coupon.expiresAt)

        // Check: expires within next 48 hours (not already expired)
        if (expiresAt <= now || expiresAt > in48h) continue

        // Check: coupon not yet used by this user
        const usage = await prisma.couponUsage.findFirst({
          where: { couponId: notification.coupon.id, email: notification.user.email },
        })
        if (usage) continue // Already used, skip

        // Build i18n reminder title/message
        const couponValueStr = notification.coupon.type === "percentage"
          ? `${notification.coupon.value}%`
          : `${notification.coupon.value} ${notification.coupon.currency || "EUR"}`

        const title = JSON.stringify({
          bg: "⏰ Не забравяй купона си!",
          en: "⏰ Don't forget your coupon!",
          es: "⏰ ¡No olvides tu cupón!",
        })
        const message = JSON.stringify({
          bg: `Купонът ти ${notification.coupon.code} за ${couponValueStr} изтича скоро! Използвай го преди да е късно.`,
          en: `Your coupon ${notification.coupon.code} for ${couponValueStr} expires soon! Use it before it's gone.`,
          es: `Tu cupón ${notification.coupon.code} por ${couponValueStr} expira pronto. ¡Úsalo antes de que caduque!`,
        })

        // Create reminder notification
        await prisma.notification.create({
          data: {
            userId: notification.userId,
            type: "coupon_reminder",
            title,
            message,
            link: notification.link,
            couponId: notification.couponId,
          },
        })

        // Mark original as reminded
        await prisma.notification.update({
          where: { id: notification.id },
          data: { reminderSentAt: now },
        })

        result.sent++
      } catch (err) {
        result.errors.push(`Reminder for notification ${notification.id}: ${err}`)
      }
    }
  } catch (err) {
    result.errors.push(`Reminder processing failed: ${err}`)
  }

  return result
}
