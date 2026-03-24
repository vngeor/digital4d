import { handlers } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

// Pre-warm Neon serverless compute before NextAuth runs adapter queries.
// On cold start, the first query wakes Neon; graduated retries give it time to initialize.
// Critical for cross-region setups (e.g., Vercel in Frankfurt, Neon in US East).
async function warmupDb() {
  const start = Date.now()
  const delays = [1000, 2000, 3000] // graduated delays between attempts

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.user.findFirst({ select: { id: true }, take: 1 })
      console.log(`[warmupDb] OK on attempt ${attempt} (${Date.now() - start}ms)`)
      return
    } catch (error) {
      const elapsed = Date.now() - start
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`[warmupDb] attempt ${attempt}/3 failed (${elapsed}ms): ${msg}`)
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, delays[attempt - 1]))
      }
    }
  }
  console.error(`[warmupDb] all 3 attempts failed (${Date.now() - start}ms) — proceeding anyway`)
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
