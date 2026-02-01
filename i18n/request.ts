import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { locales, defaultLocale, type Locale } from "./config"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined

  const locale = localeCookie && locales.includes(localeCookie)
    ? localeCookie
    : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
