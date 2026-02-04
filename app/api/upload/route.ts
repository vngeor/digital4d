import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// Check if we should use local storage
const useLocalStorage = !process.env.BLOB_READ_WRITE_TOKEN || process.env.USE_LOCAL_UPLOADS === "true"

async function uploadToLocal(file: File, uniqueName: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads")

  // Create uploads directory if it doesn't exist
  await mkdir(uploadsDir, { recursive: true })

  const filePath = path.join(uploadsDir, uniqueName)
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(filePath, buffer)

  // Return the public URL
  return `/uploads/${uniqueName}`
}

async function uploadToVercelBlob(file: File, uniqueName: string): Promise<string> {
  const blob = await put(uniqueName, file, {
    access: "public",
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

  // Generate unique filename
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop() || 'jpg'
  const uniqueName = `${timestamp}-${randomStr}.${extension}`

  try {
    let url: string

    if (useLocalStorage) {
      // Use local storage
      url = await uploadToLocal(file, uniqueName)
      console.log("File uploaded locally:", url)
    } else {
      // Try Vercel Blob first
      try {
        url = await uploadToVercelBlob(file, uniqueName)
        console.log("File uploaded to Vercel Blob:", url)
      } catch (blobError) {
        // Fall back to local storage if Vercel Blob fails
        console.warn("Vercel Blob failed, falling back to local storage:", blobError)
        url = await uploadToLocal(file, uniqueName)
        console.log("File uploaded locally (fallback):", url)
      }
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to upload: ${errorMessage}` }, { status: 500 })
  }
}
