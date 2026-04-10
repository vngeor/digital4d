// Rate limiter with Upstash Redis backend and in-memory fallback.
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for distributed
// cross-instance limiting (recommended in production). Without those env
// vars the in-memory fallback is used — each serverless instance has its
// own counter, so the effective limit is limit × active instances.

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ── Types ────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// ── In-memory fallback ───────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>()

// Auto-cleanup expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 60_000)
}

function rateLimitMemory(
  key: string,
  config: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: config.limit - 1, resetAt }
  }

  entry.count++

  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

// ── Upstash Redis ────────────────────────────────────────────────────────────

type UpstashDuration = `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`

function msToUpstashDuration(ms: number): UpstashDuration {
  if (ms < 1000) return `${ms} ms`
  const secs = Math.ceil(ms / 1000)
  if (secs < 60) return `${secs} s`
  const mins = Math.ceil(secs / 60)
  if (mins < 60) return `${mins} m`
  const hours = Math.ceil(mins / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.ceil(hours / 24)} d`
}

let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
} catch {
  // Redis unavailable — will use in-memory fallback
}

// Cache Ratelimit instances by config key (one per unique limit+window combo)
const limiters = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`
  if (limiters.has(cacheKey)) return limiters.get(cacheKey)!
  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, msToUpstashDuration(windowMs)),
    analytics: false,
  })
  limiters.set(cacheKey, limiter)
  return limiter
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  config: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  if (!redis) return rateLimitMemory(key, config)

  try {
    const result = await getLimiter(config.limit, config.windowMs).limit(key)
    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    }
  } catch {
    // Redis error — degrade gracefully to in-memory
    return rateLimitMemory(key, config)
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}
