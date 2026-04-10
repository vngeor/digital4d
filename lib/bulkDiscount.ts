export interface BulkTier {
  minQty: number
  type: "percentage" | "fixed"
  value: number // percent (1-100) or EUR amount
}

// Returns the highest applicable tier for the given quantity
export function getActiveTier(qty: number, tiers: BulkTier[]): BulkTier | null {
  const eligible = tiers.filter(t => qty >= t.minQty)
  if (!eligible.length) return null
  return eligible.reduce((best, t) => t.minQty > best.minQty ? t : best)
}

// Applies tier discount to effective unit price (already sale-price-aware)
// Percentage capped at MAX_BULK_DISCOUNT_PCT to prevent free/negative prices
const MAX_BULK_DISCOUNT_PCT = 95
export function applyBulkDiscount(effectiveUnitPrice: number, tier: BulkTier): number {
  if (tier.type === "percentage") {
    const pct = Math.min(tier.value, MAX_BULK_DISCOUNT_PCT)
    return effectiveUnitPrice * (1 - pct / 100)
  }
  return Math.max(0, effectiveUnitPrice - tier.value)
}

// "4+ units: -5%" or "4+ units: -0.50 EUR"
export function formatTierBadge(tier: BulkTier, currency = "EUR"): string {
  const discount = tier.type === "percentage" ? `-${tier.value}%` : `-${tier.value.toFixed(2)} ${currency}`
  return `${tier.minQty}+ units: ${discount}`
}

// Returns the entry-level tier (lowest minQty) for badge display
export function getBestEntryTier(tiers: BulkTier[]): BulkTier | null {
  if (!tiers.length) return null
  return tiers.reduce((best, t) => t.minQty < best.minQty ? t : best)
}

export function parseTiers(json: string): BulkTier[] {
  try {
    const t = JSON.parse(json)
    return Array.isArray(t) ? t : []
  } catch {
    return []
  }
}
