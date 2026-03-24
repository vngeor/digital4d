import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import type { Role } from "@prisma/client"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"

// Wrap PrismaAdapter methods with retry logic to handle Neon cold starts.
// This is a safety net — the warmup in route.ts should have already woken Neon,
// so these retries use shorter delays (500ms, 1s) for quick recovery from transient errors.
function withRetry(adapter: Adapter): Adapter {
  const wrapped = { ...adapter }
  for (const [key, value] of Object.entries(wrapped)) {
    if (typeof value === "function") {
      ;(wrapped as Record<string, unknown>)[key] = async (...args: unknown[]) => {
        const start = Date.now()
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await (value as (...a: unknown[]) => Promise<unknown>)(...args)
          } catch (error) {
            const elapsed = Date.now() - start
            if (attempt === 2 || elapsed > 8000) {
              console.error(`[Auth] adapter.${key} failed permanently (${elapsed}ms):`, error instanceof Error ? error.message : error)
              throw error
            }
            const delay = attempt === 0 ? 500 : 1000
            console.warn(`[Auth] adapter.${key} failed (attempt ${attempt + 1}/3, ${elapsed}ms), retrying in ${delay}ms`)
            await new Promise(r => setTimeout(r, delay))
          }
        }
      }
    }
  }
  return wrapped
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
    }
  }

  interface User {
    role: Role
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: withRetry(PrismaAdapter(prisma) as Adapter),
  trustHost: true, // Required for Vercel and serverless deployments
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  debug: process.env.NODE_ENV === "development",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login page on error
  },
  callbacks: {
    async signIn() {
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.id = user.id
        token.role = user.role
      }

      // Fetch role from database if not present (for OAuth users)
      // Set default role first to prevent Configuration error if DB is slow on first request
      if (!token.role) {
        token.role = "SUBSCRIBER"
      }

      if (token.email && token.role === "SUBSCRIBER") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          // Continue with default SUBSCRIBER role - token.role already set above
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as Role) || "SUBSCRIBER"
      }
      return session
    },
  },
})
