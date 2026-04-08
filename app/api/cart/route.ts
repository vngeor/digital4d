import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

/** GET /api/cart — return fully hydrated server cart for logged-in user */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "asc" },
  })

  // Return fully hydrated CartItem objects — merge DB quantity (authoritative) over stored data
  const hydrated = items.map((item) => ({
    ...(item.data as Record<string, unknown>),
    productId: item.productId,
    packageId: item.packageId,
    quantity: item.quantity,  // DB quantity is authoritative
    addedAt: item.addedAt.getTime(),
  }))

  return NextResponse.json(hydrated)
}

/** POST /api/cart — upsert a cart item with full display data */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { productId, packageId, quantity, data } = body

  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Prisma's compound-unique `where` rejects null values — use findFirst + update/create instead.
  // updateMany also requires transactions (not supported on Neon HTTP adapter).
  const existing = await prisma.cartItem.findFirst({
    where: { userId: session.user.id, productId, packageId: packageId ?? null },
    select: { id: true },
  })

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: Math.min(quantity, 99), ...(data ? { data } : {}) },
    })
  } else {
    try {
      await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          packageId: packageId ?? null,
          quantity: Math.min(quantity, 99),
          data: data ?? {},
        },
      })
    } catch {
      // Rare race condition — row was created by a concurrent request; ignore
    }
  }

  return NextResponse.json({ ok: true })
}

/** DELETE /api/cart?productId=X&packageId=Y — remove a cart item */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  const packageId = searchParams.get("packageId") ?? null

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }

  await prisma.cartItem.deleteMany({
    where: {
      userId: session.user.id,
      productId,
      packageId,
    },
  })

  return NextResponse.json({ ok: true })
}
