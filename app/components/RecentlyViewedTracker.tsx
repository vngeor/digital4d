"use client"

import { useEffect } from "react"
import { trackRecentlyViewed, type RecentlyViewedProduct } from "@/lib/recentlyViewed"

interface Props {
  product: Omit<RecentlyViewedProduct, "viewedAt">
}

export function RecentlyViewedTracker({ product }: Props) {
  useEffect(() => {
    trackRecentlyViewed({ ...product, viewedAt: Date.now() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])
  return null
}
