import { handlers } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

// Pre-warm Neon serverless compute before NextAuth runs adapter queries.
// On cold start, the first query wakes Neon; the retry gives it time to initialize.
async function warmupDb() {
  try {
    await prisma.user.findFirst({ select: { id: true }, take: 1 })
  } catch {
    await new Promise(r => setTimeout(r, 2000))
    try {
      await prisma.user.findFirst({ select: { id: true }, take: 1 })
    } catch {
      // Let withRetry in auth.ts handle remaining issues
    }
  }
}

const GET = async (req: NextRequest) => {
  await warmupDb()
  return handlers.GET(req)
}

const POST = async (req: NextRequest) => {
  await warmupDb()
  return handlers.POST(req)
}

export { GET, POST }
