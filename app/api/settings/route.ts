import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
    return NextResponse.json({
      freeShippingEnabled: s?.freeShippingEnabled ?? false,
      freeShippingThreshold: s?.freeShippingThreshold ?? null,
      freeShippingCurrency: s?.freeShippingCurrency ?? "EUR",
      upsellTabEnabled: s?.upsellTabEnabled ?? true,
      upsellOpenOnAdd: s?.upsellOpenOnAdd ?? "upsell",
    })
  } catch {
    // Graceful degradation — progress bar simply won't show
    return NextResponse.json({ freeShippingEnabled: false, freeShippingThreshold: null, freeShippingCurrency: "EUR", upsellTabEnabled: true, upsellOpenOnAdd: "upsell" })
  }
}
