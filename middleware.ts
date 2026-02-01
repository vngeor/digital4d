import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale, countryToLocale, type Locale } from "./i18n/config"
import { auth } from "./auth"

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

export default auth(async function middleware(request: NextRequest) {
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
    const session = (request as any).auth

    if (!session?.user) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Check if user already has a locale preference cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value as Locale | undefined
  if (localeCookie && locales.includes(localeCookie)) {
    return NextResponse.next()
  }

  // Auto-detect locale
  let detectedLocale: Locale = defaultLocale

  // 1. Try to get country from Vercel/Cloudflare geo headers
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code")

  if (country) {
    detectedLocale = getLocaleFromCountry(country)
  } else {
    // 2. Fallback to Accept-Language header
    const acceptLanguage = request.headers.get("accept-language")
    const langLocale = getLocaleFromAcceptLanguage(acceptLanguage)
    if (langLocale) {
      detectedLocale = langLocale
    }
  }

  // Set the locale cookie
  const response = NextResponse.next()
  response.cookies.set("NEXT_LOCALE", detectedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  })

  return response
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
