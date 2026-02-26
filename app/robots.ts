import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digital4d.eu"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/login", "/profile", "/my-orders", "/checkout/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
