/**
 * Backfill script to populate MediaFile table with existing uploaded images
 *
 * This script queries all image URLs from Products, Content, Banners, and Categories,
 * then creates MediaFile records for any URLs not already tracked in the database.
 *
 * For Vercel Blob URLs, it fetches file size from the blob listing.
 * For local uploads, it reads file size from disk.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-media.ts
 */

import { list } from "@vercel/blob"
import { stat } from "fs/promises"
import path from "path"
import prisma from "../lib/prisma"

interface BlobInfo {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(".public.blob.vercel-storage.com") || url.includes(".blob.vercel-storage.com")
}

function isLocalUploadUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith("/uploads/")
}

function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url, "https://placeholder.com")
    const pathname = urlObj.pathname
    return pathname.split("/").pop() || url
  } catch {
    return url.split("/").pop() || url
  }
}

function guessMimeType(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "webp": return "image/webp"
    case "png": return "image/png"
    case "jpg":
    case "jpeg": return "image/jpeg"
    case "gif": return "image/gif"
    default: return "image/webp" // most uploads are converted to webp
  }
}

async function listAllBlobs(): Promise<BlobInfo[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return []

  const allBlobs: BlobInfo[] = []
  let cursor: string | undefined

  do {
    const response = await list({ cursor, limit: 1000 })
    allBlobs.push(...response.blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    })))
    cursor = response.hasMore ? response.cursor : undefined
  } while (cursor)

  return allBlobs
}

async function collectAllImageUrls(): Promise<Set<string>> {
  const urls = new Set<string>()

  console.log("Collecting image URLs from database...")

  // Products: image, gallery
  const products = await prisma.product.findMany({
    select: { image: true, gallery: true }
  })
  for (const p of products) {
    if (p.image) urls.add(p.image)
    for (const g of p.gallery || []) {
      if (g) urls.add(g)
    }
  }
  console.log(`  Products: found image URLs`)

  // Content: image
  const contents = await prisma.content.findMany({
    select: { image: true }
  })
  for (const c of contents) {
    if (c.image) urls.add(c.image)
  }
  console.log(`  Content: found image URLs`)

  // Banner: image
  const banners = await prisma.banner.findMany({
    select: { image: true }
  })
  for (const b of banners) {
    if (b.image) urls.add(b.image)
  }
  console.log(`  Banners: found image URLs`)

  // ProductCategory: image
  const categories = await prisma.productCategory.findMany({
    select: { image: true }
  })
  for (const c of categories) {
    if (c.image) urls.add(c.image)
  }
  console.log(`  Categories: found image URLs`)

  return urls
}

async function main() {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Media Gallery Backfill Script`)
  console.log(`${"=".repeat(60)}\n`)

  // Step 1: Collect all image URLs from DB
  const allUrls = await collectAllImageUrls()

  // Filter to only Vercel Blob or local upload URLs (skip external URLs)
  const trackableUrls = new Set<string>()
  for (const url of allUrls) {
    if (isVercelBlobUrl(url) || isLocalUploadUrl(url)) {
      trackableUrls.add(url)
    }
  }

  console.log(`\nFound ${allUrls.size} total URLs, ${trackableUrls.size} are trackable (blob/local)`)

  // Step 2: Check which ones already exist in MediaFile table
  const existingMedia = await prisma.mediaFile.findMany({
    select: { url: true }
  })
  const existingUrls = new Set(existingMedia.map(m => m.url))

  const newUrls = [...trackableUrls].filter(url => !existingUrls.has(url))
  console.log(`${existingUrls.size} already tracked, ${newUrls.length} new to add\n`)

  if (newUrls.length === 0) {
    console.log("Nothing to backfill. All images are already tracked!")
    process.exit(0)
  }

  // Step 3: Build blob metadata map (for Vercel Blob URLs)
  let blobMap = new Map<string, BlobInfo>()
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("Fetching blob metadata from Vercel...")
    const blobs = await listAllBlobs()
    for (const blob of blobs) {
      blobMap.set(blob.url, blob)
    }
    console.log(`  Loaded metadata for ${blobMap.size} blobs`)
  }

  // Step 4: Create MediaFile records
  let created = 0
  let failed = 0

  for (const url of newUrls) {
    try {
      let size = 0
      let createdAt = new Date()

      if (isVercelBlobUrl(url)) {
        const blobInfo = blobMap.get(url)
        if (blobInfo) {
          size = blobInfo.size
          createdAt = blobInfo.uploadedAt
        }
      } else if (isLocalUploadUrl(url)) {
        try {
          const localPath = path.join(process.cwd(), "public", url)
          const fileStat = await stat(localPath)
          size = fileStat.size
          createdAt = fileStat.birthtime
        } catch {
          // File might not exist locally
        }
      }

      await prisma.mediaFile.create({
        data: {
          url,
          filename: extractFilename(url),
          mimeType: guessMimeType(url),
          size,
          width: null,
          height: null,
          uploadedById: null,
          createdAt,
        },
      })

      created++
      console.log(`  + ${extractFilename(url)} (${size > 0 ? formatBytes(size) : "unknown size"})`)
    } catch (error) {
      failed++
      const msg = error instanceof Error ? error.message : String(error)
      // Skip duplicate URL errors (unique constraint)
      if (msg.includes("Unique constraint")) {
        console.log(`  ~ ${extractFilename(url)} (already exists)`)
      } else {
        console.log(`  ! ${extractFilename(url)} - Error: ${msg}`)
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Results: ${created} created, ${failed} failed/skipped`)
  console.log(`${"=".repeat(60)}\n`)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
