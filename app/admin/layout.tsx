import { requireAdmin } from "@/lib/admin"
import { Sidebar } from "../components/admin/Sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAdmin()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar user={session.user} />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
