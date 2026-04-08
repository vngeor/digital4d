import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

/** GET /api/cart — return server cart for logged-in user */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    select: {
      productId: true,
      packageId: true,
      quantity: true,
      addedAt: true,
    },
    orderBy: { addedAt: "asc" },
  })

  return NextResponse.json(items)
}

/** POST /api/cart — upsert a cart item */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { productId, packageId, quantity } = body

  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  await prisma.cartItem.upsert({
    where: {
      userId_productId_packageId: {
        userId: session.user.id,
        productId,
        packageId: packageId ?? null,
      },
    },
    update: { quantity: Math.min(quantity, 99) },
    create: {
      userId: session.user.id,
      productId,
      packageId: packageId ?? null,
      quantity: Math.min(quantity, 99),
    },
  })

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
