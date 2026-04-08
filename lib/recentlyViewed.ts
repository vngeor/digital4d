export const RECENTLY_VIEWED_KEY = "d4d-recently-viewed"
export const MAX_RECENTLY_VIEWED = 10

export interface RecentlyViewedProduct {
  id: string
  productUrl: string
  nameEn: string
  nameBg: string
  nameEs: string
  descEn: string | null
  descBg: string | null
  descEs: string | null
  image: string | null
  price: string
  salePrice: string | null
  onSale: boolean
  currency: string
  priceType: string
  fileType: string | null
  category: string
  categoryColor: string
  categoryNameEn: string
  categoryNameBg: string
  categoryNameEs: string
  status: string
  featured: boolean
  bestSeller: boolean
  isNew: boolean
  brandNameEn: string | null
  brandNameBg: string | null
  brandNameEs: string | null
  brandSlug: string | null
  bulkDiscountTiers?: string | null
  slug?: string
  createdAt?: string
  gallery?: string[]
  variants?: Array<{
    id: string
    image: string | null
    status: string
    colorId: string
    color: { nameBg: string; nameEn: string; nameEs: string; hex: string; hex2?: string | null }
  }>
  packages?: Array<{
    id: string
    price: string
    salePrice: string | null
    status: string
    weight: { label: string }
    packageVariants: { variantId: string; status: string }[]
    bulkDiscountTiers?: string | null
  }>
  viewedAt: number
}

export function trackRecentlyViewed(product: RecentlyViewedProduct): void {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
    const list: RecentlyViewedProduct[] = stored ? JSON.parse(stored) : []
    const filtered = list.filter(p => p.id !== product.id)
    const updated = [product, ...filtered].slice(0, MAX_RECENTLY_VIEWED)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  } catch { /* localStorage unavailable */ }
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}
