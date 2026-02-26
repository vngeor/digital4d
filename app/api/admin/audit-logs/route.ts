import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/admin"
import { logAuditAction } from "@/lib/auditLog"

export async function GET(request: NextRequest) {
  try {
    const { error } = await requirePermissionApi("audit", "view")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const resource = searchParams.get("resource")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}

    if (resource) where.resource = resource
    if (action) where.action = action
    if (userId) where.userId = userId

    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z")
    }

    if (search) {
      where.OR = [
        { recordTitle: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermissionApi("audit", "delete")
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")
    const clearAll = searchParams.get("clearAll")

    if (id) {
      // Delete single log entry
      const log = await prisma.auditLog.findUnique({ where: { id } })
      if (!log) {
        return NextResponse.json({ error: "Audit log not found" }, { status: 404 })
      }
      await prisma.auditLog.delete({ where: { id } })

      logAuditAction({
        userId: session.user.id,
        action: "delete",
        resource: "audit",
        recordId: id,
        recordTitle: `${log.action} ${log.resource}`,
      }).catch(() => {})

      return NextResponse.json({ success: true, deleted: 1 })
    }

    if (clearAll === "true") {
      // Build filter (same logic as GET) to delete matching logs
      const resource = searchParams.get("resource")
      const action = searchParams.get("action")
      const from = searchParams.get("from")
      const to = searchParams.get("to")

      const where: Record<string, unknown> = {}
      if (resource) where.resource = resource
      if (action) where.action = action
      if (from || to) {
        where.createdAt = {}
        if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z")
      }

      const result = await prisma.auditLog.deleteMany({ where })

      logAuditAction({
        userId: session.user.id,
        action: "delete",
        resource: "audit",
        recordId: "bulk",
        recordTitle: `Cleared ${result.count} audit logs`,
        details: JSON.stringify({ filters: { resource, action, from, to }, deleted: result.count }),
      }).catch(() => {})

      return NextResponse.json({ success: true, deleted: result.count })
    }

    return NextResponse.json({ error: "Provide 'id' or 'clearAll=true'" }, { status: 400 })
  } catch (error) {
    console.error("Error deleting audit logs:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
