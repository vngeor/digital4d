# Public Brand Pages + Bug Fixes

## Context
Add public `/brands` listing and `/brands/[slug]` detail pages. Also fix existing brand-related bugs found during audit.

## Bugs Found
1. **ProductCatalog** (line 29): brand interface missing `slug` — can't link to brand page
2. **Homepage** (`app/page.tsx` line 150): brand mapped to flat string, loses slug
3. **HomeProductsSection** (line 44): brand typed as `string | null`, needs slug for linking
4. **Product detail** (line 350): brand shown as plain text, should link to `/brands/[slug]`

## 1. Fix ProductCatalog brand interface (`app/components/ProductCatalog.tsx`)
- Line 29: Change `brand: { nameBg; nameEn; nameEs } | null` → add `slug: string`
- Line 520: Wrap brand name in `<Link href={/brands/${product.brand.slug}}>`

## 2. Fix Homepage brand mapping (`app/page.tsx` + `app/components/HomeProductsSection.tsx`)
- `app/page.tsx` line 150: Change flat string to `{ name: localizedName, slug: product.brand.slug }`
- `HomeProductsSection` line 44: Change `brand: string | null` → `brand: { name: string; slug: string } | null`
- Line 158-159: Update display to use `product.brand.name`, wrap in Link to `/brands/${product.brand.slug}`

## 3. Fix Product Detail brand display (`app/products/[slug]/page.tsx`)
- Line 349-351: Wrap brand name in `<Link href={/brands/${product.brand.slug}}>` with hover effect

## 4. New: Brand Listing Page (`app/brands/page.tsx`)
- Metadata: localized title/description
- Data: `prisma.brand.findMany` with `_count: { select: { products: true } }`, ordered by order/name
- Layout: Header + BackgroundOrbs + page header + brand grid + Footer
- Brand cards: glassmorphic grid (2 cols mobile, 3 sm, 4 lg)
  - Brand logo (or BadgeCheck placeholder)
  - Localized name
  - Product count badge
  - Link to `/brands/[slug]`

## 5. New: Brand Detail Page (`app/brands/[slug]/page.tsx`)
Follow category detail page pattern (`app/products/category/[...slug]/page.tsx`):
- Metadata: brand name, desc, OG image
- Data: fetch brand by slug → 404 if not found. Fetch products where `brandId = brand.id` + `published: true` with `include: { brand: true }`. Fetch categories/coupons/wishlist for ProductCatalog
- Layout:
  - Back button → `/brands`
  - Brand logo (centered, rounded, max ~120px)
  - Brand name (h1, gradient text, aligned per `titleAlign`)
  - Rich description (sanitized HTML)
  - ProductCatalog with brand's products
  - Footer
- `generateStaticParams()`: all brand slugs

## 6. i18n (`messages/{bg,en,es}.json`)
New public `brandsPage` section:
- en: title "Brands", subtitle "Explore our partner brands", noBrands, productCount "{count} products", backToBrands "Back to Brands"
- bg: title "Марки", subtitle "Разгледайте нашите партньорски марки", noBrands "Няма намерени марки", productCount "{count} продукта", backToBrands "Обратно към марки"
- es: title "Marcas", subtitle "Explora nuestras marcas asociadas", noBrands "No se encontraron marcas", productCount "{count} productos", backToBrands "Volver a Marcas"

## Key Files
**New:**
- `app/brands/page.tsx`
- `app/brands/[slug]/page.tsx`

**Bug fixes:**
- `app/components/ProductCatalog.tsx` — add slug to brand, link brand name
- `app/page.tsx` — pass brand as `{name, slug}` object
- `app/components/HomeProductsSection.tsx` — update brand type, link brand name
- `app/products/[slug]/page.tsx` — link brand name to brand page

**Translations:**
- `messages/{bg,en,es}.json`

## Verification
1. `npx tsc --noEmit` passes
2. `/brands` shows brand cards with logos and product counts
3. `/brands/[slug]` shows brand hero + filtered products
4. Product card brand name links to `/brands/[slug]` (catalog + homepage)
5. Product detail brand name links to `/brands/[slug]`
6. Mobile responsive — brand cards wrap, touch targets OK
