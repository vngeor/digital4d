import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { invalidateUserPermissionCache } from "@/lib/permissions"
import { logAuditAction, getChangeDetails } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("users", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (id) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          role: true,
          country: true,
          city: true,
          address: true,
          birthDate: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerEmail: true,
              phone: true,
              status: true,
              description: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Fetch quote requests by user email
      const quoteRequests = await prisma.quoteRequest.findMany({
        where: { email: user.email },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          message: true,
          fileName: true,
          fileUrl: true,
          quotedPrice: true,
          adminNotes: true,
          userResponse: true,
          quotedAt: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: { nameEn: true },
          },
          messages: {
            select: {
              id: true,
              senderType: true,
              message: true,
              quotedPrice: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({ ...user, quoteRequests })
    }

    // Build where conditions from query params
    const search = searchParams.get("search")
    const filter = searchParams.get("filter") // birthday_today | birthday_week | birthday_month
    const role = searchParams.get("role")
    const countOnly = searchParams.get("countOnly") === "true"

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    if (role) {
      where.role = role
    }

    // Birthday filters require birthDate to be non-null
    if (filter?.startsWith("birthday_")) {
      where.birthDate = { not: null }
    }

    // Count-only mode for "All Users" confirmation
    if (countOnly) {
      const count = await prisma.user.count({ where })
      return NextResponse.json({ count })
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        birthDate: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Apply birthday filtering in JavaScript (compare month/day, ignoring year)
    if (filter?.startsWith("birthday_")) {
      const now = new Date()
      const todayMonth = now.getMonth() // 0-indexed
      const todayDate = now.getDate()

      const filtered = users.filter((user) => {
        if (!user.birthDate) return false
        const bd = new Date(user.birthDate)
        const bdMonth = bd.getMonth()
        const bdDate = bd.getDate()

        if (filter === "birthday_today") {
          return bdMonth === todayMonth && bdDate === todayDate
        }

        if (filter === "birthday_week") {
          // Check if birthday falls within the next 7 days (same year context)
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(now)
            checkDate.setDate(todayDate + i)
            if (bd.getMonth() === checkDate.getMonth() && bd.getDate() === checkDate.getDate()) {
              return true
            }
          }
          return false
        }

        if (filter === "birthday_month") {
          return bdMonth === todayMonth
        }

        return true
      })
      return NextResponse.json(filtered)
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("users", "edit")
    if (error) return error

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Fetch old record for change tracking
    const oldUser = await prisma.user.findUnique({ where: { id: data.id } })
    if (!oldUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent admin from demoting themselves
    if (data.role && data.id === session.user.id && data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot demote yourself" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (data.role !== undefined) updateData.role = data.role
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.country !== undefined) updateData.country = data.country
    if (data.city !== undefined) updateData.city = data.city
    if (data.address !== undefined) updateData.address = data.address
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null

    // If role is changing, clear user-level permission overrides
    // (they're relative to the old role and meaningless after role change)
    if (data.role !== undefined && oldUser.role !== data.role) {
      await prisma.userPermission.deleteMany({ where: { userId: data.id } })
      invalidateUserPermissionCache(data.id)
    }

    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        country: true,
        city: true,
        address: true,
        birthDate: true,
        createdAt: true,
      },
    })

    const userFields = ["name", "role", "phone", "country", "city", "address", "birthDate"]
    const details = getChangeDetails(oldUser as Record<string, unknown>, user as Record<string, unknown>, userFields)
    logAuditAction({ userId: session.user.id, action: "edit", resource: "users", recordId: user.id, recordTitle: user.name || user.email, details }).catch(() => {})

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("users", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    logAuditAction({ userId: session.user.id, action: "delete", resource: "users", recordId: id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
