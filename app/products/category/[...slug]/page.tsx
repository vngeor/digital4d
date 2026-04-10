import { notFound } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/app/components/Header"
import { ProductCatalog } from "@/app/components/ProductCatalog"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import Footer from "@/app/components/Footer"
import { sanitizeHtml } from "@/lib/sanitize"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { ArrowLeft } from "lucide-react"
import { isCategoryMatch } from "@/lib/couponHelpers"
import type { Metadata } from "next"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

interface PageProps {
    params: Promise<{ slug: string[] }>
}

const COLOR_CLASSES: Record<string, string> = {
    cyan: "bg-cyan-500/20 text-cyan-400",
    purple: "bg-purple-500/20 text-purple-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/20 text-amber-400",
    red: "bg-red-500/20 text-red-400",
    blue: "bg-blue-500/20 text-blue-400",
    pink: "bg-pink-500/20 text-pink-400",
    orange: "bg-orange-500/20 text-orange-400",
    teal: "bg-teal-500/20 text-teal-400",
    indigo: "bg-indigo-500/20 text-indigo-400",
    rose: "bg-rose-500/20 text-rose-400",
    lime: "bg-lime-500/20 text-lime-400",
    sky: "bg-sky-500/20 text-sky-400",
    violet: "bg-violet-500/20 text-violet-400",
    fuchsia: "bg-fuchsia-500/20 text-fuchsia-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
}

export async function generateStaticParams() {
    const categories = await prisma.productCategory.findMany({
        select: { slug: true, parent: { select: { slug: true } } },
    })
    return categories.map(cat => ({
        slug: cat.parent ? [cat.parent.slug, cat.slug] : [cat.slug],
    }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug: slugSegments } = await params
    const categorySlug = slugSegments[slugSegments.length - 1]
    const locale = await getLocale()

    const category = await prisma.productCategory.findFirst({ where: { slug: categorySlug } })
    if (!category) return { title: "Category Not Found" }

    const name = locale === "bg" ? category.nameBg : locale === "es" ? category.nameEs : category.nameEn
    const desc = locale === "bg" ? category.descBg : locale === "es" ? category.descEs : category.descEn
    const description = desc ? desc.slice(0, 160).replace(/<[^>]*>/g, "") : `${name} - digital4d`

    return {
        title: `${name} | digital4d`,
        description,
        openGraph: {
            title: `${name} | digital4d`,
            description,
            type: "website",
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
            images: category.image ? [{ url: category.image, width: 800, height: 600, alt: name }] : undefined,
        },
    }
}

export default async function CategoryPage({ params }: PageProps) {
    const { slug: slugSegments } = await params
    const categorySlug = slugSegments[slugSegments.length - 1]
    if (!SLUG_PATTERN.test(categorySlug)) notFound()

    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch category first (products depend on its slugs)
    const category = await prisma.productCategory.findFirst({
        where: { slug: categorySlug },
        include: { parent: { include: { children: { orderBy: { order: "asc" } } } }, children: { orderBy: { order: "asc" } } },
    })

    if (!category) notFound()

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg": return item.nameBg
            case "es": return item.nameEs
            default: return item.nameEn
        }
    }

    const getLocalizedDesc = (item: { descBg?: string | null; descEn?: string | null; descEs?: string | null }) => {
        switch (locale) {
            case "bg": return item.descBg
            case "es": return item.descEs
            default: return item.descEn
        }
    }

    const categoryName = getLocalizedName(category)
    const categoryDesc = getLocalizedDesc(category)
    const displayTitle = category.title || categoryName
    const alignClass = category.titleAlign === "center" ? "text-center" : category.titleAlign === "right" ? "text-right" : "text-left"
    const parentName = category.parent ? getLocalizedName(category.parent) : null
    const isParent = !category.parentId && category.children.length > 0

    // Compute categorySlugs here (depends on category)
    const categorySlugs = isParent
        ? [categorySlug, ...category.children.map(c => c.slug)]
        : [categorySlug]

    // Parallel data fetching (independent queries)
    const now = new Date()
    const [products, allCategories, promotedCouponsRaw, session] = await Promise.all([
        prisma.product.findMany({
            where: { category: { in: categorySlugs }, published: true },
            orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
            include: {
                brand: true,
                variants: { include: { color: true }, orderBy: { order: "asc" } },
                packages: { include: { weight: { select: { label: true } }, packageVariants: { select: { variantId: true, status: true } } }, orderBy: { order: "asc" } },
            },
        }),
        prisma.productCategory.findMany({
            include: { children: true, parent: true },
            orderBy: [{ order: "asc" }],
        }),
        prisma.coupon.findMany({
            where: {
                showOnProduct: true,
                active: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                ],
            },
            select: { code: true, type: true, value: true, currency: true, productIds: true, categoryIds: true, brandIds: true, allowOnSale: true, expiresAt: true },
        }),
        auth(),
    ])

    const couponMap: Record<string, { code: string; type: string; value: string; currency: string | null; expiresAt: string | null }> = {}
    const flatCategories = allCategories.map(c => ({ id: c.id, slug: c.slug, parentId: c.parentId }))

    const toCouponBadge = (c: typeof promotedCouponsRaw[0]) => ({
        code: c.code, type: c.type, value: c.value.toString(), currency: c.currency, expiresAt: c.expiresAt?.toISOString() ?? null
    })

    for (const product of products) {
        const isOnSale = product.onSale && product.salePrice
        // 1. Product match
        const direct = promotedCouponsRaw.find(c =>
            c.productIds.length > 0 && c.productIds.includes(product.id) && !(isOnSale && !c.allowOnSale)
        )
        if (direct) { couponMap[product.id] = toCouponBadge(direct); continue }
        // 2. Category match
        const byCategory = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) > 0 &&
            !(isOnSale && !c.allowOnSale) &&
            isCategoryMatch(product.category, c.categoryIds ?? [], flatCategories)
        )
        if (byCategory) { couponMap[product.id] = toCouponBadge(byCategory); continue }
        // 3. Brand match
        const byBrand = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) > 0 && product.brand?.id &&
            (c.brandIds ?? []).includes(product.brand.id) && !(isOnSale && !c.allowOnSale)
        )
        if (byBrand) { couponMap[product.id] = toCouponBadge(byBrand); continue }
        // 4. Global
        const global = promotedCouponsRaw.find(c =>
            c.productIds.length === 0 && (c.categoryIds?.length ?? 0) === 0 &&
            (c.brandIds?.length ?? 0) === 0 && !(isOnSale && !c.allowOnSale)
        )
        if (global) { couponMap[product.id] = toCouponBadge(global) }
    }

    // Wishlist depends on session
    let wishlistedProductIds: string[] = []
    if (session?.user?.id) {
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId: session.user.id },
            select: { productId: true },
        })
        wishlistedProductIds = wishlistItems.map(w => w.productId)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            <BackgroundOrbs />
            <Header />

            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {/* Back button */}
                    <Link
                        href="/products"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 sm:mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    {/* Category Image Banner */}
                    {category.image && (
                        <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-6 sm:mb-8">
                            <Image
                                src={category.image}
                                alt={categoryName}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 1200px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                        </div>
                    )}

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                        <Link href="/products" className="hover:text-emerald-400 transition-colors">
                            {t("products.title")}
                        </Link>
                        {parentName && (
                            <>
                                <span>→</span>
                                <Link
                                    href={`/products/category/${category.parent?.slug}`}
                                    className="hover:text-emerald-400 transition-colors"
                                >
                                    {parentName}
                                </Link>
                            </>
                        )}
                        <span>→</span>
                        <span className="text-emerald-400">{categoryName}</span>
                    </nav>

                    {/* Category Name */}
                    <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words ${alignClass}`}>
                        {displayTitle}
                    </h1>

                    {/* Category Description */}
                    {categoryDesc && (
                        <div
                            className="prose prose-invert prose-emerald max-w-none mt-4 text-slate-300"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(categoryDesc) }}
                        />
                    )}
                </div>
            </section>

            {/* Products Grid */}
            <ProductCatalog
                products={JSON.parse(JSON.stringify(products))}
                categories={JSON.parse(JSON.stringify(allCategories))}
                locale={locale}
                wishlistedProductIds={wishlistedProductIds}
                couponMap={couponMap}
                subcategories={
                    isParent
                        ? JSON.parse(JSON.stringify(category.children))
                        : category.parent?.children
                            ? JSON.parse(JSON.stringify(category.parent.children))
                            : undefined
                }
                initialCategory={isParent ? categorySlug : category.parent?.slug || categorySlug}
                activeSubcategory={!isParent ? categorySlug : undefined}
            />

            <Footer />
        </div>
    )
}
