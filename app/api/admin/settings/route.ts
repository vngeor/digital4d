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
    const { freeShippingEnabled, freeShippingThreshold, freeShippingCurrency, upsellTabEnabled, upsellOpenOnAdd, globalUpsellProductIds } = body
    const data = {
      freeShippingEnabled: Boolean(freeShippingEnabled),
      freeShippingThreshold: freeShippingThreshold != null ? parseFloat(String(freeShippingThreshold)) : null,
      freeShippingCurrency: freeShippingCurrency ?? "EUR",
      upsellTabEnabled: Boolean(upsellTabEnabled),
      upsellOpenOnAdd: upsellOpenOnAdd === "cart" ? "cart" : "upsell",
      globalUpsellProductIds: Array.isArray(globalUpsellProductIds) ? globalUpsellProductIds : [],
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
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Settings PUT error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
