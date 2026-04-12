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
  bulkDiscountTiers?: string       // product-level tier JSON; empty = use global
  bulkDiscountExpiresAt?: string | null  // ISO string; null = permanent promotion
  _synced?: boolean                // internal: true once item is confirmed by a server pull
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
      // Only flip to false when item WAS confirmed by server (true).
      // If _synced is undefined (never confirmed), keep it undefined so Pass 2
      // in mergeServerCartIntoLocal won't discard it when server hasn't seen it yet.
      if (cart[existingIndex]._synced === true) {
        cart[existingIndex]._synced = false  // was confirmed; qty changed — needs re-sync
      }
    } else {
      cart.push({ ...item, quantity: Math.min(99, Math.max(1, qty)), addedAt: Date.now() })
      // _synced intentionally omitted (undefined = never confirmed by server)
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
    const cart = getCart().map((i) => {
      if (cartItemKey(i.productId, i.packageId) !== key) return i
      const updated = { ...i, quantity: Math.min(99, Math.max(1, quantity)) }
      // Mark as needing re-sync when item was previously confirmed by server.
      // Without this, merge would adopt server's stale qty (Bug B fix) and revert
      // a local decrease whose per-action sync hasn't yet been confirmed.
      if (updated._synced === true) updated._synced = false
      return updated
    })
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

/**
 * Fetch server cart for the current logged-in user.
 * Returns CartItem[] on success (may be empty array if cart is empty).
 * Returns null on error (network failure, 401, etc.) — callers must treat null
 * as "unknown state, skip merge" to avoid wiping the local cart on transient errors.
 */
export async function fetchServerCart(): Promise<CartItem[] | null> {
  try {
    const res = await fetch("/api/cart")
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Upsert a single item to the server cart with full display data (fire-and-forget safe).
 */
export async function syncCartItemToServer(item: CartItem): Promise<void> {
  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        packageId: item.packageId ?? null,
        quantity: item.quantity,
        data: item,
      }),
    })
    if (!res.ok) console.warn("[cart sync] POST /api/cart →", res.status)
  } catch {
    // non-critical — local cart is the source of truth
  }
}

/**
 * Clear all server cart items for the current user (fire-and-forget after checkout).
 */
export async function clearCartOnServer(): Promise<void> {
  try {
    await fetch("/api/cart", { method: "DELETE" })
  } catch {
    // non-critical
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
  await Promise.allSettled(items.map((item) => syncCartItemToServer(item)))
}

/**
 * Merge server cart into local localStorage cart.
 * For items already in local cart: keep the higher quantity.
 * For items only on server: ADD them (full display data is available from server).
 *
 * propagateDeletions: when true, also removes local items absent from server.
 *   Use ONLY from the 60s polling interval — at that point ≥60s have elapsed since
 *   the last push, so server state is authoritative and no per-add push is in flight.
 *   Do NOT pass true from the login trigger (server may lack pre-login local items)
 *   or visibilitychange (per-add push for a just-added item may still be in flight).
 */
export function mergeServerCartIntoLocal(serverItems: CartItem[], propagateDeletions = false): void {
  try {
    const cart = getCart()

    // Empty server response handling:
    //   propagateDeletions=true  → server confirmed cart is empty; clear confirmed items
    //   propagateDeletions=false → additive merge; nothing to add, nothing to remove
    if (serverItems.length === 0) {
      if (propagateDeletions && cart.length > 0) {
        // Only clear items previously confirmed by server (_synced !== undefined).
        // Keep unconfirmed new items (_synced: undefined) — their push may still be pending.
        const toKeep = cart.filter((i) => i._synced === undefined)
        if (toKeep.length < cart.length) {
          localStorage.setItem(CART_KEY, JSON.stringify(toKeep))
        }
      }
      return
    }

    let changed = false

    // Pass 1: add server-only items and increase quantities
    for (const serverItem of serverItems) {
      if (!serverItem.productId) continue // skip malformed items
      const key = cartItemKey(serverItem.productId, serverItem.packageId)
      const localIndex = cart.findIndex((i) => cartItemKey(i.productId, i.packageId) === key)
      if (localIndex >= 0) {
        // Merge quantity:
        //   _synced === true  → item is confirmed with no pending local changes;
        //                        adopt server qty (makes qty decrements propagate across devices)
        //   _synced !== true  → item has an unconfirmed local change in flight;
        //                        keep the higher of the two as an additive safety net
        const serverQty = Math.min(99, serverItem.quantity)
        const merged = cart[localIndex]._synced === true
          ? serverQty
          : Math.min(99, Math.max(cart[localIndex].quantity, serverQty))
        if (merged !== cart[localIndex].quantity) {
          cart[localIndex].quantity = merged
          changed = true
        }
        // Mark as confirmed by server — smart push will skip this item if later absent from server
        if (!cart[localIndex]._synced) {
          cart[localIndex]._synced = true
          changed = true
        }
      } else {
        // Server-only item — add it with full display data from server
        cart.push({ ...serverItem, _synced: true })
        changed = true
      }
    }

    // Pass 2 (optional): remove local items that were deleted on another device.
    // Only removes items previously confirmed by the server (_synced: true or false).
    // Items that were never confirmed (_synced: undefined) are kept — their push may
    // still be pending or may have failed; the smart push in CartDrawer will retry them.
    const finalCart = propagateDeletions
      ? (() => {
          const serverKeys = new Set(serverItems.map((s) => cartItemKey(s.productId, s.packageId)))
          return cart.filter((localItem) => {
            if (!serverKeys.has(cartItemKey(localItem.productId, localItem.packageId))) {
              if (localItem._synced !== undefined) {
                changed = true
                return false  // was confirmed by server but now absent → deleted elsewhere
              }
              // _synced: undefined → never confirmed; push pending/failed → keep it
            }
            return true
          })
        })()
      : cart

    if (changed) {
      localStorage.setItem(CART_KEY, JSON.stringify(finalCart))
    }
  } catch {
    // localStorage unavailable
  }
}
