import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digital4d.eu"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]

  // Published products
  const products = await prisma.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  })

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  // Published news
  const newsItems = await prisma.content.findMany({
    where: { type: "news", published: true },
    select: { slug: true, updatedAt: true },
  })

  const newsPages: MetadataRoute.Sitemap = newsItems
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${BASE_URL}/news/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

  // Published services
  const serviceItems = await prisma.content.findMany({
    where: { type: "service", published: true },
    select: { slug: true, updatedAt: true },
  })

  const servicePages: MetadataRoute.Sitemap = serviceItems
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${BASE_URL}/services/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

  // Published menu items (dynamic sections like /about, /contact)
  const menuItems = await prisma.menuItem.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  })

  const menuPages: MetadataRoute.Sitemap = menuItems.map((item) => ({
    url: `${BASE_URL}/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }))

  // Content linked to menu items (e.g., /about/team)
  const menuContent = await prisma.content.findMany({
    where: {
      menuItemId: { not: null },
      published: true,
    },
    select: {
      slug: true,
      updatedAt: true,
      menuItem: { select: { slug: true } },
    },
  })

  const menuContentPages: MetadataRoute.Sitemap = menuContent
    .filter((item) => item.slug && item.menuItem?.slug)
    .map((item) => ({
      url: `${BASE_URL}/${item.menuItem!.slug}/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }))

  // Content linked to content types (not news/service, no menuItemId)
  const customTypeContent = await prisma.content.findMany({
    where: {
      menuItemId: null,
      published: true,
      type: { notIn: ["news", "service"] },
    },
    select: { slug: true, type: true, updatedAt: true },
  })

  const customTypePages: MetadataRoute.Sitemap = customTypeContent
    .filter((item) => item.slug && item.type)
    .map((item) => ({
      url: `${BASE_URL}/${item.type}/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }))

  return [
    ...staticPages,
    ...productPages,
    ...newsPages,
    ...servicePages,
    ...menuPages,
    ...menuContentPages,
    ...customTypePages,
  ]
}
