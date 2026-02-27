"use client"

import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
    const t = useTranslations("login")
    const searchParams = useSearchParams()
    const [isRegister, setIsRegister] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const callbackUrl = searchParams.get("callbackUrl") || "/"

    // Handle OAuth error redirects
    useEffect(() => {
        const errorParam = searchParams.get("error")
        if (errorParam) {
            switch (errorParam) {
                case "Configuration":
                    setError(t("somethingWentWrong") + " (Configuration)")
                    break
                case "AccessDenied":
                    setError(t("somethingWentWrong") + " (Access Denied)")
                    break
                case "OAuthSignin":
                case "OAuthCallback":
                case "OAuthAccountNotLinked":
                    setError(t("somethingWentWrong") + " (OAuth Error)")
                    break
                default:
                    setError(t("somethingWentWrong"))
            }
        }
    }, [searchParams, t])

    const handleGoogleSignIn = async () => {
        setError("")
        setLoading(true)
        try {
            await signIn("google", { callbackUrl })
        } catch {
            setError(t("somethingWentWrong"))
            setLoading(false)
        }
    }

    const handleGitHubSignIn = async () => {
        setError("")
        setLoading(true)
        try {
            await signIn("github", { callbackUrl })
        } catch {
            setError(t("somethingWentWrong"))
            setLoading(false)
        }
    }

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 6) {
            return t("passwordTooShort")
        }
        const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
        if (!specialCharRegex.test(pwd)) {
            return t("passwordNoSpecialChar")
        }
        return null
    }

    const getErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case "passwordTooShort":
                return t("passwordTooShort")
            case "passwordNoSpecialChar":
                return t("passwordNoSpecialChar")
            case "userExists":
                return t("userExists")
            default:
                return errorCode
        }
    }

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            if (isRegister) {
                // Client-side validation
                const validationError = validatePassword(password)
                if (validationError) {
                    setError(validationError)
                    setLoading(false)
                    return
                }

                // Register
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, birthDate: birthDate || null }),
                })
                const data = await res.json()

                if (!res.ok) {
                    setError(getErrorMessage(data.error))
                    setLoading(false)
                    return
                }

                // Auto login after registration
                const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                })

                if (result?.error) {
                    setError(t("loginFailedAfterRegister"))
                } else {
                    window.location.href = callbackUrl
                }
            } else {
                // Login
                const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                })

                if (result?.error) {
                    setError(t("invalidCredentials"))
                } else {
                    window.location.href = callbackUrl
                }
            }
        } catch {
            setError(t("somethingWentWrong"))
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex items-center justify-center px-4">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="glass-strong rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <a href="/" className="text-3xl font-bold tracking-tight inline-block">
                            digital<span className="text-emerald-400">4d</span>
                        </a>
                        <p className="text-slate-400 mt-2">{isRegister ? t("createAccount") : t("title")}</p>
                    </div>

                    {/* Social Login Buttons */}
                    <div className="space-y-3">
                        {/* Google */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-gray-800 font-semibold hover:bg-gray-100 hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            {t("continueWith")} Google
                        </button>

                        {/* GitHub */}
                        <button
                            onClick={handleGitHubSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-[#24292F] text-white font-semibold hover:bg-[#1b1f23] hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                            </svg>
                            {t("continueWith")} GitHub
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-white/10"></div>
                        <span className="px-4 text-sm text-slate-500">{t("or")}</span>
                        <div className="flex-1 border-t border-white/10"></div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                        {isRegister && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">{t("name")}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                                    placeholder={t("namePlaceholder")}
                                    autoComplete="name"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">{t("email")}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                                placeholder={t("emailPlaceholder")}
                                required
                                autoComplete="email"
                                inputMode="email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">{t("password")}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                                placeholder={t("passwordPlaceholder")}
                                required
                                autoComplete={isRegister ? "new-password" : "current-password"}
                            />
                            {isRegister && (
                                <p className="text-xs text-slate-500 mt-1">{t("passwordRequirements")}</p>
                            )}
                        </div>
                        {isRegister && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">
                                    {t("birthDate")} <span className="text-slate-600">{t("birthDateOptional")}</span>
                                </label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors [color-scheme:dark]"
                                    autoComplete="bday"
                                />
                            </div>
                        )}

                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? t("loading") : (isRegister ? t("register") : t("signIn"))}
                        </button>
                    </form>

                    {/* Toggle Register/Login */}
                    <p className="text-center text-slate-400 text-sm mt-4">
                        {isRegister ? t("haveAccount") : t("noAccount")}{" "}
                        <button
                            onClick={() => {
                                setIsRegister(!isRegister)
                                setError("")
                            }}
                            className="text-emerald-400 hover:underline"
                        >
                            {isRegister ? t("signIn") : t("register")}
                        </button>
                    </p>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-white/10"></div>
                    </div>

                    {/* Back to Home */}
                    <a
                        href="/"
                        className="block w-full text-center px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10 hover:scale-[1.02] transition-all"
                    >
                        {t("backHome")}
                    </a>
                </div>

                {/* Footer text */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    {t("terms")}{" "}
                    <a href="#" className="text-emerald-400 hover:underline">{t("termsLink")}</a>
                    {" "}{t("and")}{" "}
                    <a href="#" className="text-emerald-400 hover:underline">{t("privacyLink")}</a>
                </p>
            </div>
        </div>
    )
}
