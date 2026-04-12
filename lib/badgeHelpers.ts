import { parseTiers } from "@/lib/bulkDiscount"

export function computeDiscountPercent(
  price: string | null | undefined,
  salePrice: string | null | undefined,
): number {
  const orig = parseFloat(price || "0")
  const sale = parseFloat(salePrice || "0")
  if (!orig || !sale || orig <= 0) return 0
  return Math.max(0, Math.round((1 - sale / orig) * 100))
}

export function computeHasBulkDiscount(
  bulkDiscountTiers: string | null | undefined,
  packages?: Array<{ bulkDiscountTiers?: string | null }>,
  expiresAt?: string | Date | null,
): boolean {
  if (expiresAt && new Date(expiresAt) <= new Date()) return false
  return (
    parseTiers(bulkDiscountTiers || "").length > 0 ||
    (packages?.some(p => parseTiers(p.bulkDiscountTiers || "").length > 0) ?? false)
  )
}

export function computeIsNew(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
}
