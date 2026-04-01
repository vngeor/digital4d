import { notFound, redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import { WishlistButton } from "../../components/WishlistButton"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { ProductDetailClient } from "../../components/ProductDetailClient"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import { buildProductUrl } from "@/lib/productUrl"
import { ArrowLeft } from "lucide-react"
import { sanitizeHtml } from "@/lib/sanitize"
import type { Product } from "@prisma/client"
import type { Metadata } from "next"

interface PageProps {
    params: Promise<{ slug: string[] }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug: slugSegments } = await params
    const productSlug = slugSegments[slugSegments.length - 1]
    const locale = await getLocale()

    const product = await prisma.product.findFirst({
        where: { slug: productSlug, published: true }
    })

    if (!product) {
        return { title: "Product Not Found" }
    }

    const name = locale === "bg" ? product.nameBg : locale === "es" ? product.nameEs : product.nameEn
    const desc = locale === "bg" ? product.descBg : locale === "es" ? product.descEs : product.descEn
    const description = desc ? desc.slice(0, 160).replace(/<[^>]*>/g, "") : `${name} - digital4d`

    return {
        title: name,
        description,
        openGraph: {
            title: `${name} | digital4d`,
            description,
            type: "website",
            locale: locale === "bg" ? "bg_BG" : locale === "es" ? "es_ES" : "en_US",
            images: product.image ? [
                {
                    url: product.image,
                    width: 800,
                    height: 800,
                    alt: name,
                }
            ] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title: name,
            description,
            images: product.image ? [product.image] : undefined,
        },
    }
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

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
    const { slug: slugSegments } = await params
    const productSlug = slugSegments[slugSegments.length - 1]
    const resolvedSearchParams = await searchParams
    const nonce = (await headers()).get("x-nonce") || ""
    const couponCode = typeof resolvedSearchParams.coupon === "string" ? resolvedSearchParams.coupon : undefined
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the product by slug (last segment)
    const product = await prisma.product.findFirst({
        where: {
            slug: productSlug,
            published: true,
        },
        include: { variants: { orderBy: { order: "asc" } }, brand: true },
    })

    if (!product) {
        notFound()
    }

    // Build canonical hierarchical URL and redirect if path doesn't match
    const productCategory = await prisma.productCategory.findFirst({
        where: { slug: product.category },
        select: { parent: { select: { slug: true } } },
    })
    const canonicalPath = buildProductUrl(
        product.slug,
        product.category,
        product.brand?.slug,
        productCategory?.parent?.slug
    )
    const currentPath = `/products/${slugSegments.join("/")}`
    if (currentPath !== canonicalPath) {
        const queryString = couponCode ? `?coupon=${couponCode}` : ""
        redirect(canonicalPath + queryString)
    }

    // Fetch promoted coupons for this product
    const now = new Date()
    const promotedCouponsRaw = await prisma.coupon.findMany({
        where: {
            showOnProduct: true,
            active: true,
            OR: [
                { productIds: { has: product.id } },
                { productIds: { isEmpty: true } },
            ],
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
        },
        select: { code: true, type: true, value: true, currency: true, expiresAt: true, allowOnSale: true },
        take: 3,
    })

    // Filter out coupons that don't allow sale products (if product is on sale)
    const promotedCoupons = promotedCouponsRaw
        .filter(c => !(product.onSale && product.salePrice && !c.allowOnSale))
        .map(c => ({
            code: c.code,
            type: c.type,
            value: c.value.toString(),
            currency: c.currency,
            expiresAt: c.expiresAt?.toISOString() || null,
        }))

    // Fetch the category with parent for breadcrumb display
    const category = await prisma.productCategory.findFirst({
        where: { slug: product.category },
        include: { parent: true },
    })

    // Check wishlist state for authenticated user
    const session = await auth()
    let isWishlisted = false
    if (session?.user?.id) {
        const wishlistItem = await prisma.wishlistItem.findUnique({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: product.id,
                },
            },
        })
        isWishlisted = !!wishlistItem
    }

    // Fetch related products: manual selection or auto fallback (same category)
    let relatedProducts
    if (product.relatedProductIds && product.relatedProductIds.length > 0) {
        relatedProducts = await prisma.product.findMany({
            where: { id: { in: product.relatedProductIds }, published: true },
            include: { brand: { select: { slug: true, nameBg: true, nameEn: true, nameEs: true } } },
            take: 6,
        })
    } else {
        // Auto fallback: same category first, then sibling subcategories under same parent
        const siblingCategories: string[] = [product.category]
        if (productCategory?.parent) {
            const siblings = await prisma.productCategory.findMany({
                where: { parent: { slug: productCategory.parent.slug } },
                select: { slug: true },
            })
            for (const s of siblings) {
                if (!siblingCategories.includes(s.slug)) siblingCategories.push(s.slug)
            }
        }
        relatedProducts = await prisma.product.findMany({
            where: {
                category: { in: siblingCategories },
                published: true,
                NOT: { id: product.id }
            },
            take: 4,
            orderBy: [{ featured: "desc" }, { order: "asc" }],
            include: { brand: { select: { slug: true, nameBg: true, nameEn: true, nameEs: true } } },
        })
    }

    // Build URLs for related products (handle cross-category products)
    const relatedProductUrls: Record<string, string> = {}
    const relatedCategorySlugs = [...new Set(relatedProducts.map(p => p.category))]
    const relatedCategories = relatedCategorySlugs.length > 0
        ? await prisma.productCategory.findMany({
            where: { slug: { in: relatedCategorySlugs } },
            select: { slug: true, parent: { select: { slug: true } } },
        })
        : []
    const categoryParentMap: Record<string, string | null> = {}
    for (const cat of relatedCategories) {
        categoryParentMap[cat.slug] = cat.parent?.slug || null
    }
    for (const related of relatedProducts) {
        relatedProductUrls[related.id] = buildProductUrl(
            related.slug,
            related.category,
            related.brand?.slug,
            categoryParentMap[related.category] ?? null
        )
    }

    // Build coupon map for related product card badges
    // Fetch all promoted coupons (broader query than the product-specific one above)
    const allPromotedCoupons = await prisma.coupon.findMany({
        where: {
            showOnProduct: true,
            active: true,
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
        },
        select: { type: true, value: true, currency: true, productIds: true, allowOnSale: true },
    })

    const relatedCouponMap: Record<string, { type: string; value: string; currency: string | null }> = {}
    const relGlobalCoupons = allPromotedCoupons.filter(c => c.productIds.length === 0)
    const relSpecificCoupons = allPromotedCoupons.filter(c => c.productIds.length > 0)

    for (const related of relatedProducts) {
        const isOnSale = related.onSale && related.salePrice
        const specific = relSpecificCoupons.find(c =>
            c.productIds.includes(related.id) && !(isOnSale && !c.allowOnSale)
        )
        if (specific) {
            relatedCouponMap[related.id] = { type: specific.type, value: specific.value.toString(), currency: specific.currency }
            continue
        }
        const global = relGlobalCoupons.find(c => !(isOnSale && !c.allowOnSale))
        if (global) {
            relatedCouponMap[related.id] = { type: global.type, value: global.value.toString(), currency: global.currency }
        }
    }

    const getLocalizedName = (item: { nameBg: string; nameEn: string; nameEs: string }) => {
        switch (locale) {
            case "bg":
                return item.nameBg
            case "es":
                return item.nameEs
            default:
                return item.nameEn
        }
    }

    const getLocalizedDesc = (item: { descBg: string | null; descEn: string | null; descEs: string | null }) => {
        switch (locale) {
            case "bg":
                return item.descBg
            case "es":
                return item.descEs
            default:
                return item.descEn
        }
    }

    const productName = getLocalizedName(product)
    const productDesc = getLocalizedDesc(product)
    const categoryName = category ? getLocalizedName(category) : product.category
    const parentCategoryName = category?.parent ? getLocalizedName(category.parent) : null
    const categoryColor = category?.color || "gray"

    const formatPrice = () => {
        if (product.priceType === "quote") return t("products.requestQuote")
        if (!product.price) return null
        const price = parseFloat(product.price.toString())
        const prefix = product.priceType === "from" ? t("products.from") + " " : ""
        return `${prefix}${price.toFixed(2)} ${product.currency}`
    }

    const price = formatPrice()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.digital4d.eu"
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()

    const productJsonLd: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: productName,
        description: productDesc ? stripHtml(productDesc).slice(0, 200) : productName,
        image: product.image || undefined,
        sku: product.sku,
        brand: { "@type": "Brand", name: product.brand?.nameEn || "digital4d" },
        category: categoryName,
        url: `${siteUrl}${canonicalPath}`,
    }

    if (product.priceType !== "quote" && product.price) {
        const offerPrice = product.onSale && product.salePrice
            ? parseFloat(product.salePrice.toString())
            : parseFloat(product.price.toString())
        productJsonLd.offers = {
            "@type": "Offer",
            price: offerPrice.toFixed(2),
            priceCurrency: product.currency,
            availability: product.status === "in_stock" ? "https://schema.org/InStock"
                : product.status === "pre_order" ? "https://schema.org/PreOrder"
                : product.status === "sold_out" ? "https://schema.org/SoldOut"
                : "https://schema.org/OutOfStock",
            url: `${siteUrl}${canonicalPath}`,
        }
    }

    // Build breadcrumb items for JSON-LD and visible breadcrumb
    const breadcrumbItems: Array<{ name: string; href?: string }> = [
        { name: "Home", href: "/" },
        { name: t("products.title"), href: "/products" },
    ]
    if (parentCategoryName && category?.parent?.slug) {
        breadcrumbItems.push({ name: parentCategoryName, href: `/products/category/${category.parent.slug}` })
    }
    if (categoryName) {
        const catPath = category?.parent?.slug
            ? `/products/category/${category.parent.slug}/${product.category}`
            : `/products/category/${product.category}`
        breadcrumbItems.push({ name: categoryName, href: catPath })
    }
    if (product.brand) {
        breadcrumbItems.push({ name: getLocalizedName(product.brand), href: `/brands/${product.brand.slug}` })
    }
    breadcrumbItems.push({ name: productName })

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
        })),
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-clip">
            {/* JSON-LD: Product + Breadcrumb */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]) }}
            />

            <BackgroundOrbs />

            <Header />

            {/* Page Header */}
            <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 px-4">
                <div className="mx-auto max-w-6xl">
                    {/* Mobile: Simple back arrow */}
                    <Link
                        href="/products"
                        className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all mb-3 relative z-10 touch-manipulation"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    {/* Desktop: Full breadcrumb matching URL hierarchy */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 mb-6 flex-wrap">
                        {breadcrumbItems.map((item, i) => (
                            <span key={i} className="flex items-center gap-2">
                                {i > 0 && <span>/</span>}
                                {item.href ? (
                                    <Link href={item.href} className="hover:text-emerald-400 transition-colors">
                                        {item.name}
                                    </Link>
                                ) : (
                                    <span className="text-slate-300">{item.name}</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Product Content */}
            <section className="relative py-8 px-4">
                <div className="mx-auto max-w-6xl">
                    <ProductDetailClient
                        product={JSON.parse(JSON.stringify(product))}
                        productName={productName}
                        variants={JSON.parse(JSON.stringify(product.variants))}
                        locale={locale}
                        mainImage={product.image}
                        gallery={product.gallery || []}
                        initialCouponCode={couponCode}
                        promotedCoupons={promotedCoupons}
                        isWishlisted={isWishlisted}
                    >
                        {/* Category Badge with breadcrumb */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {parentCategoryName && (
                                <>
                                    <Link
                                        href={`/products/category/${category?.parent?.slug || ""}`}
                                        className={`inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium hover:opacity-80 transition-opacity ${COLOR_CLASSES[category?.parent?.color || "gray"] || "bg-gray-500/20 text-gray-400"}`}
                                    >
                                        {parentCategoryName}
                                    </Link>
                                    <span className="text-gray-500 text-xs">→</span>
                                </>
                            )}
                            <Link
                                href={`/products/category/${product.category}`}
                                className={`inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium hover:opacity-80 transition-opacity ${COLOR_CLASSES[categoryColor] || "bg-gray-500/20 text-gray-400"}`}
                            >
                                {categoryName}
                            </Link>
                        </div>

                        {/* Brand */}
                        {product.brand && (
                            <Link
                                href={`/brands/${product.brand.slug}`}
                                className="text-sm text-slate-400 font-medium hover:text-emerald-400 transition-colors"
                            >
                                {getLocalizedName(product.brand)}
                            </Link>
                        )}

                        {/* Name + Wishlist */}
                        <div className="flex items-start gap-3">
                            <h1 className="flex-1 text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
                                {productName}
                            </h1>
                            <WishlistButton
                                productId={product.id}
                                initialWishlisted={isWishlisted}
                                size="lg"
                                translations={{
                                    addToWishlist: t("products.addToWishlist"),
                                    removeFromWishlist: t("products.removeFromWishlist"),
                                    loginToWishlist: t("products.loginToWishlist"),
                                }}
                            />
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 md:gap-2">
                            {product.onSale && (
                                <>
                                    <Link
                                        href="/products?sale=true"
                                        className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                                    >
                                        {t("products.onSale")}
                                    </Link>
                                    {product.price && product.salePrice && (
                                        <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium bg-red-500 text-white">
                                            -{Math.round((1 - parseFloat(product.salePrice.toString()) / parseFloat(product.price.toString())) * 100)}%
                                        </span>
                                    )}
                                </>
                            )}
                            <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium ${
                                product.status === "in_stock" ? "bg-emerald-500/20 text-emerald-400"
                                : product.status === "pre_order" ? "bg-purple-500/20 text-purple-400"
                                : product.status === "coming_soon" ? "bg-blue-500/20 text-blue-400"
                                : product.status === "sold_out" ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}>
                                {product.status === "in_stock" ? t("products.inStock")
                                : product.status === "pre_order" ? t("products.preOrder")
                                : product.status === "coming_soon" ? t("products.comingSoon")
                                : product.status === "sold_out" ? t("products.soldOut")
                                : t("products.outOfStock")}
                            </span>
                            {product.bestSeller && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[10px] md:text-xs font-bold bg-amber-500 text-white shadow-lg">
                                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                    {t("products.bestSeller")}
                                </span>
                            )}
                        </div>

                        {/* Price */}
                        <div className="p-3 sm:p-4 md:p-6 rounded-lg md:rounded-xl bg-white/5 border border-white/10">
                            {product.onSale && product.salePrice ? (
                                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                                    <span className="text-xl sm:text-2xl md:text-4xl font-bold text-red-400">
                                        {parseFloat(product.salePrice.toString()).toFixed(2)} {product.currency}
                                    </span>
                                    <span className="text-sm sm:text-base md:text-xl text-gray-500 line-through">
                                        {price}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xl sm:text-2xl md:text-4xl font-bold text-white">
                                    {price || "-"}
                                </span>
                            )}
                        </div>
                    </ProductDetailClient>

                    {/* Description - full width below the grid */}
                    {productDesc && (
                        <div className="mt-6 md:mt-10">
                            <h2 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3">
                                {t("products.description")}
                            </h2>
                            <div
                                className="prose prose-invert prose-slate max-w-none text-sm md:text-base text-slate-300 leading-relaxed break-words overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(productDesc) }}
                            />
                        </div>
                    )}

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-8 md:mt-16">
                            <h2 className="text-lg md:text-2xl font-bold text-white mb-4 md:mb-8">
                                {t("products.relatedProducts")}
                            </h2>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-6 relative z-10">
                                {relatedProducts.map((related) => {
                                    const relatedName = getLocalizedName(related)
                                    const relatedPrice = related.price
                                        ? `${parseFloat(related.price.toString()).toFixed(2)} ${related.currency}`
                                        : "-"

                                    // Calculate discount percentage for related products
                                    const relatedDiscountPercent = related.onSale && related.price && related.salePrice
                                        ? Math.round((1 - parseFloat(related.salePrice.toString()) / parseFloat(related.price.toString())) * 100)
                                        : 0

                                    return (
                                        <Link
                                            key={related.id}
                                            href={relatedProductUrls[related.id] || `/products/${related.slug}`}
                                            className="group glass rounded-xl md:rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="relative h-28 md:h-40 overflow-hidden bg-white/5">
                                                {related.image ? (
                                                    <img
                                                        src={related.image}
                                                        alt={relatedName}
                                                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {/* Status overlay for related products */}
                                                {(related.status === "sold_out" || related.status === "out_of_stock" || related.status === "coming_soon") && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                                        <div className={`px-3 py-1 -rotate-12 shadow-lg ${
                                                            related.status === "sold_out" ? "bg-red-600/80"
                                                            : related.status === "coming_soon" ? "bg-blue-600/80"
                                                            : "bg-gray-600/80"
                                                        }`}>
                                                            <span className="text-white font-bold text-[10px] tracking-wider uppercase">
                                                                {related.status === "sold_out" ? t("products.soldOut")
                                                                : related.status === "coming_soon" ? t("products.comingSoon")
                                                                : t("products.outOfStock")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Top-left: Featured + NEW badges */}
                                                {(related.featured || (Date.now() - new Date(related.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000) && (
                                                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                                        {related.featured && (
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-500/90 rounded-full flex items-center justify-center shadow-lg">
                                                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        {(Date.now() - new Date(related.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000 && (
                                                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-cyan-500 rounded-md text-[10px] sm:text-xs font-bold text-white shadow-lg">NEW</span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Best Seller badge */}
                                                {related.bestSeller && (
                                                    <div className="absolute bottom-2 right-2">
                                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-lg"><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>{t("products.bestSeller")}</span>
                                                    </div>
                                                )}
                                                {/* Sale badges for related products */}
                                                {related.onSale && (
                                                    <div className="absolute top-2 right-2 flex gap-1">
                                                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-500 text-white">
                                                            {t("products.onSale")}
                                                        </span>
                                                        {relatedDiscountPercent > 0 && (
                                                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-500 text-white">
                                                                -{relatedDiscountPercent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Coupon Badge */}
                                                {relatedCouponMap[related.id] && (
                                                    <div className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2">
                                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[10px] md:text-xs font-bold bg-orange-500 text-white shadow-lg">
                                                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                                            </svg>
                                                            -{relatedCouponMap[related.id].type === "percentage"
                                                                ? `${relatedCouponMap[related.id].value}%`
                                                                : `${relatedCouponMap[related.id].value} ${relatedCouponMap[related.id].currency || "EUR"}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 md:p-4">
                                                <h3 className="font-semibold text-xs md:text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                    {relatedName}
                                                </h3>
                                                {related.brand && (
                                                    <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                                                        {getLocalizedName(related.brand)}
                                                    </p>
                                                )}
                                                {(() => {
                                                    const desc = getLocalizedDesc(related)
                                                    if (!desc) return null
                                                    const text = desc.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
                                                    if (!text) return null
                                                    return (
                                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                                            {text.length > 100 ? text.substring(0, 100) + "..." : text}
                                                        </p>
                                                    )
                                                })()}
                                                {/* Price */}
                                                <div className="mt-1 md:mt-2">
                                                    {related.priceType === "quote" ? (
                                                        <span className="text-[10px] md:text-sm text-amber-400 font-medium">
                                                            {t("products.requestQuote")}
                                                        </span>
                                                    ) : related.onSale && related.salePrice ? (
                                                        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                                                            <span className="text-xs md:text-base font-bold text-red-400">
                                                                {parseFloat(related.salePrice.toString()).toFixed(2)} {related.currency}
                                                            </span>
                                                            <span className="text-[10px] md:text-xs text-gray-500 line-through">
                                                                {relatedPrice}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs md:text-base font-bold text-white">
                                                            {relatedPrice}
                                                        </span>
                                                    )}
                                                </div>
                                                {!["in_stock", "pre_order"].includes(related.status) ? (
                                                    <span className="w-full flex items-center justify-center gap-1.5 mt-1 md:mt-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                        </svg>
                                                        {t("products.notifyMeShort")}
                                                    </span>
                                                ) : related.fileType === "digital" ? (
                                                    <span className="w-full flex items-center justify-center gap-1.5 mt-1 md:mt-2 px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        {t("products.buyNow")}
                                                    </span>
                                                ) : related.fileType === "service" || related.priceType === "quote" ? (
                                                    <span className="w-full flex items-center justify-center gap-1.5 mt-1 md:mt-2 px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                        {t("products.getQuote")}
                                                    </span>
                                                ) : (
                                                    <span className="w-full flex items-center justify-center gap-1.5 mt-1 md:mt-2 px-2 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium">
                                                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        {t("products.orderNow")}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Back Link */}
                    <div className="mt-12 relative z-10">
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors touch-manipulation"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {t("products.backToProducts")}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass border-t border-white/10 py-8 mt-12">
                <div className="mx-auto max-w-6xl px-4 text-center text-slate-400">
                    <p>&copy; 2024 digital4d. {t("footer.rights")}</p>
                </div>
            </footer>
        </div>
    )
}

export async function generateStaticParams() {
    const products = await prisma.product.findMany({
        where: { published: true },
        select: { slug: true, category: true, brand: { select: { slug: true } } },
    })

    const categories = await prisma.productCategory.findMany({
        select: { slug: true, parent: { select: { slug: true } } },
    })
    const categoryParentMap = new Map<string, string | null>()
    for (const cat of categories) {
        categoryParentMap.set(cat.slug, cat.parent?.slug || null)
    }

    return products.map((product) => {
        const segments: string[] = []
        const parentSlug = categoryParentMap.get(product.category)
        if (parentSlug) segments.push(parentSlug)
        segments.push(product.category)
        if (product.brand?.slug) segments.push(product.brand.slug)
        segments.push(product.slug)
        return { slug: segments }
    })
}
