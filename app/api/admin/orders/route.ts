import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { generateOrderNumber } from "@/lib/generateCode"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("orders", "view")
    if (error) return error

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
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("orders", "edit")
    if (error) return error

    const data = await request.json()

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        phone: data.phone || null,
        description: data.description,
        status: data.status || "PENDING",
        notes: data.notes || null,
        userId: data.userId || null,
      },
    })

    logAuditAction({ userId: session.user.id, action: "create", resource: "orders", recordId: order.id, recordTitle: order.orderNumber }).catch(() => {})

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("orders", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    // Fetch old record for change tracking
    const oldOrder = await prisma.order.findUnique({ where: { id: data.id } })
    if (!oldOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
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

    const orderFields = ["customerName", "customerEmail", "phone", "description", "status", "notes"]
    const details = getChangeDetails(oldOrder as Record<string, unknown>, order as Record<string, unknown>, orderFields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "orders", recordId: order.id, recordTitle: order.orderNumber, details }).catch(() => {})

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("orders", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    await prisma.order.delete({
      where: { id },
    })

    logAuditAction({ userId: session.user.id, action: "delete", resource: "orders", recordId: id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
