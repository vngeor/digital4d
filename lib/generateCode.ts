const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No 0/O/1/I to avoid confusion

function randomChars(length: number): string {
  let result = ""
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return result
}

export function generateOrderNumber(): string {
  return `ORD-${randomChars(4)}@D4D`
}

export function generateQuoteNumber(): string {
  return `QUO-${randomChars(4)}@D4D`
}