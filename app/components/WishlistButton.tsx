"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Heart } from "lucide-react"
import { toast } from "sonner"

interface WishlistButtonProps {
  productId: string
  initialWishlisted: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  translations: {
    addToWishlist: string
    removeFromWishlist: string
    loginToWishlist: string
  }
}

export function WishlistButton({
  productId,
  initialWishlisted,
  size = "md",
  className = "",
  translations: t,
}: WishlistButtonProps) {
  const { data: session } = useSession()
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [loading, setLoading] = useState(false)

  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-12 h-12",
  }
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      toast.info(t.loginToWishlist)
      return
    }

    setLoading(true)
    try {
      if (wishlisted) {
        const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" })
        if (res.ok) {
          setWishlisted(false)
          toast.success(t.removeFromWishlist)
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        })
        if (res.ok) {
          setWishlisted(true)
          toast.success(t.addToWishlist)
        }
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all touch-manipulation ${
        wishlisted
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-red-400"
      } ${loading ? "opacity-50" : ""} ${className}`}
      title={wishlisted ? t.removeFromWishlist : t.addToWishlist}
    >
      <Heart
        className={`${iconSizes[size]} transition-all ${wishlisted ? "fill-red-400" : ""}`}
      />
    </button>
  )
}
