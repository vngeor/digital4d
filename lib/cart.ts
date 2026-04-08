export const CART_KEY = "d4d-cart"

export interface CartItem {
  productId: string
  packageId?: string | null    // differentiates packages of the same product
  packageLabel?: string | null // display label, e.g. "1kg"
  colorNameEn?: string | null
  colorNameBg?: string | null
  colorNameEs?: string | null
  colorHex?: string | null
  colorHex2?: string | null
  brandNameEn?: string | null
  brandNameBg?: string | null
  brandNameEs?: string | null
  productSlug: string
  productUrl: string
  nameEn: string
  nameBg: string
  nameEs: string
  image: string
  price: string           // base price as numeric string (pre-bulk-discount)
  salePrice: string | null
  onSale: boolean
  currency: string        // "EUR" | "USD" | "BGN"
  fileType: string        // "digital" | "physical"
  priceType: string       // "fixed"
  status: string
  quantity: number
  addedAt: number
  bulkDiscountTiers?: string  // product-level tier JSON; empty = use global
}

/** Unique key for a cart item — combines productId + packageId so different packages are distinct */
export function cartItemKey(productId: string, packageId?: string | null): string {
  return packageId ? `${productId}:${packageId}` : productId
}

export function getCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addToCart(item: Omit<CartItem, "quantity" | "addedAt">, qty = 1): void {
  try {
    const cart = getCart()
    const key = cartItemKey(item.productId, item.packageId)
    const existingIndex = cart.findIndex((i) => cartItemKey(i.productId, i.packageId) === key)
    if (existingIndex >= 0) {
      cart[existingIndex].quantity = Math.min(99, cart[existingIndex].quantity + qty)
    } else {
      cart.push({ ...item, quantity: Math.min(99, Math.max(1, qty)), addedAt: Date.now() })
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch {
    // localStorage unavailable
  }
}

export function removeFromCart(key: string): void {
  try {
    const cart = getCart().filter((i) => cartItemKey(i.productId, i.packageId) !== key)
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch {
    // localStorage unavailable
  }
}

export function updateQuantity(key: string, quantity: number): void {
  try {
    if (quantity <= 0) {
      removeFromCart(key)
      return
    }
    const cart = getCart().map((i) =>
      cartItemKey(i.productId, i.packageId) === key ? { ...i, quantity: Math.min(99, Math.max(1, quantity)) } : i
    )
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch {
    // localStorage unavailable
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_KEY)
  } catch {
    // localStorage unavailable
  }
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0)
}

export function getEffectivePrice(item: CartItem): number {
  if (item.onSale && item.salePrice) {
    return parseFloat(item.salePrice)
  }
  return parseFloat(item.price)
}

// ─── Server cart sync helpers (for logged-in users) ────────────────────────

export interface ServerCartItem {
  productId: string
  packageId: string | null
  quantity: number
  addedAt: string
}

/**
 * Fetch server cart for the current logged-in user.
 * Returns empty array if not logged in or on error.
 */
export async function fetchServerCart(): Promise<ServerCartItem[]> {
  try {
    const res = await fetch("/api/cart")
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

/**
 * Upsert a single item to the server cart (fire-and-forget safe).
 */
export async function syncCartItemToServer(
  productId: string,
  packageId: string | null | undefined,
  quantity: number
): Promise<void> {
  try {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, packageId: packageId ?? null, quantity }),
    })
  } catch {
    // non-critical — local cart is the source of truth
  }
}

/**
 * Remove a single item from the server cart.
 */
export async function deleteCartItemFromServer(
  productId: string,
  packageId?: string | null
): Promise<void> {
  try {
    const params = new URLSearchParams({ productId })
    if (packageId) params.set("packageId", packageId)
    await fetch(`/api/cart?${params.toString()}`, { method: "DELETE" })
  } catch {
    // non-critical
  }
}

/**
 * Push the full local cart to the server (used after login merge).
 */
export async function syncCartToServer(items: CartItem[]): Promise<void> {
  await Promise.allSettled(
    items.map((item) =>
      syncCartItemToServer(item.productId, item.packageId, item.quantity)
    )
  )
}

/**
 * Merge server cart into local localStorage cart on login.
 * For items already in local cart: keep the higher quantity.
 * For items only on server: skip (display data unavailable without full product fetch).
 * After merge, the caller should push the updated local cart to server.
 */
export function mergeServerCartIntoLocal(serverItems: ServerCartItem[]): void {
  if (serverItems.length === 0) return
  try {
    const cart = getCart()
    let changed = false
    for (const serverItem of serverItems) {
      const key = cartItemKey(serverItem.productId, serverItem.packageId)
      const localIndex = cart.findIndex((i) => cartItemKey(i.productId, i.packageId) === key)
      if (localIndex >= 0) {
        const merged = Math.min(99, Math.max(cart[localIndex].quantity, serverItem.quantity))
        if (merged !== cart[localIndex].quantity) {
          cart[localIndex].quantity = merged
          changed = true
        }
      }
      // Server-only items are skipped — no display data available
    }
    if (changed) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    }
  } catch {
    // localStorage unavailable
  }
}
