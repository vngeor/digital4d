import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAllPermissions, invalidatePermissionCache } from "@/lib/permissions"
import { logAuditAction } from "@/lib/auditLog"

async function requireAdminOnly() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

// GET — return all role permissions (merged DB overrides + defaults)
export async function GET() {
  const session = await requireAdminOnly()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const permissions = await getAllPermissions()
    return NextResponse.json(permissions)
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT — save permission overrides
export async function PUT(request: NextRequest) {
  const session = await requireAdminOnly()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    // body format: { EDITOR: { products: { view: true, create: true, ... }, ... }, AUTHOR: { ... } }

    // Delete all existing overrides and re-create
    await prisma.rolePermission.deleteMany({})

    const records: { role: "EDITOR" | "AUTHOR"; resource: string; action: string; allowed: boolean }[] = []

    for (const role of ["EDITOR", "AUTHOR"] as const) {
      const rolePerms = body[role]
      if (!rolePerms) continue

      for (const [resource, actions] of Object.entries(rolePerms)) {
        const actionMap = actions as Record<string, boolean>
        for (const [action, allowed] of Object.entries(actionMap)) {
          records.push({ role, resource, action, allowed })
        }
      }
    }

    // Create all records sequentially (no transactions with Neon HTTP)
    for (const record of records) {
      await prisma.rolePermission.create({ data: record })
    }

    // Invalidate cache so changes take effect immediately
    invalidatePermissionCache()

    logAuditAction({ userId: session.user.id, action: "edit", resource: "roles", recordId: "role-permissions", recordTitle: "Role Permissions", details: JSON.stringify(body) }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving permissions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
