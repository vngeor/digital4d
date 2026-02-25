"use client"

import { createContext, useContext } from "react"

type PermissionMap = Record<string, Record<string, boolean>>

interface AdminPermissionsContextType {
  role: string
  permissions: PermissionMap
  can: (resource: string, action: string) => boolean
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType>({
  role: "SUBSCRIBER",
  permissions: {},
  can: () => false,
})

export function AdminPermissionsProvider({
  role,
  permissions,
  children,
}: {
  role: string
  permissions: PermissionMap
  children: React.ReactNode
}) {
  const can = (resource: string, action: string): boolean => {
    if (role === "ADMIN") return true
    if (role === "SUBSCRIBER") return false
    return permissions[resource]?.[action] ?? false
  }

  return (
    <AdminPermissionsContext.Provider value={{ role, permissions, can }}>
      {children}
    </AdminPermissionsContext.Provider>
  )
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext)
}
