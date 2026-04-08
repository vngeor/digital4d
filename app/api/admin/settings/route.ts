import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"

export async function GET() {
  try {
    const { error } = await requirePermissionApi("settings", "view")
    if (error) return error
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
    return NextResponse.json({
      freeShippingEnabled: s?.freeShippingEnabled ?? false,
      freeShippingThreshold: s?.freeShippingThreshold ?? null,
      freeShippingCurrency: s?.freeShippingCurrency ?? "EUR",
      upsellTabEnabled: s?.upsellTabEnabled ?? true,
      upsellOpenOnAdd: s?.upsellOpenOnAdd ?? "upsell",
      globalUpsellProductIds: s?.globalUpsellProductIds ?? [],
      bulkDiscountEnabled: s?.bulkDiscountEnabled ?? false,
      bulkDiscountTiers: s?.bulkDiscountTiers ?? "[]",
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Settings GET error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error } = await requirePermissionApi("settings", "edit")
    if (error) return error
    const body = await request.json()
    const { freeShippingEnabled, freeShippingThreshold, freeShippingCurrency, upsellTabEnabled, upsellOpenOnAdd, globalUpsellProductIds, bulkDiscountEnabled, bulkDiscountTiers } = body
    const data = {
      freeShippingEnabled: Boolean(freeShippingEnabled),
      freeShippingThreshold: freeShippingThreshold != null ? parseFloat(String(freeShippingThreshold)) : null,
      freeShippingCurrency: freeShippingCurrency ?? "EUR",
      upsellTabEnabled: Boolean(upsellTabEnabled),
      upsellOpenOnAdd: upsellOpenOnAdd === "cart" ? "cart" : "upsell",
      globalUpsellProductIds: Array.isArray(globalUpsellProductIds) ? globalUpsellProductIds : [],
      bulkDiscountEnabled: Boolean(bulkDiscountEnabled),
      bulkDiscountTiers: (() => {
        try {
          const tiers = JSON.parse(String(bulkDiscountTiers ?? "[]"))
          if (!Array.isArray(tiers)) return "[]"
          return JSON.stringify(
            tiers
              .filter((t: { minQty: unknown; type: unknown; value: unknown }) =>
                typeof t.minQty === "number" && t.minQty >= 1 &&
                (t.type === "percentage" || t.type === "fixed") &&
                typeof t.value === "number" && t.value > 0
              )
              .map((t: { minQty: number; type: "percentage" | "fixed"; value: number }) => ({
                minQty: Math.round(t.minQty),
                type: t.type,
                value: t.type === "percentage" ? Math.min(100, Number(t.value.toFixed(2))) : Number(t.value.toFixed(2)),
              }))
              .sort((a: { minQty: number }, b: { minQty: number }) => a.minQty - b.minQty)
          )
        } catch { return "[]" }
      })(),
    }

    const existing = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
    const s = existing
      ? await prisma.siteSettings.update({ where: { id: "singleton" }, data })
      : await prisma.siteSettings.create({ data: { id: "singleton", ...data } })

    return NextResponse.json({
      freeShippingEnabled: s.freeShippingEnabled,
      freeShippingThreshold: s.freeShippingThreshold ?? null,
      freeShippingCurrency: s.freeShippingCurrency,
      upsellTabEnabled: s.upsellTabEnabled,
      upsellOpenOnAdd: s.upsellOpenOnAdd,
      globalUpsellProductIds: s.globalUpsellProductIds,
      bulkDiscountEnabled: s.bulkDiscountEnabled,
      bulkDiscountTiers: s.bulkDiscountTiers,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Settings PUT error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
