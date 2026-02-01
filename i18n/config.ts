export const locales = ["bg", "en", "es"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "bg"

export const localeNames: Record<Locale, string> = {
  bg: "Български",
  en: "English",
  es: "Español",
}

export const localeFlags: Record<Locale, string> = {
  bg: "🇧🇬",
  en: "🇬🇧",
  es: "🇪🇸",
}

// Country code to locale mapping for IP detection
export const countryToLocale: Record<string, Locale> = {
  // Bulgarian
  BG: "bg",
  // Spanish-speaking countries
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  // Default to English for all others
}
