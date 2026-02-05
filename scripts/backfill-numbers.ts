import prisma from "../lib/prisma"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
function rand(n: number) {
  let r = ""
  for (let i = 0; i < n; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)]
  return r
}

async function main() {
  const orders = await prisma.order.findMany({ where: { orderNumber: "" } })
  for (const o of orders) {
    await prisma.order.update({
      where: { id: o.id },
      data: { orderNumber: `ORD-${rand(4)}@D4D` },
    })
  }
  console.log(`Updated ${orders.length} orders`)

  const quotes = await prisma.quoteRequest.findMany({ where: { quoteNumber: "" } })
  for (const q of quotes) {
    await prisma.quoteRequest.update({
      where: { id: q.id },
      data: { quoteNumber: `QUO-${rand(4)}@D4D` },
    })
  }
  console.log(`Updated ${quotes.length} quotes`)
}

main().catch(console.error)