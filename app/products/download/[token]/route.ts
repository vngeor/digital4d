import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ token: string }>
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

    // Redirect to the file URL
    return NextResponse.redirect(product.fileUrl)
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}