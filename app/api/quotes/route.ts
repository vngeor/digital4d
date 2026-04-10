import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { generateQuoteNumber } from "@/lib/generateCode"
import { uploadBlob } from "@/lib/blob"
import { validateLength, firstError, MAX_NAME, MAX_EMAIL, MAX_PHONE, MAX_MESSAGE } from "@/lib/validation"
import { rateLimit, getClientIp } from "@/lib/rateLimit"
import { auth } from "@/auth"

/**
 * Magic-bytes validator for 3D model files.
 * Prevents malicious files from being uploaded with an innocent extension.
 * - 3MF: ZIP signature (PK\x03\x04)
 * - STL binary: 80-byte header + uint32 triangle count → ≥84 bytes
 * - STL ASCII: starts with "solid"
 * - OBJ: plain ASCII text — verifies first bytes are printable
 */
function validate3DMagicBytes(buf: Buffer, ext: string): boolean {
  if (buf.length === 0) return false
  if (ext === ".3mf") {
    // ZIP: 50 4B 03 04
    return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04
  }
  if (ext === ".stl") {
    if (buf.length < 5) return false
    // ASCII STL starts with "solid"
    if (buf.slice(0, 5).toString("ascii").toLowerCase() === "solid") return true
    // Binary STL: at least 84 bytes (80-byte header + 4-byte triangle count)
    return buf.length >= 84
  }
  if (ext === ".obj") {
    // OBJ is plain ASCII — first 100 bytes must be printable chars / whitespace
    const sample = buf.slice(0, Math.min(100, buf.length))
    for (const byte of sample) {
      if (byte > 127 || (byte < 32 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D)) return false
    }
    return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 quote submissions per IP per hour
    const ip = getClientIp(request)
    const { success } = await rateLimit(`quote:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    // Optional auth — if logged in, lock email/userId to session (prevents spoofing)
    const session = await auth()
    const sessionEmail = session?.user?.email || null
    const sessionUserId = session?.user?.id || null

    const formData = await request.formData()

    const name = formData.get("name") as string
    // If authenticated, always use the verified session email — ignore form field
    const email = sessionEmail || (formData.get("email") as string)
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

    // Input length validation
    const lengthError = firstError(
      validateLength(name, "Name", MAX_NAME),
      validateLength(email, "Email", MAX_EMAIL),
      validateLength(phone, "Phone", MAX_PHONE),
      validateLength(message, "Message", MAX_MESSAGE)
    )
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 })
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

      // Validate file extension
      const allowedExtensions = [".stl", ".obj", ".3mf"]
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: STL, OBJ, 3MF" },
          { status: 400 }
        )
      }

      // Read buffer once for magic bytes validation + upload
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      // Validate magic bytes to prevent extension spoofing
      if (!validate3DMagicBytes(fileBuffer, fileExtension)) {
        return NextResponse.json(
          { error: "File content does not match the declared format." },
          { status: 400 }
        )
      }

      // Upload buffer with automatic fallback to local storage
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const filename = `${timestamp}-${sanitizedName}`

      fileUrl = await uploadBlob(fileBuffer, filename, { folder: "quotes" })
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
        userId: sessionUserId,
      },
    })

    return NextResponse.json({ success: true, quoteId: quote.id }, { status: 201 })
  } catch (error) {
    console.error("Quote creation error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}