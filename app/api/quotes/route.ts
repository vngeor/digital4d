import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { generateQuoteNumber } from "@/lib/generateCode"
import { uploadBlob } from "@/lib/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string | null
    const message = formData.get("message") as string | null
    const productId = formData.get("productId") as string | null
    const file = formData.get("file") as File | null

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null

    // Handle file upload
    if (file && file.size > 0) {
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 50MB." },
          { status: 400 }
        )
      }

      // Validate file type
      const allowedExtensions = [".stl", ".obj", ".3mf"]
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: STL, OBJ, 3MF" },
          { status: 400 }
        )
      }

      // Upload file with automatic fallback to local storage
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const filename = `${timestamp}-${sanitizedName}`

      fileUrl = await uploadBlob(file, filename, { folder: "quotes" })
      fileName = file.name
      fileSize = file.size
    }

    // Create quote request
    const quote = await prisma.quoteRequest.create({
      data: {
        quoteNumber: generateQuoteNumber(),
        productId: productId || null,
        name,
        email,
        phone: phone || null,
        message: message || null,
        fileName,
        fileUrl,
        fileSize,
        status: "pending",
      },
    })

    return NextResponse.json({ success: true, quoteId: quote.id }, { status: 201 })
  } catch (error) {
    console.error("Error creating quote request:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}