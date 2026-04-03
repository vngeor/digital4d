export const CART_KEY = "d4d-cart"

export interface CartItem {
  productId: string
  productSlug: string
  productUrl: string
  nameEn: string
  nameBg: string
  nameEs: string
  image: string
  price: string           // base price as numeric string
  salePrice: string | null
  onSale: boolean
  currency: string        // "EUR" | "USD" | "BGN"
  fileType: string        // "digital" | "physical"
  priceType: string       // "fixed"
  status: string
  quantity: number
  addedAt: number
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
    const existingIndex = cart.findIndex((i) => i.productId === item.productId)
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

export function removeFromCart(productId: string): void {
  try {
    const cart = getCart().filter((i) => i.productId !== productId)
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch {
    // localStorage unavailable
  }
}

export function updateQuantity(productId: string, quantity: number): void {
  try {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    const cart = getCart().map((i) =>
      i.productId === productId ? { ...i, quantity: Math.min(99, Math.max(1, quantity)) } : i
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
