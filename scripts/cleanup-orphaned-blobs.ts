/**
 * Cleanup script for orphaned Vercel Blob files
 *
 * This script lists all blobs in Vercel Blob store, queries the database
 * for all valid blob URLs, and deletes any orphaned blobs.
 *
 * Usage:
 *   npm run blob:cleanup       - Delete orphaned blobs
 *   npm run blob:cleanup:dry   - Dry run (list orphaned blobs without deleting)
 */

import { list, del } from "@vercel/blob"
import prisma from "../lib/prisma"

const isDryRun = process.argv.includes("--dry-run")

interface BlobInfo {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

/**
 * Check if a URL is a Vercel Blob URL
 */
function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(".public.blob.vercel-storage.com") || url.includes(".blob.vercel-storage.com")
}

/**
 * List all blobs in the Vercel Blob store
 */
async function listAllBlobs(): Promise<BlobInfo[]> {
  const allBlobs: BlobInfo[] = []
  let cursor: string | undefined

  console.log("Fetching all blobs from Vercel Blob store...")

  do {
    const response = await list({ cursor, limit: 1000 })
    allBlobs.push(...response.blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    })))
    cursor = response.hasMore ? response.cursor : undefined
  } while (cursor)

  return allBlobs
}

/**
 * Get all valid blob URLs from the database
 */
async function getValidBlobUrls(): Promise<Set<string>> {
  const validUrls = new Set<string>()

  console.log("Fetching valid blob URLs from database...")

  // Products: image, gallery, fileUrl
  const products = await prisma.product.findMany({
    select: { image: true, gallery: true, fileUrl: true }
  })
  for (const product of products) {
    if (isVercelBlobUrl(product.image)) validUrls.add(product.image!)
    if (isVercelBlobUrl(product.fileUrl)) validUrls.add(product.fileUrl!)
    for (const galleryUrl of product.gallery || []) {
      if (isVercelBlobUrl(galleryUrl)) validUrls.add(galleryUrl)
    }
  }

  // QuoteRequests: fileUrl
  const quotes = await prisma.quoteRequest.findMany({
    select: { fileUrl: true }
  })
  for (const quote of quotes) {
    if (isVercelBlobUrl(quote.fileUrl)) validUrls.add(quote.fileUrl!)
  }

  // Content: image
  const contents = await prisma.content.findMany({
    select: { image: true }
  })
  for (const content of contents) {
    if (isVercelBlobUrl(content.image)) validUrls.add(content.image!)
  }

  // ProductCategory: image
  const categories = await prisma.productCategory.findMany({
    select: { image: true }
  })
  for (const category of categories) {
    if (isVercelBlobUrl(category.image)) validUrls.add(category.image!)
  }

  // Banner: image
  const banners = await prisma.banner.findMany({
    select: { image: true }
  })
  for (const banner of banners) {
    if (isVercelBlobUrl(banner.image)) validUrls.add(banner.image!)
  }

  return validUrls
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

async function main() {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Vercel Blob Cleanup Script`)
  console.log(`  Mode: ${isDryRun ? "DRY RUN (no deletions)" : "LIVE (will delete)"}`)
  console.log(`${"=".repeat(60)}\n`)

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Error: BLOB_READ_WRITE_TOKEN is not set")
    process.exit(1)
  }

  // Get all blobs and valid URLs
  const [allBlobs, validUrls] = await Promise.all([
    listAllBlobs(),
    getValidBlobUrls()
  ])

  console.log(`\nFound ${allBlobs.length} blobs in Vercel Blob store`)
  console.log(`Found ${validUrls.size} valid blob URLs in database\n`)

  // Find orphaned blobs
  const orphanedBlobs = allBlobs.filter(blob => !validUrls.has(blob.url))

  if (orphanedBlobs.length === 0) {
    console.log("No orphaned blobs found. Everything is clean!")
    return
  }

  const totalSize = orphanedBlobs.reduce((sum, blob) => sum + blob.size, 0)

  console.log(`Found ${orphanedBlobs.length} orphaned blobs (${formatBytes(totalSize)} total):\n`)

  // List orphaned blobs
  for (const blob of orphanedBlobs) {
    const uploadDate = blob.uploadedAt.toISOString().split("T")[0]
    console.log(`  - ${blob.pathname}`)
    console.log(`    Size: ${formatBytes(blob.size)}, Uploaded: ${uploadDate}`)
    console.log(`    URL: ${blob.url}`)
  }

  if (isDryRun) {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`  DRY RUN COMPLETE`)
    console.log(`  ${orphanedBlobs.length} blobs would be deleted (${formatBytes(totalSize)})`)
    console.log(`  Run without --dry-run to delete these blobs`)
    console.log(`${"=".repeat(60)}\n`)
    return
  }

  // Delete orphaned blobs
  console.log(`\nDeleting ${orphanedBlobs.length} orphaned blobs...`)

  let deleted = 0
  let failed = 0

  for (const blob of orphanedBlobs) {
    try {
      await del(blob.url)
      deleted++
      console.log(`  Deleted: ${blob.pathname}`)
    } catch (error) {
      failed++
      console.error(`  Failed to delete ${blob.pathname}:`, error)
    }
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  CLEANUP COMPLETE`)
  console.log(`  Deleted: ${deleted} blobs`)
  console.log(`  Failed: ${failed} blobs`)
  console.log(`  Storage freed: ~${formatBytes(totalSize)}`)
  console.log(`${"=".repeat(60)}\n`)
}

main()
  .catch(error => {
    console.error("Script failed:", error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })