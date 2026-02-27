import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Header } from "./components/Header"
import { Home, ShoppingBag } from "lucide-react"
import { Dinosaur3DWrapper } from "./components/Dinosaur3DWrapper"

export default async function NotFound() {
    const t = await getTranslations("notFound")

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            <Header />

            {/* 404 Content */}
            <section className="relative flex flex-1 items-start justify-center pt-8 sm:pt-16 px-4">
                <div className="text-center max-w-2xl mx-auto">
                    {/* Title */}
                    <div className="glass rounded-2xl border border-white/10 px-4 py-4 sm:px-8 sm:py-6 inline-block mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">
                            {t("heading")}
                        </h1>
                    </div>

                    {/* 3D Dinosaur */}
                    <div className="-mb-2">
                        <Dinosaur3DWrapper />
                    </div>

                    <p className="text-slate-400 text-base sm:text-lg mb-4 px-2">
                        {t("description")}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/25"
                        >
                            <Home className="w-5 h-5" />
                            {t("backHome")}
                        </Link>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass border border-white/10 text-slate-300 font-semibold hover:border-emerald-500/30 hover:text-white transition-all"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {t("browseProducts")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-auto">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d.</p>
                </div>
            </footer>
        </div>
    )
}
