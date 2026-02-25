import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { deleteBlobSafe } from "@/lib/blob"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("quotes", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    const quotes = await prisma.quoteRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        productId: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        status: true,
        quotedPrice: true,
        adminNotes: true,
        userResponse: true,
        viewedAt: true,
        quotedAt: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            slug: true,
            sku: true,
            nameEn: true,
            nameBg: true,
            nameEs: true,
            price: true,
            salePrice: true,
            onSale: true,
            currency: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderType: true,
            message: true,
            quotedPrice: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("quotes", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 })
    }

    // Validate quoted price is not negative
    if (data.quotedPrice) {
      const price = parseFloat(data.quotedPrice)
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Quoted price cannot be negative" }, { status: 400 })
      }
    }

    // Build update data
    const updateData: {
      status?: string
      quotedPrice?: number | null
      adminNotes?: string | null
      quotedAt?: Date | null
      viewedAt?: null
    } = {
      status: data.status,
      quotedPrice: data.quotedPrice ? parseFloat(data.quotedPrice) : null,
      adminNotes: data.adminNotes || null,
    }

    // Set quotedAt when status changes to "quoted" and reset viewedAt
    if (data.status === "quoted") {
      updateData.quotedAt = new Date()
      updateData.viewedAt = null
    }

    const quote = await prisma.quoteRequest.update({
      where: { id: data.id },
      data: updateData,
    })

    // Create a message in the history when admin sends a quote
    if (data.status === "quoted" && (data.quotedPrice || data.adminNotes)) {
      await prisma.quoteMessage.create({
        data: {
          quoteId: data.id,
          senderType: "admin",
          message: data.adminNotes || `Quoted price: €${parseFloat(data.quotedPrice).toFixed(2)}`,
          quotedPrice: data.quotedPrice ? parseFloat(data.quotedPrice) : null,
        },
      })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("quotes", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 })
    }

    // Fetch the quote to get the fileUrl before deletion
    const quote = await prisma.quoteRequest.findUnique({
      where: { id },
      select: { fileUrl: true }
    })

    // Delete the database record
    await prisma.quoteRequest.delete({
      where: { id },
    })

    // Delete the associated blob file (non-blocking)
    if (quote?.fileUrl) {
      deleteBlobSafe(quote.fileUrl).catch(err => {
        console.error("Failed to delete quote file blob:", err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}