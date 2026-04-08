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
