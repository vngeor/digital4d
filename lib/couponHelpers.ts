export function isCategoryMatch(
  productCategory: string,
  couponCategoryIds: string[],
  allCategories: { id: string; slug: string; parentId: string | null }[]
): boolean {
  if (couponCategoryIds.length === 0) return false
  if (couponCategoryIds.includes(productCategory)) return true
  // parentId on a category record is the parent's `id` (NOT slug)
  const cat = allCategories.find(c => c.slug === productCategory)
  if (!cat?.parentId) return false
  const parent = allCategories.find(c => c.id === cat.parentId)
  return !!(parent && couponCategoryIds.includes(parent.slug))
}

export function isProductEligibleForCoupon(
  productId: string,
  productCategory: string,
  productBrandId: string | null | undefined,
  couponProductIds: string[],
  couponCategoryIds: string[],
  couponBrandIds: string[],
  allCategories: { id: string; slug: string; parentId: string | null }[]
): boolean {
  const hasRestrictions =
    couponProductIds.length > 0 || couponCategoryIds.length > 0 || couponBrandIds.length > 0
  if (!hasRestrictions) return true
  if (couponProductIds.length > 0 && couponProductIds.includes(productId)) return true
  if (couponCategoryIds.length > 0 && isCategoryMatch(productCategory, couponCategoryIds, allCategories)) return true
  if (couponBrandIds.length > 0 && productBrandId && couponBrandIds.includes(productBrandId)) return true
  return false
}
