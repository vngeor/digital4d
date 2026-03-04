import { getTranslations, getLocale } from "next-intl/server"
import { SearchResultsClient } from "./SearchResultsClient"
import prisma from "@/lib/prisma"
import type { Metadata } from "next"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
    const t = await getTranslations("search")
    const params = await searchParams
    const query = params.q || ""
    return {
        title: query ? `${t("searchResultsFor")} "${query}"` : t("searchResults"),
    }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const t = await getTranslations("search")
    const pt = await getTranslations("products")
    const locale = await getLocale()
    const params = await searchParams
    const initialQuery = params.q || ""

    const categories = await prisma.productCategory.findMany({
        orderBy: [{ order: "asc" }],
    })

    const translations = {
        searchResults: t("searchResults"),
        searchResultsFor: t("searchResultsFor"),
        placeholder: t("placeholder"),
        products: t("products"),
        news: t("news"),
        services: t("services"),
        pages: t("pages"),
        noResults: t("noResults"),
        noResultsDescription: t("noResultsDescription"),
        resultCount: t("resultCount"),
        viewAll: t("viewAll"),
        onSale: pt("onSale"),
        from: pt("from"),
    }

    return (
        <SearchResultsClient
            initialQuery={initialQuery}
            locale={locale}
            translations={translations}
            categories={JSON.parse(JSON.stringify(categories))}
        />
    )
}
