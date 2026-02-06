import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import prisma from "@/lib/prisma"
import { CheckCircle, Download, ArrowLeft } from "lucide-react"

interface PageProps {
    searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
    const t = await getTranslations()
    const params = await searchParams
    const sessionId = params.session_id

    // Try to find the purchase by session ID
    let downloadToken: string | null = null
    let productName: string | null = null

    if (sessionId) {
        const purchase = await prisma.digitalPurchase.findFirst({
            where: { stripeSession: sessionId }
        })

        if (purchase) {
            downloadToken = purchase.downloadToken

            const product = await prisma.product.findUnique({
                where: { id: purchase.productId }
            })
            if (product) {
                productName = product.nameEn
            }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
            </div>

            <Header />

            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-16 px-4">
                <div className="mx-auto max-w-2xl">
                    <div className="glass rounded-2xl border border-white/10 p-8 md:p-12 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                            {t("checkout.success.title")}
                        </h1>

                        {/* Message */}
                        <p className="text-slate-400 text-lg mb-8">
                            {t("checkout.success.message")}
                        </p>

                        {/* Product Name */}
                        {productName && (
                            <p className="text-white font-medium mb-8">
                                {productName}
                            </p>
                        )}

                        {/* Download Button */}
                        {downloadToken && (
                            <a
                                href={`/products/download/${downloadToken}`}
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all mb-6"
                            >
                                <Download className="w-5 h-5" />
                                {t("checkout.success.downloadNow")}
                            </a>
                        )}

                        {/* Back to Products */}
                        <div className="mt-8">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                {t("checkout.success.backToProducts")}
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
