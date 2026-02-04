import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      city: true,
      address: true,
      birthDate: true,
      image: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { phone, country, city, address, birthDate } = body

  if (!phone || typeof phone !== "string" || phone.trim() === "") {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone: phone.trim(),
      country: country?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      city: true,
      address: true,
      birthDate: true,
      image: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}