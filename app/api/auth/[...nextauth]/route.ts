import { handlers } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIp } from "@/lib/rateLimit"

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
  try {
    return await handlers.GET(req)
  } catch (error) {
    console.error("[auth/GET]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Auth service temporarily unavailable" }, { status: 503 })
  }
}

const POST = async (req: NextRequest) => {
  // Rate limit credentials login: 5 attempts per IP per 15 minutes
  const url = new URL(req.url)
  const isCredentialsLogin = url.pathname.endsWith("/callback/credentials")
  if (isCredentialsLogin) {
    const ip = getClientIp(req)
    const { success, resetAt } = await rateLimit(`login:${ip}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!success) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      )
    }
  }

  await warmupDb()
  try {
    return await handlers.POST(req)
  } catch (error) {
    console.error("[auth/POST]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Auth service temporarily unavailable" }, { status: 503 })
  }
}

export { GET, POST }
