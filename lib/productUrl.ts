import prisma from "@/lib/prisma"

/**
 * Build a hierarchical product URL from known data.
 * Pattern: /products/[parentCategory?]/[category]/[brand?]/[productSlug]
 */
export function buildProductUrl(
  productSlug: string,
  categorySlug: string,
  brandSlug?: string | null,
  parentCategorySlug?: string | null
): string {
  const segments = ["/products"]
  if (parentCategorySlug) segments.push(parentCategorySlug)
  segments.push(categorySlug)
  if (brandSlug) segments.push(brandSlug)
  segments.push(productSlug)
  return segments.join("/")
}

/**
 * Build hierarchical product URL with DB lookup for category parent.
 * Use this server-side when you only have the product data.
 */
export async function buildProductUrlFromDb(product: {
  slug: string
  category: string
  brand?: { slug: string } | null
}): Promise<string> {
  const category = await prisma.productCategory.findFirst({
    where: { slug: product.category },
    select: { parent: { select: { slug: true } } },
  })

  return buildProductUrl(
    product.slug,
    product.category,
    product.brand?.slug,
    category?.parent?.slug
  )
}

/**
 * Build product URLs in batch (efficient — single category query).
 * Use for listing pages where many products need URLs.
 */
export async function buildProductUrlsBatch(
  products: Array<{
    id: string
    slug: string
    category: string
    brand?: { slug: string } | null
  }>
): Promise<Record<string, string>> {
  // Fetch all categories with parents in one query
  const categories = await prisma.productCategory.findMany({
    select: { slug: true, parent: { select: { slug: true } } },
  })

  const categoryParentMap = new Map<string, string | null>()
  for (const cat of categories) {
    categoryParentMap.set(cat.slug, cat.parent?.slug || null)
  }

  const urlMap: Record<string, string> = {}
  for (const product of products) {
    urlMap[product.id] = buildProductUrl(
      product.slug,
      product.category,
      product.brand?.slug,
      categoryParentMap.get(product.category)
    )
  }

  return urlMap
}
