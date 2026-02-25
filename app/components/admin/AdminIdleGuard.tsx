"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Clock, LogOut } from "lucide-react"

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const WARNING_BEFORE = 60 * 1000   // show warning at 4 min (1 min before logout)

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const

export function AdminIdleGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav")
  const [showWarning, setShowWarning] = useState(false)
  const [remaining, setRemaining] = useState(60)

  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const startTimers = useCallback(() => {
    clearAllTimers()

    // Warning timer — fires at (IDLE_TIMEOUT - WARNING_BEFORE)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setRemaining(Math.ceil(WARNING_BEFORE / 1000))

      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Time's up — logout
            signOut({ callbackUrl: "/login" })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, IDLE_TIMEOUT - WARNING_BEFORE)

    // Hard logout timer — fires at IDLE_TIMEOUT
    logoutTimerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" })
    }, IDLE_TIMEOUT)
  }, [clearAllTimers])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
    startTimers()
  }, [startTimers])

  // Handle visibility change — pause/resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden — pause timers
        isVisibleRef.current = false
        clearAllTimers()
      } else {
        // Tab visible — check elapsed time and restart
        isVisibleRef.current = true
        const elapsed = Date.now() - lastActivityRef.current

        if (elapsed >= IDLE_TIMEOUT) {
          // Already past timeout — logout
          signOut({ callbackUrl: "/login" })
        } else if (elapsed >= IDLE_TIMEOUT - WARNING_BEFORE) {
          // In warning zone
          const remainingMs = IDLE_TIMEOUT - elapsed
          setShowWarning(true)
          setRemaining(Math.ceil(remainingMs / 1000))

          clearAllTimers()
          countdownRef.current = setInterval(() => {
            setRemaining((prev) => {
              if (prev <= 1) {
                signOut({ callbackUrl: "/login" })
                return 0
              }
              return prev - 1
            })
          }, 1000)

          logoutTimerRef.current = setTimeout(() => {
            signOut({ callbackUrl: "/login" })
          }, remainingMs)
        } else {
          // Still have time — restart timers from where we are
          clearAllTimers()
          const remainingToWarning = (IDLE_TIMEOUT - WARNING_BEFORE) - elapsed

          warningTimerRef.current = setTimeout(() => {
            setShowWarning(true)
            setRemaining(Math.ceil(WARNING_BEFORE / 1000))
            countdownRef.current = setInterval(() => {
              setRemaining((prev) => {
                if (prev <= 1) {
                  signOut({ callbackUrl: "/login" })
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }, remainingToWarning)

          logoutTimerRef.current = setTimeout(() => {
            signOut({ callbackUrl: "/login" })
          }, IDLE_TIMEOUT - elapsed)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [clearAllTimers])

  // Activity listeners
  useEffect(() => {
    const handleActivity = () => {
      if (isVisibleRef.current) {
        resetTimer()
      }
    }

    // Throttle mousemove to avoid excessive resets
    let lastMove = 0
    const handleMouseMove = () => {
      const now = Date.now()
      if (now - lastMove > 1000) {
        lastMove = now
        handleActivity()
      }
    }

    // Attach listeners
    for (const event of ACTIVITY_EVENTS) {
      if (event === "mousemove") {
        document.addEventListener(event, handleMouseMove)
      } else {
        document.addEventListener(event, handleActivity)
      }
    }

    // Start initial timers
    startTimers()

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        if (event === "mousemove") {
          document.removeEventListener(event, handleMouseMove)
        } else {
          document.removeEventListener(event, handleActivity)
        }
      }
      clearAllTimers()
    }
  }, [resetTimer, startTimers, clearAllTimers])

  return (
    <>
      {children}

      {/* Idle Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] rounded-2xl border border-white/10 w-full max-w-sm p-6 text-center shadow-2xl">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white mb-2">
              {t("idleWarningTitle")}
            </h3>

            {/* Message with countdown */}
            <p className="text-sm text-gray-400 mb-6">
              {t("idleWarningMessage", { seconds: remaining })}
            </p>

            {/* Countdown circle */}
            <div className="mb-6">
              <span className="text-4xl font-bold text-amber-400">{remaining}</span>
              <span className="text-sm text-gray-500 ml-1">s</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 border border-white/10 hover:bg-white/5 hover:text-red-400 transition-all"
              >
                <LogOut className="w-4 h-4" />
                {t("logout")}
              </button>
              <button
                onClick={resetTimer}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                {t("idleStayLoggedIn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
