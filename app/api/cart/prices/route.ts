import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * GET /api/cart/prices?items=productId1,productId2:packageId
 * Returns current prices for given product/package combinations.
 * Used by CartDrawer to refresh stale cart item prices.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("items") || ""
  if (!raw) return NextResponse.json([])

  const pairs = raw
    .split(",")
    .slice(0, 50)
    .map((s) => {
      const [productId, packageId] = s.split(":")
      return { productId: productId?.trim(), packageId: packageId?.trim() || null }
    })
    .filter((p) => p.productId)

  if (pairs.length === 0) return NextResponse.json([])

  const productIds = [...new Set(pairs.map((p) => p.productId))]
  const packageIds = pairs.map((p) => p.packageId).filter(Boolean) as string[]

  const [products, packages] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, published: true },
      select: {
        id: true,
        price: true,
        salePrice: true,
        onSale: true,
        bulkDiscountTiers: true,
        bulkDiscountExpiresAt: true,
        currency: true,
      },
    }),
    packageIds.length > 0
      ? prisma.productPackage.findMany({
          where: { id: { in: packageIds } },
          select: { id: true, productId: true, price: true, salePrice: true },
        })
      : Promise.resolve([]),
  ])

  const result = pairs
    .map(({ productId, packageId }) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return null

      const pkg = packageId
        ? packages.find((p) => p.id === packageId && p.productId === productId)
        : null

      const price = pkg
        ? parseFloat(pkg.price.toString())
        : product.price
          ? parseFloat(product.price.toString())
          : null

      const salePrice = pkg
        ? pkg.salePrice ? parseFloat(pkg.salePrice.toString()) : null
        : product.onSale && product.salePrice
          ? parseFloat(product.salePrice.toString())
          : null

      const onSale = pkg ? !!pkg.salePrice : (product.onSale && !!product.salePrice)

      return {
        productId,
        packageId,
        price: price != null ? price.toFixed(2) : null,
        salePrice: salePrice != null ? salePrice.toFixed(2) : null,
        onSale,
        bulkDiscountTiers: (product as { bulkDiscountTiers?: string }).bulkDiscountTiers || "",
        bulkDiscountExpiresAt: (product as { bulkDiscountExpiresAt?: Date | null }).bulkDiscountExpiresAt
          ? (product as { bulkDiscountExpiresAt: Date }).bulkDiscountExpiresAt.toISOString()
          : null,
        currency: product.currency || "EUR",
      }
    })
    .filter(Boolean)

  return NextResponse.json(result)
}
