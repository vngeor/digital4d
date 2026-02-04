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
      country: true,
      city: true,
      address: true,
      birthDate: true,
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

  // Fetch quote requests by user email
  const quotes = await prisma.quoteRequest.findMany({
    where: { email: user.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      quotedPrice: true,
      message: true,
      adminNotes: true,
      userResponse: true,
      createdAt: true,
      product: {
        select: {
          nameEn: true,
          nameBg: true,
          nameEs: true,
          slug: true,
        },
      },
    },
  })

  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    personalInfo: t("personalInfo"),
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    country: t("country"),
    city: t("city"),
    address: t("address"),
    birthDate: t("birthDate"),
    noPhone: t("noPhone"),
    noCountry: t("noCountry"),
    noCity: t("noCity"),
    noAddress: t("noAddress"),
    noBirthDate: t("noBirthDate"),
    memberSince: t("memberSince"),
    editProfile: t("editProfile"),
    editProfileTitle: t("editProfileTitle"),
    phonePlaceholder: t("phonePlaceholder"),
    countryPlaceholder: t("countryPlaceholder"),
    cityPlaceholder: t("cityPlaceholder"),
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
    quoteRequests: t("quoteRequests"),
    noQuotes: t("noQuotes"),
    noQuotesDescription: t("noQuotesDescription"),
    quotePending: t("quotePending"),
    quoteQuoted: t("quoteQuoted"),
    quoteAccepted: t("quoteAccepted"),
    quoteRejected: t("quoteRejected"),
    quotedPrice: t("quotedPrice"),
    viewProduct: t("viewProduct"),
    rejectionReason: t("rejectionReason"),
    acceptOffer: t("acceptOffer"),
    declineOffer: t("declineOffer"),
    counterOffer: t("counterOffer"),
    yourMessage: t("yourMessage"),
    sendCounterOffer: t("sendCounterOffer"),
    quoteCounterOffer: t("quoteCounterOffer"),
    quoteUserDeclined: t("quoteUserDeclined"),
    respondToOffer: t("respondToOffer"),
    counterOfferSent: t("counterOfferSent"),
  }

  return (
    <ProfileClient
      user={JSON.parse(JSON.stringify(user))}
      orders={JSON.parse(JSON.stringify(orders))}
      quotes={JSON.parse(JSON.stringify(quotes))}
      translations={translations}
    />
  )
}