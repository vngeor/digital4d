// In-memory rate limiter for Vercel serverless functions.
// Each function instance has its own Map, so this provides basic
// per-instance protection. For stronger protection, use Upstash Redis.

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Auto-cleanup expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key)
      }
    }
  }, 60_000)
}

export function rateLimit(
  key: string,
  config: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // If no entry or window expired, start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: config.limit - 1, resetAt }
  }

  // Increment count
  entry.count++

  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}
