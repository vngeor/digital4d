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
  const session = await requireAdminApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")

  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await request.json()

  const order = await prisma.order.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      phone: data.phone || null,
      description: data.description,
      status: data.status || "PENDING",
      notes: data.notes || null,
      userId: data.userId || null,
    },
  })

  return NextResponse.json(order, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const session = await requireAdminApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await request.json()

  if (!data.id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 })
  }

  const order = await prisma.order.update({
    where: { id: data.id },
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      phone: data.phone || null,
      description: data.description,
      status: data.status,
      notes: data.notes || null,
    },
  })

  return NextResponse.json(order)
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdminApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 })
  }

  await prisma.order.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
