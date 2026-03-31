import prisma from "@/lib/prisma"
import { buildProductUrl } from "@/lib/productUrl"

const COOLDOWN_HOURS = 24

async function isOnCooldown(userId: string, productId: string, type: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)
  const recent = await prisma.wishlistNotificationLog.findFirst({
    where: {
      userId,
      productId,
      type,
      createdAt: { gte: cutoff },
    },
  })
  return !!recent
}

/**
 * Notify wishlist users about a price drop on a product.
 * Called from PUT /api/admin/products when price decreases or onSale changes.
 */
export async function notifyWishlistPriceDrop(
  productId: string,
  productSlug: string,
  productNames: { nameBg: string; nameEn: string; nameEs: string },
  oldPrice: number | null,
  newPrice: number | null,
  isNowOnSale: boolean,
  salePrice: number | null,
  currency: string,
  productUrl?: string
): Promise<number> {
  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { productId },
    select: { userId: true },
  })

  if (wishlistItems.length === 0) return 0

  let createdCount = 0
  const effectiveNewPrice = isNowOnSale && salePrice ? salePrice : newPrice

  for (const item of wishlistItems) {
    const onCooldown = await isOnCooldown(item.userId, productId, "price_drop")
    if (onCooldown) continue

    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: "wishlist_price_drop",
        title: JSON.stringify({ bg: productNames.nameBg, en: productNames.nameEn, es: productNames.nameEs }),
        message: JSON.stringify({
          oldPrice: oldPrice ? oldPrice.toFixed(2) : null,
          newPrice: effectiveNewPrice ? effectiveNewPrice.toFixed(2) : null,
          currency,
          onSale: isNowOnSale,
        }),
        link: productUrl || `/products/${productSlug}`,
        productId,
      },
    })

    await prisma.wishlistNotificationLog.create({
      data: {
        userId: item.userId,
        productId,
        type: "price_drop",
      },
    })

    createdCount++
  }

  return createdCount
}

/**
 * Notify wishlist users when a coupon applies to their wishlisted products.
 * Called from POST/PUT /api/admin/coupons when a coupon is created or activated.
 */
export async function notifyWishlistCoupon(
  couponId: string,
  couponCode: string,
  couponType: string,
  couponValue: number,
  couponCurrency: string | null,
  productIds: string[]
): Promise<number> {
  let wishlistItems: Array<{ userId: string; productId: string }>

  if (productIds.length > 0) {
    wishlistItems = await prisma.wishlistItem.findMany({
      where: { productId: { in: productIds } },
      select: { userId: true, productId: true },
    })
  } else {
    wishlistItems = await prisma.wishlistItem.findMany({
      select: { userId: true, productId: true },
    })
  }

  if (wishlistItems.length === 0) return 0

  // Deduplicate by userId — one notification per user
  const userProductMap = new Map<string, string[]>()
  for (const item of wishlistItems) {
    if (!userProductMap.has(item.userId)) {
      userProductMap.set(item.userId, [])
    }
    userProductMap.get(item.userId)!.push(item.productId)
  }

  let createdCount = 0

  for (const [userId, userProductIds] of userProductMap) {
    const onCooldown = await isOnCooldown(userId, userProductIds[0], "coupon")
    if (onCooldown) continue

    await prisma.notification.create({
      data: {
        userId,
        type: "wishlist_coupon",
        title: JSON.stringify({
          code: couponCode,
          type: couponType,
          value: couponValue,
          currency: couponCurrency,
        }),
        message: "",
        link: "/wishlist",
        couponId,
      },
    })

    for (const pid of userProductIds) {
      await prisma.wishlistNotificationLog.create({
        data: {
          userId,
          productId: pid,
          type: "coupon",
        },
      })
    }

    createdCount++
  }

  return createdCount
}

/**
 * Notify wishlist users when a product becomes available (status changes to in_stock).
 * Called from PUT /api/admin/products when status transitions to in_stock.
 */
export async function notifyStockAvailable(
  productId: string,
  productSlug: string,
  productNames: { nameBg: string; nameEn: string; nameEs: string },
  productUrl?: string
): Promise<number> {
  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { productId },
    select: { userId: true },
  })

  if (wishlistItems.length === 0) return 0

  let createdCount = 0

  for (const item of wishlistItems) {
    // No cooldown for stock notifications — admin explicitly changing status should always notify
    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: "stock_available",
        title: JSON.stringify({ bg: productNames.nameBg, en: productNames.nameEn, es: productNames.nameEs }),
        message: JSON.stringify({
          bg: `Страхотна новина! ${productNames.nameBg} вече е наличен и готов за поръчка.`,
          en: `Great news! ${productNames.nameEn} is now available and ready to order.`,
          es: `¡Buenas noticias! ${productNames.nameEs} ya está disponible y listo para pedir.`,
        }),
        link: productUrl || `/products/${productSlug}`,
        productId,
      },
    })

    createdCount++
  }

  return createdCount
}
