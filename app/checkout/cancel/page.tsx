import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react"

interface PageProps {
    searchParams: Promise<{ product?: string }>
}

export default async function CheckoutCancelPage({ searchParams }: PageProps) {
    const t = await getTranslations()
    const params = await searchParams
    const productSlug = params.product

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            <Header />

            <section className="relative pt-32 pb-16 px-4">
                <div className="mx-auto max-w-2xl">
                    <div className="glass rounded-2xl border border-white/10 p-8 md:p-12 text-center">
                        {/* Cancel Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-400" />
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {t("checkout.cancel.title")}
                        </h1>

                        {/* Message */}
                        <p className="text-slate-400 text-lg mb-8">
                            {t("checkout.cancel.message")}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {productSlug && (
                                <Link
                                    href={`/products/${productSlug}`}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    {t("checkout.cancel.tryAgain")}
                                </Link>
                            )}

                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                {t("checkout.cancel.backToProducts")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {t("footer.rights")}</p>
                </div>
            </footer>
        </div>
    )
}
