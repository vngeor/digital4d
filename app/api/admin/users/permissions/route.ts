import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getPermissionsForRole,
  getUserPermissionOverrides,
  invalidateUserPermissionCache,
} from "@/lib/permissions"

async function requireAdminOnly() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

// GET — return role permissions + user overrides for a specific user
export async function GET(request: NextRequest) {
  const session = await requireAdminOnly()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Get the user to know their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get role-level merged permissions (code defaults + role DB overrides)
    const rolePermissions = await getPermissionsForRole(user.role)

    // Get user-level overrides only
    const userOverrides = await getUserPermissionOverrides(userId)

    return NextResponse.json({ rolePermissions, userOverrides })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT — save user-level permission overrides (only diffs from role)
export async function PUT(request: NextRequest) {
  const session = await requireAdminOnly()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, overrides } = body

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only EDITOR and AUTHOR can have overrides
    if (user.role !== "EDITOR" && user.role !== "AUTHOR") {
      return NextResponse.json(
        { error: "Can only set overrides for EDITOR or AUTHOR users" },
        { status: 400 }
      )
    }

    // Delete all existing user overrides
    await prisma.userPermission.deleteMany({ where: { userId } })

    // Create new overrides (only store diffs from role permissions)
    if (overrides && typeof overrides === "object") {
      for (const [resource, actions] of Object.entries(overrides)) {
        if (!actions || typeof actions !== "object") continue
        const actionMap = actions as Record<string, boolean>
        for (const [action, allowed] of Object.entries(actionMap)) {
          await prisma.userPermission.create({
            data: { userId, resource, action, allowed },
          })
        }
      }
    }

    // Invalidate cache
    invalidateUserPermissionCache(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving user permissions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE — reset all user overrides (back to role defaults)
export async function DELETE(request: NextRequest) {
  const session = await requireAdminOnly()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    await prisma.userPermission.deleteMany({ where: { userId } })

    // Invalidate cache
    invalidateUserPermissionCache(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resetting user permissions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
