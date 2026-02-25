import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { hasPermissionForUser, canAccessAdmin, type Resource, type Action } from "@/lib/permissions"

/**
 * Require ADMIN role specifically (for server components)
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/")
  }

  return session
}

/**
 * Require any admin panel role: ADMIN, EDITOR, or AUTHOR (for server components)
 */
export async function requireAdminAccess() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!canAccessAdmin(session.user.role)) {
    redirect("/")
  }

  return session
}

/**
 * Require specific permission (for server components)
 * Redirects if user doesn't have the required permission
 */
export async function requirePermission(resource: Resource, action: Action) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!canAccessAdmin(session.user.role)) {
    redirect("/")
  }

  const allowed = await hasPermissionForUser(session.user.id, session.user.role, resource, action)
  if (!allowed) {
    redirect("/admin")
  }

  return session
}

/**
 * Require specific permission for API routes
 * Returns null if denied (caller should return 401/403)
 */
export async function requirePermissionApi(resource: Resource, action: Action) {
  const session = await auth()

  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const allowed = await hasPermissionForUser(session.user.id, session.user.role, resource, action)
  if (!allowed) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "You don't have permission to perform this action. Please contact the administrator." },
        { status: 403 }
      ),
    }
  }

  return { session, error: null }
}

/**
 * Check if current user is ADMIN
 */
export async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
