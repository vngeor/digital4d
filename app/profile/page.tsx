import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { ProfileClient } from "./ProfileClient"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const t = await getTranslations("profile")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      image: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      description: true,
      status: true,
      createdAt: true,
    },
  })

  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    personalInfo: t("personalInfo"),
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    address: t("address"),
    noPhone: t("noPhone"),
    noAddress: t("noAddress"),
    memberSince: t("memberSince"),
    editProfile: t("editProfile"),
    editProfileTitle: t("editProfileTitle"),
    phonePlaceholder: t("phonePlaceholder"),
    addressPlaceholder: t("addressPlaceholder"),
    phoneRequired: t("phoneRequired"),
    save: t("save"),
    saving: t("saving"),
    cancel: t("cancel"),
    updateSuccess: t("updateSuccess"),
    updateError: t("updateError"),
    orderHistory: t("orderHistory"),
    noOrders: t("noOrders"),
    noOrdersDescription: t("noOrdersDescription"),
    orderDate: t("orderDate"),
    orderStatus: t("orderStatus"),
    orderDescription: t("orderDescription"),
    statusPending: t("statusPending"),
    statusInProgress: t("statusInProgress"),
    statusCompleted: t("statusCompleted"),
    statusCancelled: t("statusCancelled"),
  }

  return (
    <ProfileClient
      user={JSON.parse(JSON.stringify(user))}
      orders={JSON.parse(JSON.stringify(orders))}
      translations={translations}
    />
  )
}