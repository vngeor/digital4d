import { put, del, list } from "@vercel/blob"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"

// Check if we should use local storage
const useLocalStorage = !process.env.BLOB_READ_WRITE_TOKEN || process.env.USE_LOCAL_UPLOADS === "true"

/**
 * Check if a URL is a Vercel Blob URL
 */
export function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(".public.blob.vercel-storage.com") || url.includes(".blob.vercel-storage.com")
}

/**
 * Check if a URL is a local upload URL
 */
export function isLocalUploadUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith("/uploads/")
}

/**
 * Upload a file to Vercel Blob with local fallback
 */
export async function uploadBlob(
  buffer: Buffer | File,
  filename: string,
  options?: {
    access?: "public"
    contentType?: string
    folder?: string
  }
): Promise<string> {
  const folder = options?.folder || ""
  const blobPath = folder ? `${folder}/${filename}` : filename

  if (useLocalStorage) {
    return uploadToLocal(buffer, blobPath)
  }

  try {
    const blob = await put(blobPath, buffer, {
      access: options?.access || "public",
      contentType: options?.contentType,
    })
    console.log("File uploaded to Vercel Blob:", blob.url)
    return blob.url
  } catch (error) {
    console.warn("Vercel Blob upload failed, falling back to local storage:", error)
    return uploadToLocal(buffer, blobPath)
  }
}

/**
 * Upload to local storage
 */
async function uploadToLocal(buffer: Buffer | File, relativePath: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  const fullPath = path.join(uploadsDir, relativePath)
  const dir = path.dirname(fullPath)

  // Create directory if it doesn't exist
  await mkdir(dir, { recursive: true })

  // Convert File to Buffer if needed
  const data = buffer instanceof File ? Buffer.from(await buffer.arrayBuffer()) : buffer

  await writeFile(fullPath, data)
  console.log("File uploaded locally:", `/uploads/${relativePath}`)

  return `/uploads/${relativePath}`
}

/**
 * Safely delete a blob (ignores "not found" errors)
 */
export async function deleteBlobSafe(url: string | null | undefined): Promise<boolean> {
  if (!url) return false

  try {
    if (isVercelBlobUrl(url)) {
      await del(url)
      console.log("Deleted blob:", url)
      return true
    } else if (isLocalUploadUrl(url)) {
      const localPath = path.join(process.cwd(), "public", url)
      await unlink(localPath)
      console.log("Deleted local file:", url)
      return true
    }
    return false
  } catch (error) {
    // Ignore "not found" errors - the file may have already been deleted
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("not found") || errorMessage.includes("ENOENT")) {
      console.log("File already deleted or not found:", url)
      return false
    }
    console.error("Error deleting blob:", url, error)
    return false
  }
}

/**
 * Delete multiple blobs in batch
 */
export async function deleteBlobsBatch(urls: (string | null | undefined)[]): Promise<{ deleted: number; failed: number }> {
  const validUrls = urls.filter((url): url is string => !!url)

  const results = await Promise.allSettled(
    validUrls.map(url => deleteBlobSafe(url))
  )

  const deleted = results.filter(r => r.status === "fulfilled" && r.value === true).length
  const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && r.value === false)).length

  console.log(`Batch delete complete: ${deleted} deleted, ${failed} failed/skipped`)
  return { deleted, failed }
}

/**
 * List all blobs in the store (for cleanup scripts)
 */
export async function listAllBlobs(): Promise<{ url: string; pathname: string; size: number; uploadedAt: Date }[]> {
  if (useLocalStorage) {
    console.warn("listAllBlobs is not available in local storage mode")
    return []
  }

  const allBlobs: { url: string; pathname: string; size: number; uploadedAt: Date }[] = []
  let cursor: string | undefined

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
