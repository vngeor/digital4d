import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rateLimit"
import { validateLength, validateBirthDate, firstError, MAX_NAME, MAX_EMAIL, MAX_PASSWORD } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per IP per hour
    const ip = getClientIp(request)
    const { success, resetAt } = rateLimit(`register:${ip}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
    if (!success) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }

    const { name, email, password, birthDate } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Input length validation
    const lengthError = firstError(
      validateLength(name, "Name", MAX_NAME),
      validateLength(email, "Email", MAX_EMAIL),
      validateLength(password, "Password", MAX_PASSWORD),
      validateBirthDate(birthDate)
    )
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "passwordTooShort" },
        { status: 400 }
      )
    }

    // Check for at least one special character
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
    if (!specialCharRegex.test(password)) {
      return NextResponse.json(
        { error: "passwordNoSpecialChar" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "userExists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Registration error:", error instanceof Error ? error.message : "Unknown")
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
