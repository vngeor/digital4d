import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Inline config to avoid import bundling issues
const locales = ["bg", "en", "es"] as const
type Locale = (typeof locales)[number]
const defaultLocale: Locale = "bg"

const countryToLocale: Record<string, Locale> = {
  BG: "bg",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
  SV: "es", NI: "es", CR: "es", PA: "es", UY: "es",
}

function getLocaleFromCountry(countryCode: string | null): Locale {
  if (!countryCode) return defaultLocale
  return countryToLocale[countryCode.toUpperCase()] || "en"
}

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, priority = "q=1"] = lang.trim().split(";")
      const q = parseFloat(priority.split("=")[1] || "1")
      return { code: code.split("-")[0].toLowerCase(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const { code } of languages) {
    if (locales.includes(code as Locale)) {
      return code as Locale
    }
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, etc.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const sessionToken = request.cookies.get("authjs.session-token")?.value ||
                         request.cookies.get("__Secure-authjs.session-token")?.value
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Check existing locale cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value as Locale | undefined
  if (localeCookie && locales.includes(localeCookie)) {
    return NextResponse.next()
  }

  // Auto-detect locale
  let detectedLocale: Locale = defaultLocale
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code")

  if (country) {
    detectedLocale = getLocaleFromCountry(country)
  } else {
    const acceptLanguage = request.headers.get("accept-language")
    const langLocale = getLocaleFromAcceptLanguage(acceptLanguage)
    if (langLocale) {
      detectedLocale = langLocale
    }
  }

  // Set locale cookie
  const response = NextResponse.next()
  response.cookies.set("NEXT_LOCALE", detectedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}