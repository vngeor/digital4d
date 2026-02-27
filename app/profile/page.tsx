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
    backToHome: t("backToHome"),
    addBirthday: t("addBirthday"),
    addBirthdayButton: t("addBirthdayButton"),
  }

  return (
    <ProfileClient
      user={JSON.parse(JSON.stringify(user))}
      translations={translations}
    />
  )
}