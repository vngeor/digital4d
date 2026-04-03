import { requirePermissionApi } from "@/lib/admin"
import prisma from "@/lib/prisma"

function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export async function GET() {
  try {
    const { error } = await requirePermissionApi("products", "view")
    if (error) return error

    const products = await prisma.product.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { brand: true },
    })

    const headers = [
      "SKU", "Name (EN)", "Name (BG)", "Name (ES)",
      "Category", "Brand", "Type", "Status",
      "Price", "Sale Price", "On Sale", "Price Type", "Currency",
      "Featured", "Best Seller", "Published",
      "Tags", "Created At", "Slug",
    ]

    const rows = products.map(p => [
      p.sku ?? "",
      p.nameEn,
      p.nameBg,
      p.nameEs,
      p.category,
      p.brand?.nameEn ?? "",
      p.fileType ?? "physical",
      p.status,
      p.price?.toString() ?? "",
      p.salePrice?.toString() ?? "",
      p.onSale ? "yes" : "no",
      p.priceType,
      p.currency,
      p.featured ? "yes" : "no",
      p.bestSeller ? "yes" : "no",
      p.published ? "yes" : "no",
      p.tags.join("|"),
      p.createdAt.toISOString(),
      p.slug,
    ].map(escapeCell).join(","))

    const csv = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows].join("\n")
    const date = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting products:", error instanceof Error ? error.message : "Unknown")
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
