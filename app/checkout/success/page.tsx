import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import prisma from "@/lib/prisma"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import { CheckCircle, Download, ArrowLeft, Package } from "lucide-react"

interface PageProps {
    searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
    const t = await getTranslations()
    const params = await searchParams
    const sessionId = params.session_id

    interface DigitalItem {
        downloadToken: string
        productName: string
    }

    let digitalItems: DigitalItem[] = []
    let hasPhysicalOrder = false

    if (sessionId) {
        // Fetch all digital purchases for this session (supports both single-item and cart)
        const purchases = await prisma.digitalPurchase.findMany({
            where: { stripeSession: sessionId },
        })

        for (const purchase of purchases) {
            const product = await prisma.product.findUnique({
                where: { id: purchase.productId },
                select: { nameEn: true },
            })
            digitalItems.push({
                downloadToken: purchase.downloadToken,
                productName: product?.nameEn ?? "Product",
            })
        }

        // Check for physical orders created from this session
        const physicalOrders = await prisma.order.findMany({
            where: { notes: { contains: sessionId } },
            select: { id: true },
        })
        hasPhysicalOrder = physicalOrders.length > 0
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            <BackgroundOrbs />

            <Header />

            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-16 px-4">
                <div className="mx-auto max-w-2xl">
                    <div className="glass rounded-2xl border border-white/10 p-4 sm:p-8 md:p-12 text-center">
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

                        {/* Digital download links */}
                        {digitalItems.length > 0 && (
                            <div className="space-y-3 mb-8">
                                {digitalItems.map((item) => (
                                    <div key={item.downloadToken} className="glass rounded-xl border border-white/10 p-4 text-left">
                                        <p className="text-white font-medium mb-3 text-sm">{item.productName}</p>
                                        <a
                                            href={`/products/download/${item.downloadToken}`}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                                        >
                                            <Download className="w-4 h-4" />
                                            {t("checkout.success.downloadNow")}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Physical order confirmation */}
                        {hasPhysicalOrder && (
                            <div className="glass rounded-xl border border-emerald-500/20 p-4 mb-8 text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <p className="text-white font-semibold text-sm">{t("cart.orderConfirmed")}</p>
                                </div>
                                <p className="text-slate-400 text-sm pl-11">{t("cart.orderConfirmedDesc")}</p>
                            </div>
                        )}

                        {/* Back to Products */}
                        <div className="mt-4">
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
