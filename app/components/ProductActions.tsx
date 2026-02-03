"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ShoppingCart, MessageSquare, Send, Loader2 } from "lucide-react"
import { QuoteForm } from "./QuoteForm"

interface Product {
    id: string
    slug: string
    nameEn: string
    price: string | null
    fileType: string | null
    inStock: boolean
}

interface ProductActionsProps {
    product: Product
}

export function ProductActions({ product }: ProductActionsProps) {
    const t = useTranslations("products")
    const [loading, setLoading] = useState(false)
    const [showQuoteForm, setShowQuoteForm] = useState(false)
    const [showContactForm, setShowContactForm] = useState(false)

    const handleBuyNow = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id }),
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error || "Failed to create checkout session")
                return
            }

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url
            }
        } catch (error) {
            console.error("Checkout error:", error)
            alert("Failed to initiate checkout")
        } finally {
            setLoading(false)
        }
    }

    // Digital product - Buy Now button
    if (product.fileType === "digital") {
        return (
            <button
                onClick={handleBuyNow}
                disabled={loading || !product.inStock}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <ShoppingCart className="w-5 h-5" />
                )}
                {t("buyNow")}
            </button>
        )
    }

    // Service - Get Quote button
    if (product.fileType === "service") {
        return (
            <>
                <button
                    onClick={() => setShowQuoteForm(true)}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                >
                    <MessageSquare className="w-5 h-5" />
                    {t("getQuote")}
                </button>

                {showQuoteForm && (
                    <QuoteForm
                        productId={product.id}
                        productName={product.nameEn}
                        onClose={() => setShowQuoteForm(false)}
                    />
                )}
            </>
        )
    }

    // Physical product - Order Now button (opens contact/inquiry form)
    return (
        <>
            <button
                onClick={() => setShowContactForm(true)}
                disabled={!product.inStock}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send className="w-5 h-5" />
                {t("orderNow")}
            </button>

            {showContactForm && (
                <QuoteForm
                    productId={product.id}
                    productName={product.nameEn}
                    onClose={() => setShowContactForm(false)}
                    isOrderInquiry
                />
            )}
        </>
    )
}
