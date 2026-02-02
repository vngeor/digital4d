import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const menuItems = await prisma.menuItem.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      contents: {
        where: { published: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          slug: true,
          type: true,
          titleBg: true,
          titleEn: true,
          titleEs: true,
          image: true,
        }
      }
    }
  })

  return NextResponse.json(menuItems)
}
