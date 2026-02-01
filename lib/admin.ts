import { auth } from "@/auth"
import { redirect } from "next/navigation"

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

export async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
