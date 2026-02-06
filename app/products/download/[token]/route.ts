import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { isVercelBlobUrl } from "@/lib/blob"
import { readFile } from "fs/promises"
import path from "path"

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * Extract filename from URL or path
 */
function getFilename(url: string): string {
  const urlPath = url.startsWith("/") ? url : new URL(url).pathname
  return path.basename(urlPath) || "download"
}

/**
 * Get content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".stl": "model/stl",
    ".obj": "model/obj",
    ".3mf": "model/3mf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Find the purchase by download token
    const purchase = await prisma.digitalPurchase.findUnique({
      where: { downloadToken: token }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Invalid download token" }, { status: 404 })
    }

    // Check if expired
    if (new Date() > purchase.expiresAt) {
      return NextResponse.json({ error: "Download link has expired" }, { status: 410 })
    }

    // Check download count
    if (purchase.downloadCount >= purchase.maxDownloads) {
      return NextResponse.json({ error: "Maximum downloads reached" }, { status: 410 })
    }

    // Fetch the product to get the file URL
    const product = await prisma.product.findUnique({
      where: { id: purchase.productId }
    })

    if (!product || !product.fileUrl) {
      return NextResponse.json({ error: "Product file not found" }, { status: 404 })
    }

    // Increment download count
    await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data: { downloadCount: purchase.downloadCount + 1 }
    })

    const filename = getFilename(product.fileUrl)
    const contentType = getContentType(filename)

    // Proxy the download instead of redirecting (prevents hotlinking)
    let fileBuffer: Buffer

    if (isVercelBlobUrl(product.fileUrl)) {
      // Fetch from Vercel Blob
      const response = await fetch(product.fileUrl)
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
      }
      fileBuffer = Buffer.from(await response.arrayBuffer())
    } else if (product.fileUrl.startsWith("/uploads/")) {
      // Read from local storage
      const localPath = path.join(process.cwd(), "public", product.fileUrl)
      fileBuffer = await readFile(localPath)
    } else {
      // External URL - fetch it
      const response = await fetch(product.fileUrl)
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
      }
      fileBuffer = Buffer.from(await response.arrayBuffer())
    }

    // Return the file with proper headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const responseBody = new Uint8Array(fileBuffer)

    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
        // Private, no caching for paid downloads
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}