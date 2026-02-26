import { prisma } from "@/lib/prisma"

// ─── Types ──────────────────────────────────────────────
export type Resource =
  | "dashboard"
  | "products"
  | "categories"
  | "content"
  | "types"
  | "banners"
  | "menu"
  | "orders"
  | "quotes"
  | "users"
  | "roles"
  | "media"
  | "audit"

export type Action = "view" | "create" | "edit" | "delete"

export type RoleType = "ADMIN" | "EDITOR" | "AUTHOR" | "SUBSCRIBER"

export type PermissionMap = Record<Resource, Record<Action, boolean>>

// ─── Resource → Sidebar nav mapping ─────────────────────
export const RESOURCE_NAV_MAP: Record<string, Resource> = {
  "/admin": "dashboard",
  "/admin/menu": "menu",
  "/admin/content": "content",
  "/admin/banners": "banners",
  "/admin/types": "types",
  "/admin/products": "products",
  "/admin/quotes": "quotes",
  "/admin/orders": "orders",
  "/admin/users": "users",
  "/admin/roles": "roles",
  "/admin/media": "media",
  "/admin/audit-logs": "audit",
}

// ─── Default Permissions (code defaults) ────────────────
// ADMIN always has full access (handled separately, not stored here)
// SUBSCRIBER never has admin access (handled separately)
const EDITOR_DEFAULTS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false },
  products: { view: true, create: true, edit: true, delete: true },
  categories: { view: true, create: true, edit: true, delete: true },
  content: { view: true, create: true, edit: true, delete: true },
  types: { view: true, create: true, edit: true, delete: true },
  banners: { view: true, create: true, edit: true, delete: true },
  menu: { view: true, create: true, edit: true, delete: true },
  orders: { view: true, create: false, edit: true, delete: false },
  quotes: { view: true, create: false, edit: true, delete: false },
  media: { view: true, create: true, edit: true, delete: true },
  users: { view: false, create: false, edit: false, delete: false },
  roles: { view: false, create: false, edit: false, delete: false },
  audit: { view: false, create: false, edit: false, delete: false },
}

const AUTHOR_DEFAULTS: PermissionMap = {
  dashboard: { view: true, create: false, edit: false, delete: false },
  products: { view: true, create: true, edit: true, delete: false },
  categories: { view: true, create: false, edit: false, delete: false },
  content: { view: true, create: true, edit: true, delete: false },
  types: { view: true, create: false, edit: false, delete: false },
  banners: { view: false, create: false, edit: false, delete: false },
  menu: { view: false, create: false, edit: false, delete: false },
  orders: { view: true, create: false, edit: false, delete: false },
  quotes: { view: true, create: false, edit: false, delete: false },
  media: { view: true, create: true, edit: true, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
  roles: { view: false, create: false, edit: false, delete: false },
  audit: { view: false, create: false, edit: false, delete: false },
}

const DEFAULT_PERMISSIONS: Record<string, PermissionMap> = {
  EDITOR: EDITOR_DEFAULTS,
  AUTHOR: AUTHOR_DEFAULTS,
}

// ─── In-memory cache ────────────────────────────────────
type CacheEntry = {
  data: Record<string, PermissionMap>
  timestamp: number
}
let permissionCache: CacheEntry | null = null
const CACHE_TTL = 60 * 1000 // 1 minute

export function invalidatePermissionCache() {
  permissionCache = null
}

// ─── User permission cache (keyed by userId) ────────────
type UserCacheEntry = {
  data: Partial<Record<Resource, Partial<Record<Action, boolean>>>>
  timestamp: number
}
const userPermissionCache = new Map<string, UserCacheEntry>()

export function invalidateUserPermissionCache(userId?: string) {
  if (userId) {
    userPermissionCache.delete(userId)
  } else {
    userPermissionCache.clear()
  }
}

// ─── Core Functions ─────────────────────────────────────

/**
 * Check if a role can access the admin panel at all
 */
export function canAccessAdmin(role: string): boolean {
  return role === "ADMIN" || role === "EDITOR" || role === "AUTHOR"
}

/**
 * Get default permissions for a role (no DB lookup)
 */
export function getDefaultPermissions(role: string): PermissionMap {
  if (role === "ADMIN") {
    // ADMIN gets everything
    const allTrue: PermissionMap = {} as PermissionMap
    const resources: Resource[] = [
      "dashboard", "products", "categories", "content", "types",
      "banners", "menu", "orders", "quotes", "media", "users", "roles", "audit",
    ]
    for (const r of resources) {
      allTrue[r] = { view: true, create: true, edit: true, delete: true }
    }
    return allTrue
  }
  return DEFAULT_PERMISSIONS[role] || AUTHOR_DEFAULTS
}

/**
 * Sync permission check — uses defaults or provided overrides (for client components)
 */
export function hasPermissionSync(
  role: string,
  resource: Resource,
  action: Action,
  overrides?: Record<string, PermissionMap>
): boolean {
  if (role === "ADMIN") return true
  if (role === "SUBSCRIBER") return false

  // Check overrides first
  if (overrides?.[role]?.[resource]?.[action] !== undefined) {
    return overrides[role][resource][action]
  }

  // Fall back to defaults
  const defaults = DEFAULT_PERMISSIONS[role]
  return defaults?.[resource]?.[action] ?? false
}

/**
 * Async permission check — reads DB overrides with caching
 */
export async function hasPermission(
  role: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  if (role === "ADMIN") return true
  if (role === "SUBSCRIBER") return false

  const overrides = await getDbOverrides()
  return hasPermissionSync(role, resource, action, overrides)
}

/**
 * Check if role can manage users (ADMIN only)
 */
export function canManageUsers(role: string): boolean {
  return role === "ADMIN"
}

/**
 * Get merged permissions for a role (DB overrides + code defaults)
 */
export async function getPermissionsForRole(role: string): Promise<PermissionMap> {
  if (role === "ADMIN") return getDefaultPermissions("ADMIN")
  if (role === "SUBSCRIBER") return getDefaultPermissions("SUBSCRIBER") // all false

  const overrides = await getDbOverrides()
  const defaults = getDefaultPermissions(role)
  const merged = { ...defaults }

  if (overrides[role]) {
    for (const resource of Object.keys(merged) as Resource[]) {
      if (overrides[role][resource]) {
        merged[resource] = { ...merged[resource], ...overrides[role][resource] }
      }
    }
  }

  return merged
}

/**
 * Get all permissions for all configurable roles (for the admin editor UI)
 */
export async function getAllPermissions(): Promise<Record<string, PermissionMap>> {
  const overrides = await getDbOverrides()
  const result: Record<string, PermissionMap> = {}

  for (const role of ["EDITOR", "AUTHOR"] as const) {
    const defaults = getDefaultPermissions(role)
    const merged = { ...defaults }

    if (overrides[role]) {
      for (const resource of Object.keys(merged) as Resource[]) {
        if (overrides[role][resource]) {
          merged[resource] = { ...merged[resource], ...overrides[role][resource] }
        }
      }
    }

    result[role] = merged
  }

  return result
}

/**
 * Get sidebar nav items filtered by role permissions
 */
export function getVisibleNavItems(
  role: string,
  permissions: PermissionMap
): string[] {
  if (role === "ADMIN") {
    return Object.keys(RESOURCE_NAV_MAP)
  }

  return Object.entries(RESOURCE_NAV_MAP)
    .filter(([, resource]) => permissions[resource]?.view)
    .map(([href]) => href)
}

// ─── User-Level Permission Functions ─────────────────────

/**
 * Get merged permissions for a specific user (3-tier: user override → role override → code defaults)
 */
export async function getPermissionsForUser(
  userId: string,
  role: string
): Promise<PermissionMap> {
  if (role === "ADMIN") return getDefaultPermissions("ADMIN")
  if (role === "SUBSCRIBER") return getDefaultPermissions("SUBSCRIBER")

  // Start with role-level merged permissions (code defaults + role DB overrides)
  const rolePermissions = await getPermissionsForRole(role)

  // Layer on user-level overrides
  const userOverrides = await getUserDbOverrides(userId)
  const merged = { ...rolePermissions }

  for (const resource of Object.keys(merged) as Resource[]) {
    if (userOverrides[resource]) {
      merged[resource] = { ...merged[resource], ...userOverrides[resource] as Record<Action, boolean> }
    }
  }

  return merged
}

/**
 * Async permission check for a specific user (3-tier resolution)
 */
export async function hasPermissionForUser(
  userId: string,
  role: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  if (role === "ADMIN") return true
  if (role === "SUBSCRIBER") return false

  // Check user overrides first
  const userOverrides = await getUserDbOverrides(userId)
  if (userOverrides[resource]?.[action] !== undefined) {
    return userOverrides[resource]![action]!
  }

  // Fall back to role-level check (which itself falls back to code defaults)
  return hasPermission(role, resource, action)
}

/**
 * Get only the user-level overrides (not merged) — for the permissions editor UI
 */
export async function getUserPermissionOverrides(
  userId: string
): Promise<Partial<Record<Resource, Partial<Record<Action, boolean>>>>> {
  return getUserDbOverrides(userId)
}

// ─── DB Helpers ─────────────────────────────────────────

async function getDbOverrides(): Promise<Record<string, PermissionMap>> {
  // Check cache
  if (permissionCache && Date.now() - permissionCache.timestamp < CACHE_TTL) {
    return permissionCache.data
  }

  try {
    const dbPermissions = await prisma.rolePermission.findMany()

    const overrides: Record<string, PermissionMap> = {}

    for (const perm of dbPermissions) {
      const role = perm.role as string
      const resource = perm.resource as Resource
      const action = perm.action as Action

      if (!overrides[role]) {
        overrides[role] = {} as PermissionMap
      }
      if (!overrides[role][resource]) {
        overrides[role][resource] = {} as Record<Action, boolean>
      }
      overrides[role][resource][action] = perm.allowed
    }

    // Update cache
    permissionCache = { data: overrides, timestamp: Date.now() }

    return overrides
  } catch {
    // If DB fails, return empty overrides (use defaults)
    return {}
  }
}

async function getUserDbOverrides(
  userId: string
): Promise<Partial<Record<Resource, Partial<Record<Action, boolean>>>>> {
  // Check cache
  const cached = userPermissionCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const dbPermissions = await prisma.userPermission.findMany({
      where: { userId },
    })

    const overrides: Partial<Record<Resource, Partial<Record<Action, boolean>>>> = {}

    for (const perm of dbPermissions) {
      const resource = perm.resource as Resource
      const action = perm.action as Action

      if (!overrides[resource]) {
        overrides[resource] = {}
      }
      overrides[resource]![action] = perm.allowed
    }

    userPermissionCache.set(userId, { data: overrides, timestamp: Date.now() })
    return overrides
  } catch {
    return {}
  }
}
