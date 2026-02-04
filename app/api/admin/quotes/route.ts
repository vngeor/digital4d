import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

async function requireAdminApi() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    const quotes = await prisma.quoteRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
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
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const quote = await prisma.quoteRequest.update({
      where: { id: data.id },
      data: {
        status: data.status,
        quotedPrice: data.quotedPrice ? parseFloat(data.quotedPrice) : null,
        adminNotes: data.adminNotes || null,
      },
    })

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
    const session = await requireAdminApi()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 })
    }

    await prisma.quoteRequest.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}