import { notFound, redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import Link from "next/link"
import { Header } from "../../components/Header"
import { WishlistButton } from "../../components/WishlistButton"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { ProductDetailClient } from "../../components/ProductDetailClient"
import { RecentlyViewedTracker } from "../../components/RecentlyViewedTracker"
import { BackgroundOrbs } from "@/app/components/BackgroundOrbs"
import { buildProductUrl } from "@/lib/productUrl"
import { ArrowLeft } from "lucide-react"
import { ProductPanelBadges } from "@/app/components/ProductBadges"
import { computeHasBulkDiscount } from "@/lib/badgeHelpers"
import { RelatedProductsCarousel, type RelatedCard } from "@/app/components/RelatedProductsCarousel"
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
    const sizeParam = typeof resolvedSearchParams.weight === "string" ? resolvedSearchParams.weight : undefined
    const t = await getTranslations()
    const locale = await getLocale()

    // Fetch the product by slug (last segment)
    const product = await prisma.product.findFirst({
        where: {
            slug: productSlug,
            published: true,
        },
        include: {
            variants: { include: { color: true }, orderBy: { order: "asc" } },
            packages: {
                orderBy: { order: "asc" },
                include: { weight: true, packageVariants: { select: { variantId: true, status: true } } },
            },
            brand: true,
        },
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
        const params = new URLSearchParams()
        if (couponCode) params.set("coupon", couponCode)
        if (sizeParam) params.set("weight", sizeParam)
        const queryString = params.toString() ? `?${params.toString()}` : ""
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
        select: { code: true, type: true, value: true, currency: true, expiresAt: true, allowOnSale: true, minPurchase: true },
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
            minPurchase: c.minPurchase ? Number(c.minPurchase) : null,
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
            include: {
                brand: { select: { slug: true, nameBg: true, nameEn: true, nameEs: true } },
                variants: { select: { image: true, status: true }, orderBy: { order: "asc" } },
                packages: { select: { bulkDiscountTiers: true } },
            },
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
            include: {
                brand: { select: { slug: true, nameBg: true, nameEn: true, nameEs: true } },
                variants: { select: { image: true, status: true }, orderBy: { order: "asc" } },
                packages: { select: { bulkDiscountTiers: true } },
            },
        })
    }

    // Compute display images for related products (first available variant image, or main product image)
    const relatedForDisplay = relatedProducts.map(p => ({
        ...p,
        image: p.variants.find(v => ["in_stock", "pre_order"].includes(v.status))?.image || p.image,
    }))

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

    const relatedCards: RelatedCard[] = relatedForDisplay.map(r => ({
        id: r.id,
        name: locale === "bg" ? (r.nameBg || r.nameEn) : locale === "es" ? (r.nameEs || r.nameEn) : r.nameEn,
        brandName: r.brand
            ? (locale === "bg" ? (r.brand.nameBg || r.brand.nameEn) : locale === "es" ? (r.brand.nameEs || r.brand.nameEn) : r.brand.nameEn)
            : null,
        desc: getLocalizedDesc(r),
        image: r.image,
        price: r.price ? r.price.toString() : null,
        salePrice: r.salePrice ? r.salePrice.toString() : null,
        onSale: r.onSale,
        currency: r.currency,
        priceType: r.priceType,
        fileType: r.fileType,
        status: r.status,
        featured: r.featured,
        bestSeller: r.bestSeller,
        isNew: (Date.now() - new Date(r.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000,
        url: relatedProductUrls[r.id] || `/products/${r.slug}`,
        coupon: relatedCouponMap[r.id] ?? null,
        bulkDiscountTiers:
            (r as { bulkDiscountTiers?: string | null }).bulkDiscountTiers ||
            (r as { packages?: Array<{ bulkDiscountTiers?: string | null }> }).packages?.find(pkg => pkg.bulkDiscountTiers)?.bulkDiscountTiers ||
            "",
        bulkDiscountExpiresAt: (r as { bulkDiscountExpiresAt?: Date | null }).bulkDiscountExpiresAt?.toISOString() || null,
    }))

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

    const NEW_CUTOFF = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // For recently viewed: when packages exist, use the lowest-priced package instead of base product price
    const lowestPkg = product.packages.length > 0
        ? product.packages.reduce((min, p) => {
            const eff = parseFloat((p.salePrice ?? p.price).toString())
            const minEff = parseFloat((min.salePrice ?? min.price).toString())
            return eff < minEff ? p : min
        }, product.packages[0])
        : null

    const trackerProduct = {
        id: product.id,
        productUrl: canonicalPath,
        nameEn: product.nameEn,
        nameBg: product.nameBg,
        nameEs: product.nameEs,
        descEn: product.descEn,
        descBg: product.descBg,
        descEs: product.descEs,
        image: product.variants.find(v => ["in_stock", "pre_order"].includes(v.status))?.image || product.image,
        price: lowestPkg ? lowestPkg.price.toString() : (product.price?.toString() || "0"),
        salePrice: lowestPkg ? (lowestPkg.salePrice?.toString() || null) : (product.salePrice?.toString() || null),
        onSale: lowestPkg ? !!lowestPkg.salePrice : product.onSale,
        currency: product.currency,
        priceType: product.priceType,
        fileType: product.fileType,
        category: product.category,
        categoryColor: category?.color || "emerald",
        categoryNameEn: category?.nameEn || product.category,
        categoryNameBg: category?.nameBg || product.category,
        categoryNameEs: category?.nameEs || product.category,
        status: product.status,
        featured: product.featured,
        bestSeller: product.bestSeller,
        isNew: product.createdAt >= NEW_CUTOFF,
        brandNameEn: product.brand?.nameEn || null,
        brandNameBg: product.brand?.nameBg || null,
        brandNameEs: product.brand?.nameEs || null,
        brandSlug: product.brand?.slug || null,
        bulkDiscountTiers: product.bulkDiscountTiers ||
            product.packages?.find((pkg: { bulkDiscountTiers?: string | null }) => pkg.bulkDiscountTiers)?.bulkDiscountTiers || "",
        bulkDiscountExpiresAt: (product as { bulkDiscountExpiresAt?: Date | null }).bulkDiscountExpiresAt?.toISOString() || null,
        slug: product.slug,
        createdAt: product.createdAt.toISOString(),
        gallery: product.gallery || [],
        variants: product.variants.map(v => ({
            id: v.id,
            image: v.image,
            status: v.status,
            colorId: v.colorId,
            color: { nameBg: v.color.nameBg, nameEn: v.color.nameEn, nameEs: v.color.nameEs, hex: v.color.hex, hex2: v.color.hex2 ?? null },
        })),
        packages: product.packages.map(pkg => ({
            id: pkg.id,
            price: pkg.price.toString(),
            salePrice: pkg.salePrice?.toString() || null,
            status: pkg.status,
            weight: { label: pkg.weight.label },
            packageVariants: pkg.packageVariants.map((pv: { variantId: string; status: string }) => ({ variantId: pv.variantId, status: pv.status })),
            bulkDiscountTiers: (pkg as { bulkDiscountTiers?: string }).bulkDiscountTiers || "",
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
            <RecentlyViewedTracker product={trackerProduct} />

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
                        packages={JSON.parse(JSON.stringify(product.packages))}
                        initialPackageSlug={sizeParam}
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
                        <ProductPanelBadges
                            onSale={product.onSale}
                            hasBulkDiscount={computeHasBulkDiscount(product.bulkDiscountTiers, product.packages, product.bulkDiscountExpiresAt?.toISOString())}
                            featured={product.featured}
                            bestSeller={product.bestSeller}
                            saleHref="/products?sale=true"
                            featuredHref="/products?featured=true"
                            bestSellerHref="/products?bestSeller=true"
                        />

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
                    <RelatedProductsCarousel cards={relatedCards} />

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
