import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import sharp from "sharp"

// Check if we should use local storage
const useLocalStorage = !process.env.BLOB_READ_WRITE_TOKEN || process.env.USE_LOCAL_UPLOADS === "true"

// Image compression settings
const MAX_WIDTH = 1920  // Max width for images
const JPEG_QUALITY = 80
const WEBP_QUALITY = 80
const PNG_COMPRESSION = 9

async function compressImage(buffer: Buffer, mimeType: string): Promise<{ data: Buffer; extension: string }> {
  // Skip compression for GIFs (to preserve animation)
  if (mimeType === "image/gif") {
    return { data: buffer, extension: "gif" }
  }

  let sharpInstance = sharp(buffer)

  // Get image metadata
  const metadata = await sharpInstance.metadata()

  // Resize if wider than MAX_WIDTH (maintain aspect ratio)
  if (metadata.width && metadata.width > MAX_WIDTH) {
    sharpInstance = sharpInstance.resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
  }

  // Convert to WebP for best compression (except for transparent PNGs which stay PNG)
  if (mimeType === "image/png" && metadata.hasAlpha) {
    // Keep as PNG for transparency support
    const data = await sharpInstance
      .png({ compressionLevel: PNG_COMPRESSION, quality: JPEG_QUALITY })
      .toBuffer()
    return { data, extension: "png" }
  } else {
    // Convert to WebP for better compression
    const data = await sharpInstance
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    return { data, extension: "webp" }
  }
}

async function uploadToLocal(buffer: Buffer, uniqueName: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads")

  // Create uploads directory if it doesn't exist
  await mkdir(uploadsDir, { recursive: true })

  const filePath = path.join(uploadsDir, uniqueName)
  await writeFile(filePath, buffer)

  // Return the public URL
  return `/uploads/${uniqueName}`
}

async function uploadToVercelBlob(buffer: Buffer, uniqueName: string, contentType: string): Promise<string> {
  const blob = await put(uniqueName, buffer, {
    access: "public",
    contentType,
  })
  return blob.url
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." }, { status: 400 })
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
  }

  // Get original file buffer
  const originalBuffer = Buffer.from(await file.arrayBuffer())
  const originalSize = originalBuffer.length

  // Compress the image
  const { data: compressedBuffer, extension } = await compressImage(originalBuffer, file.type)
  const compressedSize = compressedBuffer.length

  // Log compression stats
  const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  console.log(`Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${savings}% smaller)`)

  // Generate unique filename with new extension
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const uniqueName = `${timestamp}-${randomStr}.${extension}`
  const contentType = extension === "webp" ? "image/webp" : extension === "png" ? "image/png" : "image/gif"

  try {
    let url: string

    if (useLocalStorage) {
      // Use local storage
      url = await uploadToLocal(compressedBuffer, uniqueName)
      console.log("File uploaded locally:", url)
    } else {
      // Try Vercel Blob first
      try {
        url = await uploadToVercelBlob(compressedBuffer, uniqueName, contentType)
        console.log("File uploaded to Vercel Blob:", url)
      } catch (blobError) {
        // Fall back to local storage if Vercel Blob fails
        console.warn("Vercel Blob failed, falling back to local storage:", blobError)
        url = await uploadToLocal(compressedBuffer, uniqueName)
        console.log("File uploaded locally (fallback):", url)
      }
    }

    return NextResponse.json({ url, originalSize, compressedSize, savings: `${savings}%` })
  } catch (error) {
    console.error("Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to upload: ${errorMessage}` }, { status: 500 })
  }
}
