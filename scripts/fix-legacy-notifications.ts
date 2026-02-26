import "dotenv/config"
import { resolve } from "path"
import { config } from "dotenv"

// Load .env.local first (higher priority), then .env
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

// Now dynamically import prisma after env vars are loaded
async function main() {
  const { default: prisma } = await import("../lib/prisma")

  // Fix wishlist_price_drop notifications
  const priceDrop = await prisma.notification.findMany({
    where: { type: "wishlist_price_drop" }
  })

  console.log(`Found ${priceDrop.length} wishlist_price_drop notifications`)

  for (const n of priceDrop) {
    let parsed = null
    try { parsed = JSON.parse(n.title) } catch { /* not JSON */ }

    if (parsed === null) {
      // Legacy format - title like "Price drop: productName"
      const productName = n.title.replace("Price drop: ", "").trim()

      // Try to find the product by slug from link
      let product = null
      if (n.link) {
        const slug = n.link.replace("/products/", "")
        product = await prisma.product.findFirst({ where: { slug } })
      }

      const newTitle = product
        ? JSON.stringify({ bg: product.nameBg, en: product.nameEn, es: product.nameEs })
        : JSON.stringify({ bg: productName, en: productName, es: productName })

      // Parse old message like "Now 15.99 EUR (was 23.60 EUR)"
      const priceMatch = n.message?.match(/Now ([\d.]+) (\w+)(?: \(was ([\d.]+) \w+\))?/)
      const onSaleMatch = n.message?.includes("on sale")
      const newMessage = priceMatch
        ? JSON.stringify({
            newPrice: priceMatch[1],
            currency: priceMatch[2],
            oldPrice: priceMatch[3] || null,
            onSale: false
          })
        : JSON.stringify({ newPrice: null, currency: "", oldPrice: null, onSale: onSaleMatch || true })

      await prisma.notification.update({
        where: { id: n.id },
        data: { title: newTitle, message: newMessage }
      })
      console.log(`Fixed price_drop: ${n.id} -> ${newTitle}`)
    } else {
      console.log(`Already JSON: ${n.id}`)
    }
  }

  // Fix wishlist_coupon notifications
  const coupons = await prisma.notification.findMany({
    where: { type: "wishlist_coupon" }
  })

  console.log(`Found ${coupons.length} wishlist_coupon notifications`)

  for (const n of coupons) {
    let parsed = null
    try { parsed = JSON.parse(n.title) } catch { /* not JSON */ }

    if (parsed === null) {
      // Legacy format - title like "New discount: CODE"
      const codeMatch = n.title.match(/New discount: (.+)/)
      const code = codeMatch ? codeMatch[1] : n.title

      // Try to get coupon details
      let coupon = null
      if (n.couponId) {
        coupon = await prisma.coupon.findUnique({ where: { id: n.couponId } })
      }

      const newTitle = coupon
        ? JSON.stringify({ code: coupon.code, type: coupon.type, value: Number(coupon.value), currency: coupon.currency })
        : JSON.stringify({ code, type: "percentage", value: 0, currency: null })

      await prisma.notification.update({
        where: { id: n.id },
        data: { title: newTitle, message: "" }
      })
      console.log(`Fixed coupon: ${n.id} -> ${newTitle}`)
    } else {
      console.log(`Already JSON: ${n.id}`)
    }
  }

  // Fix quote_offer notifications (hardcoded English titles/messages)
  const quoteOffers = await prisma.notification.findMany({
    where: { type: "quote_offer" }
  })

  console.log(`Found ${quoteOffers.length} quote_offer notifications`)

  for (const n of quoteOffers) {
    // Skip if already migrated (title is "quote_offer" and message is JSON)
    if (n.title === "quote_offer") {
      let msgParsed = null
      try { msgParsed = JSON.parse(n.message) } catch { /* not JSON */ }
      if (msgParsed) {
        console.log(`Already migrated: ${n.id}`)
        continue
      }
    }

    // Extract price from old message like "You received a quote offer for €7.50"
    const priceMatch = n.message?.match(/for (€[\d.]+)/)
    const price = priceMatch ? priceMatch[1] : null
    const hasCoupon = n.message?.includes("coupon") || false

    await prisma.notification.update({
      where: { id: n.id },
      data: {
        title: "quote_offer",
        message: JSON.stringify({ price, hasCoupon }),
      }
    })
    console.log(`Fixed quote_offer: ${n.id} -> price=${price}, hasCoupon=${hasCoupon}`)
  }

  // Fix coupon-type notifications that are actually quote+coupon
  const couponNotifs = await prisma.notification.findMany({
    where: { type: "coupon" }
  })

  console.log(`Found ${couponNotifs.length} coupon-type notifications`)

  for (const n of couponNotifs) {
    // Skip if already migrated
    if (n.title === "quote_offer") {
      let msgParsed = null
      try { msgParsed = JSON.parse(n.message) } catch { /* not JSON */ }
      if (msgParsed) {
        console.log(`Already migrated: ${n.id}`)
        continue
      }
    }

    // Only migrate quote-related coupon notifications (they have quoteId)
    if (n.quoteId) {
      const priceMatch = n.message?.match(/for (€[\d.]+)/)
      const price = priceMatch ? priceMatch[1] : null

      await prisma.notification.update({
        where: { id: n.id },
        data: {
          title: "quote_offer",
          message: JSON.stringify({ price, hasCoupon: true }),
        }
      })
      console.log(`Fixed coupon (quote+coupon): ${n.id} -> price=${price}`)
    } else {
      console.log(`Skipping non-quote coupon: ${n.id}`)
    }
  }

  console.log("Done!")
}

main().catch(console.error)
