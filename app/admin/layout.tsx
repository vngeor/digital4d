import { requireAdminAccess } from "@/lib/admin"
import { getPermissionsForUser, getDefaultPermissions, getVisibleNavItems } from "@/lib/permissions"
import { Sidebar } from "../components/admin/Sidebar"
import { AdminPermissionsProvider } from "../components/admin/AdminPermissionsContext"
import { AdminIdleGuard } from "../components/admin/AdminIdleGuard"
import { GlobalSearch } from "../components/admin/GlobalSearch"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAdminAccess()
  const role = session.user.role
  const userId = session.user.id
  let permissions
  try {
    permissions = await getPermissionsForUser(userId, role)
  } catch {
    // Fallback to code defaults if DB query fails (e.g. Neon cold start)
    permissions = getDefaultPermissions(role)
  }
  const visibleNavHrefs = getVisibleNavItems(role, permissions)
  const serializedPermissions = JSON.parse(JSON.stringify(permissions))

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <AdminIdleGuard>
        <Sidebar
          user={session.user}
          role={role}
          visibleNavHrefs={visibleNavHrefs}
          permissions={serializedPermissions}
        />
        <main className="flex-1 lg:ml-64 p-4 pt-18 lg:pt-8 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AdminPermissionsProvider role={role} permissions={serializedPermissions}>
              {children}
              <GlobalSearch />
            </AdminPermissionsProvider>
          </div>
        </main>
      </AdminIdleGuard>
    </div>
  )
}
