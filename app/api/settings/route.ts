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
      welcomePopupEnabled:    s?.welcomePopupEnabled    ?? false,
      welcomePopupTitleBg:    s?.welcomePopupTitleBg    ?? "",
      welcomePopupTitleEn:    s?.welcomePopupTitleEn    ?? "",
      welcomePopupTitleEs:    s?.welcomePopupTitleEs    ?? "",
      welcomePopupMessageBg:  s?.welcomePopupMessageBg  ?? "",
      welcomePopupMessageEn:  s?.welcomePopupMessageEn  ?? "",
      welcomePopupMessageEs:  s?.welcomePopupMessageEs  ?? "",
      welcomePopupImage:      s?.welcomePopupImage      ?? "",
      welcomePopupCouponCode: s?.welcomePopupCouponCode ?? "",
      welcomePopupDelay:      s?.welcomePopupDelay      ?? 2,
      welcomePopupLink:       s?.welcomePopupLink       ?? "",
      bulkDiscountEnabled:    s?.bulkDiscountEnabled    ?? false,
      bulkDiscountTiers:      s?.bulkDiscountTiers      ?? "[]",
    })
  } catch {
    // Graceful degradation — progress bar simply won't show
    return NextResponse.json({
      freeShippingEnabled: false, freeShippingThreshold: null, freeShippingCurrency: "EUR",
      upsellTabEnabled: true, upsellOpenOnAdd: "upsell",
      welcomePopupEnabled: false, welcomePopupTitleBg: "", welcomePopupTitleEn: "", welcomePopupTitleEs: "",
      welcomePopupMessageBg: "", welcomePopupMessageEn: "", welcomePopupMessageEs: "",
      welcomePopupImage: "", welcomePopupCouponCode: "", welcomePopupDelay: 2, welcomePopupLink: "",
      bulkDiscountEnabled: false, bulkDiscountTiers: "[]",
    })
  }
}
