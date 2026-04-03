# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Prisma generate + Next.js build
npm run lint         # ESLint (flat config, Next.js core-web-vitals + typescript)
npm run start        # Start production server
npm run postinstall  # Prisma generate (runs automatically after npm install)

npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema changes to DB
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed database (npx tsx prisma/seed.ts)

npm run deploy:clean     # Deploy to Vercel without build cache (vercel --force)

npm run blob:cleanup     # Delete orphaned Vercel Blob files
npm run blob:cleanup:dry # Dry run of blob cleanup
```

No test framework is configured.

## Architecture

**Digital4D** is a multilingual e-commerce platform for 3D printing services at **digital4d.eu**. Next.js 16 App Router with React 19, TypeScript 5, Tailwind CSS 4, Prisma 7, PostgreSQL (Neon).

### Routing & i18n

- **Locales**: Bulgarian (default), English, Spanish — configured in `i18n/config.ts`
- **Translations**: `messages/{bg,en,es}.json` — uses `next-intl`
- **Middleware** (`middleware.ts`): detects locale from cookie → IP country (`x-vercel-ip-country`, `cf-ipcountry`, `x-country-code`) → Accept-Language header, sets `NEXT_LOCALE` cookie. Also protects `/admin/*` routes by checking for auth session cookie. Generates per-request CSP nonce and sets all security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Multilingual DB fields**: every user-facing text has `fieldBg`, `fieldEn`, `fieldEs` columns. Access pattern: `` `field${locale.charAt(0).toUpperCase() + locale.slice(1)}` ``
- **Country mapping**: BG→Bulgarian, 19 Spanish-speaking countries→Spanish, all others→English

### Auth & Permissions

- **NextAuth v5 beta** (`auth.ts`): Credentials + Google + GitHub providers, JWT strategy (30-day sessions, 24h update interval)
- **Roles**: `ADMIN` / `EDITOR` / `AUTHOR` / `SUBSCRIBER` enum in Prisma schema
- **Guards** (`lib/admin.ts`):
  - `requireAdmin()` — ADMIN-only for server components (redirects)
  - `requireAdminApi()` — ADMIN-only for API routes (returns 401)
  - `requirePermission(resource, action)` — role+user permission check for server components
  - `requirePermissionApi(resource, action)` — role+user permission check for API routes (returns 403)
  - `requireAdminAccess()` — any admin role (ADMIN/EDITOR/AUTHOR) for layout-level access
- **3-tier permission resolution** (`lib/permissions.ts`): User override → Role override → Code defaults. Resources: dashboard, products, categories, brands, content, types, banners, menu, orders, quotes, media, coupons, notifications, users, roles, audit. Actions: view, create, edit, delete
- **Admin idle timeout**: `AdminIdleGuard` component auto-logs out after 5 minutes of inactivity with 1-minute warning countdown
- **Neon cold start handling**: Three-layer defense: (1) `warmupDb()` in auth route handler with 3 attempts and graduated delays (1s/2s/3s); (2) `withRetry()` wrapper around PrismaAdapter with 500ms/1s delays as safety net; (3) client-side auto-retry on Configuration error in login page
- **Rate limiting** (`lib/rateLimit.ts`): in-memory Map-based per-IP rate limiter. Applied to: login (5/15min), register (3/hr), search (20/min), coupon validate (10/min), quotes (5/hr)
- **Input validation** (`lib/validation.ts`): max length checks on all public API routes — name (100), email (254), password (128), phone (20), message (5000), address (500). Birth date validation (valid date, not future, not before 1900)
- **OAuth config**: `allowDangerousEmailAccountLinking: true` for Google & GitHub; Google has `access_type: "offline"`; GitHub requests `"read:user user:email"` scope
- **Password**: bcryptjs hashing, min 6 chars + at least one special character

### Database

- **Prisma 7** with Neon HTTP adapter (`lib/prisma.ts`) — **no transaction support**
- Schema in `prisma/schema.prisma` — key models: User, Product, ProductCategory, Brand, ProductVariant, Content, ContentType, MenuItem, Order, QuoteRequest, QuoteMessage, DigitalPurchase, Banner, RolePermission, UserPermission, Coupon, CouponUsage, Notification, WishlistItem, WishlistNotification, NotificationTemplate, TemplateSendLog
- **Product categories**: self-referencing hierarchy via `parentId` — supports subcategories (e.g., Филаменти → PLA, PETG, ABS). `Product.category` stores slug string (not FK). Category slug changes cascade to all linked products. Admin form has parent selector. Public products page has accordion dropdown (parent shows count, expands to show children). Clicking parent filters by parent + all children; clicking child filters by that subcategory only
- **Brands**: `Brand` model (slug, nameBg/En/Es, titleAlign, descBg/En/Es, image, order). Product has `brandId` FK with `onDelete: SetNull`. Admin CRUD at `/admin/brands` with BrandForm (TipTap rich text description, title alignment, logo upload). Public pages at `/brands` (listing) and `/brands/[slug]` (detail with products). Permission resource: `"brands"`
- **Product variants**: `ProductVariant` model (productId, colorNameBg/En/Es, colorHex, image?, status, order) with `onDelete: Cascade`. Per-variant `status` field (in_stock/out_of_stock/sold_out) allows individual color availability. Managed in ProductForm with color picker, per-variant image upload, status dropdown. Displayed via `ProductImageGallery` with clickable color circles (dimmed + strikethrough for unavailable variants)
- **Product gallery**: `gallery String[]` on Product model. Admin form has gallery upload section (add/remove images). Product detail shows thumbnail strip below main image. Lightbox overlay with fullscreen preview, arrow navigation, keyboard (Escape/ArrowKeys), touch swipe (80px threshold). Gallery blob cleanup on product update (removes orphaned images)
- **Product status**: `status String` field replaces `inStock Boolean`. Values: `in_stock`, `out_of_stock`, `coming_soon`, `pre_order`, `sold_out`. Colored badges on product detail (green/gray/blue/purple/red). Image overlays on catalog/homepage/related cards (locale-aware: BG/EN/ES). Checkout allows only `in_stock` and `pre_order`. JSON-LD maps to schema.org availability
- **Related products**: `relatedProductIds String[]` on Product model. Admin product form has searchable product picker. Detail page: if manual picks exist → show those (up to 6); else → auto fallback from same + sibling subcategories (up to 4). Cross-category URL building. Stale reference cleanup on product delete
- **Notify Me**: When product status is `coming_soon`/`out_of_stock`/`sold_out`, "Notify Me" button replaces buy/order button. Reuses Wishlist system — adds to wishlist for tracking. When admin changes status to `in_stock`, all wishlisted users get `stock_available` notification with product/variant image. Variant status changes also trigger notifications with color name. No cooldown on stock/price notifications
- Prisma results must be serialized for client components: `JSON.parse(JSON.stringify(data))`

### API Layer

- **No server actions** — all mutations through API routes in `app/api/`
- Admin CRUD routes in `app/api/admin/` (types, products, categories, brands, content, banners, menu, orders, quotes, users, roles, users/permissions, coupons, notifications, notification-templates)
- HTTP methods per route: GET (list/filter), POST (create), PUT (update by ID), PATCH (bulk operations like reordering, or `toggleField` for single-field boolean updates), DELETE (by ID in query params)
- **`PATCH /api/admin/products`** with `action: "toggleField"` — updates a single boolean field (`published`, `featured`, `bestSeller`) by ID with permission check and audit log. Validates `value` is boolean. Used for optimistic UI toggles in the admin products table (⭐/🏆/👁 buttons with `stopPropagation`)
- **`GET /api/admin/products/export`** — downloads all products as CSV with UTF-8 BOM (for Excel Cyrillic support). Columns: SKU, Name (EN/BG/ES), Category, Brand, Type, Status, Price, Sale Price, On Sale, Price Type, Currency, Featured, Best Seller, Published, Tags (pipe-separated), Created At, Slug. Requires `products.view` permission
- Error format: `{ error: "message" }` with appropriate HTTP status
- No optimistic updates — refetch after mutations (exception: products toggleField uses optimistic UI with revert on failure)

**Public API routes:**
- `GET /api/banners` — homepage banners
- `GET /api/menu` — navigation menu items
- `GET /api/news` — published news/content
- `POST /api/quotes` — submit quote request with file upload
- `POST /api/checkout` — create Stripe checkout session (supports coupon codes)
- `GET /api/products/download/[token]` — token-based digital download
- `POST /api/coupons/validate` — validate coupon code for a product
- `GET /api/search?q=<query>&limit=5` — global site search across products, content, menu items (locale-aware, debounced, searches brand names)
- `GET /api/categories` — public product categories with hierarchy and product counts (used by header dropdown)

**Authenticated user routes:**
- `GET/PUT /api/user/profile` — user profile management
- `GET /api/user/orders` — user order history
- `GET /api/quotes/[id]/messages` — quote conversation
- `PATCH /api/quotes/[id]/view` — mark quote as viewed
- `POST /api/quotes/respond` — customer quote response (accept/counter-offer), stores structured JSON for i18n
- `GET /api/notifications` — unified notifications (quotes, admin messages, coupons, wishlist) with scheduledAt visibility gate
- `GET /api/wishlist` — user's wishlist items
- `POST /api/wishlist` — add product to wishlist
- `DELETE /api/wishlist` — remove product from wishlist
- `GET /api/wishlist/check` — check if product is in wishlist

**Auth routes:**
- `POST /api/auth/register` — user registration (accepts optional birthDate)
- `/api/auth/[...nextauth]` — NextAuth handler with Neon pre-warmup (3 attempts with graduated delays)
- `POST /api/checkout/webhook` — Stripe webhook
- **Domain redirect**: `vercel.json` redirects `digital4d.eu` → `www.digital4d.eu` (fixes OAuth PKCE cookie mismatch)

**Cron routes:**
- `GET /api/cron/notifications` — daily cron job (8 AM UTC) processes notification templates, protected by `CRON_SECRET`

### Storage & Images

- **Vercel Blob** primary, local `public/uploads/` fallback (`lib/blob.ts`). Set `USE_LOCAL_UPLOADS=true` for local dev
- Upload endpoint (`/api/upload`): admin-only, max 5MB, Sharp compression to WebP (1920px max width, 80% quality), transparent PNGs kept as PNG
- Quote file uploads: STL, OBJ, 3MF (max 50MB)
- Helpers: `uploadBlob()`, `deleteBlobSafe()`, `deleteBlobsBatch()`, `isVercelBlobUrl()`, `isLocalUploadUrl()`

### Pages

- **Homepage** (`app/page.tsx`): hero carousel, featured products with badges (NEW/Best Seller/Featured), news section, featured cards. Product carousel (CSS scroll-snap) auto-scrolls when >4 products. Best seller badge controlled by admin `bestSeller` toggle on Product model. `RecentlyViewedSection` client component rendered between products and news — reads `d4d-recently-viewed` localStorage key, shows nothing until user visits a product page
- **Recently Viewed** (`lib/recentlyViewed.ts`, `app/components/RecentlyViewedTracker.tsx`, `app/components/RecentlyViewedSection.tsx`): `RecentlyViewedTracker` (invisible client component) on product detail page saves product data to localStorage on mount (all 3 locale names, category color/names, brand, status, prices, URL). `RecentlyViewedSection` reads localStorage client-side only (null init prevents hydration mismatch), renders carousel (mobile >4 items) or 4-column grid (desktop), max 8 items displayed, max 10 stored
- **Products** (`app/products/`): catalog with filtering, detail pages, digital download. Hierarchical SEO URLs: `/products/[parent-category]/[subcategory]/[brand]/[product-slug]`. Catch-all route `app/products/[...slug]/page.tsx` with 301 redirect from old flat URLs. URL builder utility: `lib/productUrl.ts` (`buildProductUrl()`, `buildProductUrlFromDb()`, `buildProductUrlsBatch()`)
- **Brands** (`app/brands/`): listing page with brand cards + detail page (`/brands/[slug]`) with logo, title (aligned), rich description, and filtered ProductCatalog
- **News** (`app/news/`): listing and detail pages with modal view
- **Services** (`app/services/`): listing and detail pages
- **Dynamic CMS** (`app/[menuSlug]/`): menu-driven pages with nested content. Menu items have `showInNav` (hide from nav but keep page accessible) and `titleAlign` (left/center/right)
- **Profile** (`app/profile/`): user profile management with birthday banner (shown when birthDate missing) that opens edit modal
- **My Orders** (`app/my-orders/`): order history, quote conversations with auto-scroll from notifications
- **Wishlist** (`app/wishlist/`): saved products with price drop tracking
- **Search** (`app/search/`): dedicated search results page with URL-driven query (`/search?q=...`), full results across products/content/menu with category badges, sale labels, discount percentages
- **Checkout** (`app/checkout/`): Stripe success/cancel pages
- **Login** (`app/login/`): auth with OAuth + credentials, optional birthDate field on registration, "Remember me" checkbox (saves email in localStorage), auto-retry on OAuth Configuration errors
- **404** (`app/not-found.tsx`): custom page with interactive 3D dinosaur (Three.js + React Three Fiber)
- **Footer** (`app/components/Footer.tsx`): site-wide footer with copyright, Terms of Use and Privacy Policy links
- **OG Images** (`app/opengraph-image.tsx`, `app/twitter-image.tsx`): dynamic social media images using `next/og` (edge runtime)
- **SEO metadata**: `generateMetadata()` on all public pages (products, news, services, CMS pages) with dynamic OG tags, Twitter cards, and locale-aware descriptions. Protected pages (login, profile, my-orders) have `noindex`

### Admin UI Patterns

- `app/components/admin/` contains reusable admin components
- **`DataTable<T>`**: generic paginated table with deep search (searches nested object values like `brand.nameEn`), nested field access (e.g., `"user.name"`), optional `renderMobileCard` prop for responsive mobile card views, `emptyMessage?: React.ReactNode` for descriptive empty states with sub-labels
- **`SortableDataTable<T>`**: DataTable + dnd-kit drag-and-drop reordering (requires `order` field), optional `renderMobileCard` prop (no drag handles on mobile), same `emptyMessage?: React.ReactNode`
- **Mobile responsive**: All admin pages use dual-view pattern — desktop table (`hidden lg:block`) + mobile cards (`lg:hidden`) at the `lg` (1024px) breakpoint. The `renderMobileCard` prop is passed to DataTable/SortableDataTable; it receives the same filtered/searched/paginated data as the desktop table. The Roles page uses a custom role-tabbed card layout (EDITOR/AUTHOR tabs) instead of a table on mobile.
- **Modal-based CRUD forms** with multi-language tabs (BG/EN/ES)
- **`ConfirmModal`**: reusable confirmation dialog with customizable title/message, keyboard support (Escape), glassmorphic styling
- **`RichTextEditor`**: TipTap editor with formatting toolbar, image upload, color picker. Toolbar has responsive touch targets (`p-2 sm:p-1.5`)
- **`StatsCard`**: responsive padding (`p-4 sm:p-6`) and text sizes (`text-2xl sm:text-3xl`)
- **`BulkActionBar`**: responsive fixed positioning (`bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2`)
- **`AdminPermissionsContext`**: React context providing `can(resource, action)` helper for client-side permission checks
- **`AdminIdleGuard`**: wraps admin layout, auto-logout after 5 min inactivity with 1-min warning modal
- Admin sidebar has live pending quotes badge (30s polling via `data.pendingCount`), mobile hamburger menu with drawer overlay
- Admin pages: dashboard, products, categories, brands, orders, quotes, content, banners, menu, types, media, coupons, notifications, users, roles, audit logs
- **Admin Quotes** (`/admin/quotes`): server-side pagination (page/limit/search/sort params), extracted `QuoteDetailModal` component with 2 tabs (Details + Conversation & Reply). Features: waiting time column with color-coded badges (blue < 24h, amber 1-3d, red pulsing 3+d), urgency filter row (client-side on `updatedAt`), sort toggle (newest/oldest first via API `sort=oldest` → `orderBy: updatedAt asc`), needs-reply pulsing dot, copy-to-clipboard buttons, localized chat messages via `localizeMessage()`, coupon picker, view tracking. Mobile cards show all badges.
- **Admin dashboard** (`/admin`): stats cards, orders chart, recent orders, recent users, recent activity log (last 7 `AuditLog` entries — colored action badge + resource + record title + user + relative time, "View All" links to audit logs)
- **Audit logs** (`/admin/audit-logs`): action badges with icons (Plus/Pencil/Trash2), resource badges with matching sidebar icons (Package, FileText, etc.) via `ACTION_STYLES` and `RESOURCE_STYLES` maps

### Frontend Components

- **`Header`**: navigation with dynamic menu, user dropdown, language switcher, global search, mobile responsive. Products nav has category dropdown with hierarchy, product counts, keyboard navigation, and search. Brands nav link. Includes birthday indicator: pulsing pink dot on avatar + Cake icon on "My Profile" link (desktop dropdown & mobile menu) when user hasn't set birthDate — fetches `/api/user/profile` on mount to check. Social media icons use brand-colored hover (Facebook `#1877F2`, Instagram `#C32AA3`, YouTube `#FF0000`, TikTok `#69C9D0`)
- **`GlobalSearch`**: public site search with dual-mode rendering. Desktop (lg+): visible glass-styled input in header with dropdown results panel. Mobile (<lg): search icon button → full-screen portal modal with backdrop blur. Features: Cmd+K/Ctrl+K shortcut, 300ms debounced search with AbortController, keyboard navigation (Arrow Up/Down, Enter, Escape), results grouped by type (Products/News/Services/Pages), recent searches in localStorage, loading skeletons. "View All" button navigates to dedicated `/search?q=...` results page. X button clears query. Outside-click hides dropdown without clearing query — re-focusing input re-opens with previous results. URL resolution: products → hierarchical URL from `productUrl` field, news → `/news/${slug}`, content with menuItemSlug → `/${menuItemSlug}/${slug}`, menu items → `/${slug}`
- **`NotificationBell`**: unified notifications with i18n support; per-type icons (Cake for birthday, TreePine for Christmas, PartyPopper for New Year, Egg for Easter, CalendarDays for custom, Gift for generic holiday); HTML message rendering via `dangerouslySetInnerHTML`; locale-aware JSON title/message parsing; quote notifications show admin message preview, link to specific quote on my-orders with auto-scroll. Dropdown portaled to body with dynamic positioning (measures bell button rect on open) to align under the bell icon
- **`WishlistButton`**: heart toggle on product cards/detail pages, adds/removes from wishlist
- **`LanguageSwitcher`**: locale switching with `useTransition`
- **`ProductCatalog`**: product filtering, search, category dropdown with keyboard navigation (Arrow Up/Down, Enter, Escape) and search, brand filter dropdown, sort by (Default, Price Low/High, Biggest Discount, Name A-Z). Product cards link to hierarchical URLs via `getProductUrl()` helper. Brand names on cards link to `/brands/[slug]`. Subcategory dropdown on mobile, tabs on desktop. Product counts in category dropdown
- **`ProductDetailClient`**: client wrapper that lifts variant selection state between `ProductImageGallery` and `ProductActions` (server component can't share state between client siblings). Passes `selectedVariantStatus` to actions, `onVariantChange` to gallery, `isWishlisted` for Notify Me
- **`ProductImageGallery`**: client component for product detail — main image with gallery thumbnails, color variant circles, lightbox preview. Status overlay banners (SOLD OUT/COMING SOON/OUT OF STOCK) in locale-aware text. Dimmed + strikethrough on unavailable variant colors. Touch swipe in lightbox (80px threshold). iOS scroll lock via `position: fixed` pattern
- **`ProductActions`**: quantity selector, buy/order/quote buttons, coupon input. Shows "Notify Me When Available" for unavailable products (uses wishlist). Variant-aware: disables buy when selected variant is unavailable. Uses `useSession()` for auth check on notify
- **`QuoteForm`**: drag-and-drop file upload, auto-fill from profile
- **`ProfileEditForm`**: modal form with validation, portaled to `document.body`. BirthDate is required; when empty, field gets a pulsing pink-to-rose gradient border (`animate-pulse-glow`) with `highlightBirthDate` prop. Gradient: `linear-gradient(to right, lab(56.9303 76.8162 -8.07021), lab(56.101 79.4328 31.4532))`. iOS-safe: body scroll lock (`position: fixed` pattern), `max-h-[85svh]` for stable sizing, flex-col layout (fixed header + scrollable body), date inputs wrapped in `overflow-hidden` with `min-w-0`
- **`NewsModal`**: article display with category colors
- **`CookieConsent`**: GDPR cookie banner — glassmorphic floating card fixed bottom-center, appears 800ms after first visit (delayed to avoid flash). Stores preference in `localStorage` key `d4d-cookie-consent` (`"accepted"` or `"declined"`). Accept/Decline buttons + X dismiss (all treated as decline). Links to `/privacy`. Renders `null` on SSR and until client-side localStorage check completes (prevents hydration mismatch). Added to `app/layout.tsx` inside `NextIntlClientProvider`. All 3 locales (`cookieConsent.*` keys).
- **`Dinosaur3D` / `Dinosaur3DWrapper`**: 3D T-Rex model (Three.js, React Three Fiber, OrbitControls), dynamically imported with SSR disabled

### Styling

- **Tailwind v4** with inline theme in `app/globals.css` (no separate config file)
- **CSS Cascade Layers**: Tailwind v4 wraps all utilities in `@layer utilities`. Custom CSS in `globals.css` that could conflict with utilities MUST be wrapped in `@layer base {}` — otherwise unlayered CSS overrides all Tailwind utilities per the CSS Cascade Layers spec. The heading fonts, word-break rules, prose overrides, and cursor rules are all in `@layer base`. The `body` rule, tap-highlight rule, `@supports` blocks, `.glass`/`.glass-strong`, animations, and animation delays are safe unlayered.
- Dark theme with glassmorphism: `.glass` and `.glass-strong` utility classes
- Primary gradient: `from-emerald-500 to-cyan-500`
- Fonts: `Exo_2` (headings), `Inter` (body) — both with Latin + Cyrillic subsets
- Icons: `lucide-react`
- Badge colors: 16 predefined in `lib/colors.ts` with `getColorClass()` helper
- Custom animations: `animate-float`, `animate-float-slow`, `animate-float-reverse`, `animate-pulse-glow`, `animate-fade-in-up`, `animate-sale-blink` (urgency blink for coupon timers)
- Animation delays: `.animation-delay-200`, `.animation-delay-400`, `.animation-delay-1000`, `.animation-delay-2000`
- Toast notifications: `sonner`
- **Responsive breakpoints**: mobile-first design. Key breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px — admin table/card toggle). Product detail page stacks to single column on mobile (`grid-cols-1 md:grid-cols-2`). Homepage contact grid stacks to single column on mobile (`grid-cols-1 sm:grid-cols-3`). NewsSection full-mode uses single column on mobile (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`). HeroCarousel dots have 32px touch targets (`w-8 h-8` buttons wrapping visual dots).
- **Mobile responsive patterns**: iOS Safari input zoom prevention via `text-base sm:text-sm` (16px mobile → 14px desktop), `-webkit-tap-highlight-color: transparent` on buttons/links, `-webkit-font-smoothing: antialiased` on body, `overflow-x: hidden` on body to prevent horizontal scroll. Coupon codes use `truncate` + `font-mono` in block two-row layouts (not `inline-flex`). Back button touch targets are `w-10 h-10` (40px minimum).
- **Modal/popup mobile patterns**: All modals use `fixed inset-0 p-4 pt-safe pb-safe` outer container (minimum 16px margin from edges). Modal boxes use `w-full max-w-md` (or `max-w-2xl`) + `max-h-[85svh]` + flex-col (fixed header + scrollable body via `overflow-y-auto overscroll-contain`). Content padding `p-4 sm:p-6` (16px mobile, 24px desktop). Close buttons `w-11 h-11 sm:w-10 sm:h-10` (44px touch target). Bottom-sheet modals (QuoteForm) use `p-3` minimum margin. Notification dropdown constrained by `max-h-[min(16rem,calc(100dvh-8rem))]`. iOS date inputs must be wrapped in `overflow-hidden` containers with `min-w-0`. Use `svh` instead of `dvh` for stable iOS viewport sizing.

### Code Generation

- `lib/generateCode.ts`: auto-generates order numbers (`ORD-XXXX@D4D`) and quote numbers (`QUO-XXXX@D4D`)
- Auto-slug from English name, auto-SKU (`D4D-{count}-{timestamp}`)

### Coupons & Discounts

- **Coupon model**: code, type (percentage/fixed), value, currency, minPurchase, maxUses, perUserLimit, productIds[], allowOnSale, showOnProduct, active, startsAt/expiresAt
- **Admin CRUD** (`/admin/coupons`): create/edit/delete coupons, product picker (all-products-on-focus + select all/deselect all), usage stats, deep linking
- **Validation API** (`/api/coupons/validate`): checks active, dates, usage limits, product match, sale compatibility
- **Checkout integration**: coupon code applied at Stripe checkout, usage recorded in webhook via `CouponUsage` model
- **Customer UX**: coupon input on digital product pages (auto-apply via `?coupon=CODE` URL param), discount banner for service/physical products
- **Promoted coupon display** (`showOnProduct` toggle):
  - **Product detail pages**: orange gradient banner with coupon code, discount amount, live countdown timer (blinking `animate-sale-blink`), click-to-apply for digital products
  - **Product card badges**: small orange badge (bottom-left) on all product cards — homepage, catalog, wishlist, and related products. Uses coupon map pattern: single DB query → `Record<productId, CouponBadge>` for O(1) lookup. Global coupons (empty `productIds`) apply to all products; specific coupons apply only to matching. Skips badge if product is on sale and coupon has `allowOnSale: false`
- **Quote integration**: admin can attach coupon when sending quote offer, customer sees coupon badge on My Orders page
- **Quote conversation messages**: admin offers stored as multi-line text (notes + 💰 price + 🎟️ coupon). User responses (accept/decline/counter) stored as JSON with i18n keys, localized at display time via `localizeMessage()` in MyOrdersClient

### Notifications

- **Notification model**: userId, type (quote_offer/admin_message/coupon/wishlist_price_drop/wishlist_coupon/auto_birthday/auto_christmas/auto_new_year/auto_easter/auto_custom), title, message, link, couponId, quoteId, productId, read/readAt, scheduledAt, createdById
- **Per-trigger notification types**: each holiday trigger maps to a distinct type (`auto_christmas`, `auto_new_year`, `auto_easter`) via `getNotificationType()` in `lib/cronNotifications.ts`, enabling per-type icons and colors
- **i18n pattern**: Notification `title`/`message` fields store JSON with translation keys (e.g., `"quote_offer"`, `{"price":"7.50","hasCoupon":true}`). Localized at display time in `NotificationBell` using `getLocalizedTitle()`/`getLocalizedMessage()` helpers. Use `t.raw()` for template strings with placeholders.
- **Admin page** (`/admin/notifications`): send notifications to users with smart recipient selection
  - **User picker**: all-users-on-focus (cached), debounced search, select all/deselect all with 3-state checkbox
  - **Quick filters**: Birthday Today/This Week/This Month, All Users (with count confirmation), By Role dropdown
  - **Schedule/snooze**: toggle to schedule notifications for future delivery with datetime picker
  - **Types**: admin messages, coupon, and auto notifications with optional deep links. Type badges show specific labels (Birthday, Christmas, New Year, Easter, Template) with per-type colors
  - **RichTextEditor**: message field uses TipTap HTML editor (same as templates page). HTML content rendered in notification modal, stripped in list preview
  - **Locale-aware display**: title/message columns parse JSON and show localized text instead of raw JSON. Uses `getLocalizedText()`, `stripHtml()` helpers
  - **Mobile responsive**: modal uses `p-4 sm:p-6` pattern, responsive button/input padding, localized delete confirmation
  - **Tab navigation**: Notifications | Templates tabs — templates page at `/admin/notification-templates`
- **Notification Templates** (`/admin/notification-templates`):
  - **NotificationTemplate model**: name, trigger (birthday/christmas/new_year/orthodox_easter/custom_date), daysBefore, customMonth/customDay, recurring, titleBg/En/Es, messageBg/En/Es, link, couponEnabled + coupon config fields, active, lastRunAt/lastRunCount
  - **TemplateSendLog model**: templateId, userId, year, couponId — `@@unique([templateId, userId, year])` prevents duplicates
  - **Triggers**: birthday (match user birthDate month/day), christmas (Dec 25), new_year (Jan 1), orthodox_easter (Julian calendar computus), custom_date (admin-defined month/day)
  - **Auto-coupon**: optional personal coupon generation per recipient with configurable type, value, currency, duration, product restrictions
  - **Placeholders**: `{name}`, `{couponCode}`, `{couponValue}`, `{expiresAt}` — resolved at send time per locale
  - **Cron job**: Vercel Cron daily at 8 AM UTC (`/api/cron/notifications`), protected by `CRON_SECRET` env var
  - **Test send**: admin can test-send to a single user without dedup restrictions
  - **Feb 29 birthdays**: in non-leap years, Feb 28 also matches Feb 29 birthdays
  - **Orthodox Easter**: Julian calendar computus algorithm (`lib/orthodoxEaster.ts`)
  - **Permission reuse**: templates use `"notifications"` resource — no new permission type needed
- **BirthDate collection** (for birthday notifications to work):
  - **Registration form** (`/login`): optional birthDate field for email/password registrations
  - **Profile banner** (`/profile`): glassmorphic pink banner with Cake icon shown when `!user.birthDate`, opens edit modal on click
  - **Header indicator**: pulsing pink dot on avatar + Cake icon on "My Profile" link prompts users to add birthDate
  - **Profile edit form**: birthDate is required; gradient-highlighted field when empty, validation error if not filled
  - **OAuth users** (Google/GitHub): prompted via profile banner since they skip registration form
- **Customer bell** (`NotificationBell`): unified notifications from quotes, admin messages, coupons, wishlist, and auto-scheduled; auto_* types display locale-aware JSON titles with Cake (birthday) and Gift (holiday/custom) icons; scheduled notifications hidden until delivery time; quote notifications show admin's last message as preview
- **Quote auto-notification**: when admin sends a quote offer, a Notification record is auto-created with rich JSON message including adminMessage, price, and coupon info
- **Wishlist notifications**: price drop and coupon availability notifications for wishlisted products

### Wishlist

- **WishlistItem model**: userId, productId, addedAt — tracks which products a user has wishlisted
- **WishlistNotification model**: userId, productId, type (price_drop/coupon), createdAt — prevents duplicate notifications
- **API routes**: `/api/wishlist` (GET/POST/DELETE), `/api/wishlist/check` (GET)
- **Price drop detection**: when admin changes product price, compares old vs new; if price dropped, creates notifications for all users who wishlisted that product
- **Coupon detection**: when admin creates/edits a coupon with specific productIds, notifies users who wishlisted those products
- **Wishlist page** (`app/wishlist/`): displays saved products with current prices, sale badges, coupon badges, and remove button

### Payments

- **Stripe** checkout for digital and physical fixed-price products. Webhook at `/api/checkout/webhook` creates `DigitalPurchase` (digital) or `Order` (physical) records. Supports quantity (1-99, validated server-side). Server validates `in_stock`/`pre_order` before creating session
- **Single-item "Buy Now"**: `/api/checkout` — express checkout from product detail page. Supports coupon codes for digital products. `fileType` and `nameEn` in Stripe metadata so webhook can route correctly
- **Cart checkout**: `lib/cart.ts` localStorage helpers (`d4d-cart` key). CartDrawer slides in from right. `/api/checkout/cart` creates multi-item Stripe session (validates products, enforces single currency, `metadata.type="cart"`)
- **Webhook routing**: detects `metadata.type === "cart"` BEFORE the `!productId` guard. Cart items loop: digital → `DigitalPurchase`, physical → `Order` (uses `generateOrderNumber()`, stores session ID in `notes`)
- **Button logic**: `priceType === "fixed"` + `fileType !== "service"` → Add to Cart + Buy Now (emerald). Service → Get Quote (amber). Non-fixed physical → Get Quote (amber). Consistent across ProductActions (detail) and all 5 card locations
- **Coupon support**: single-item "Buy Now" only (digital products). Cart checkout v1 has no coupon input
- **Quantity selector**: [-] [qty] [+] on product detail for all types. Passed to Stripe checkout and QuoteForm
- Downloads: token-based (32 hex bytes), max 3 downloads, 7-day expiring links
- Currency mapping: BGN→bgn, EUR→eur, USD→usd

## Environment Variables

```bash
# Database
DATABASE_URL=                    # Neon PostgreSQL connection string

# Auth (NextAuth v5)
AUTH_SECRET=                     # Generate with: openssl rand -base64 32
AUTH_URL=                        # App URL (e.g., http://localhost:3000)
AUTH_TRUST_HOST=true             # Required for Vercel/serverless
AUTH_GOOGLE_ID=                  # Google OAuth client ID
AUTH_GOOGLE_SECRET=              # Google OAuth client secret
AUTH_GITHUB_ID=                  # GitHub OAuth client ID
AUTH_GITHUB_SECRET=              # GitHub OAuth client secret

# Storage
BLOB_READ_WRITE_TOKEN=           # Vercel Blob storage token
USE_LOCAL_UPLOADS=               # Set "true" for local dev (optional)

# Payments
STRIPE_SECRET_KEY=               # Stripe secret key
STRIPE_WEBHOOK_SECRET=           # Stripe webhook signing secret

# Public
NEXT_PUBLIC_BASE_URL=            # Public base URL
NEXT_PUBLIC_SITE_URL=            # Public site URL (e.g., https://www.digital4d.eu)

# Cron
CRON_SECRET=                     # Secret for Vercel Cron job authentication (generate random 32-byte hex)
```

## Security

- **Security headers** (`middleware.ts`): per-request nonce-based CSP (`script-src 'nonce-xxx' 'strict-dynamic'` — no `unsafe-inline` for scripts), X-Frame-Options (DENY), HSTS, X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy. Nonce applied to JSON-LD scripts in layout, news, services, products pages. Next.js auto-applies nonce to its own hydration scripts
- **XSS sanitization** (`lib/sanitize.ts`): `sanitize-html` library applied to all 7 `dangerouslySetInnerHTML` locations (NotificationBell, NewsModal, news/services/menu pages). Allows TipTap-produced tags, strips `<script>`, `<iframe>`, event handlers, `javascript:` URLs
- **Checkout origin validation**: Stripe success/cancel URLs validated against domain whitelist (prevents open redirect)
- **Error logging**: all `console.error()` across 30 API route files sanitized to only log `error.message`, not raw error objects (prevents stack trace/DB detail leakage)
- **Query parameter validation**: news API type whitelisted (`news`/`service`), limit capped at 50

## Key Constraints

1. **No transactions** — Neon HTTP adapter doesn't support them; use sequential operations
2. **No server actions** — all backend logic via API routes
3. **Trilingual content** — always maintain BG/EN/ES variants for user-facing fields
4. **Admin auth is triple-layer** — middleware checks cookie existence, `requirePermission()`/`requirePermissionApi()` does role + user-level permission validation, `AdminIdleGuard` handles inactivity timeout
5. **Prisma serialization** — always `JSON.parse(JSON.stringify())` when passing Prisma results to client components
6. **NextAuth v5 beta** — some APIs may change before final release
7. **Permission changes** — when modifying role permissions on `/admin/roles`, or user-level overrides on `/admin/users`, caches are invalidated. Changing a user's role clears their user-level overrides
8. **CSS Cascade Layers** — any custom CSS in `globals.css` that could conflict with Tailwind utilities MUST be inside `@layer base {}`. Unlayered CSS overrides ALL Tailwind utilities (including `whitespace-nowrap`, `truncate`, etc.) because Tailwind v4 puts utilities in `@layer utilities` and unlayered CSS always wins per the CSS spec. Never add global element selectors (e.g., `span { word-break: break-word }`) outside a `@layer` block.

## Roadmap

### Blocked on External Services
- **Forgot password**: requires email service (recommended: Resend). Needs: PasswordResetToken model, `/api/auth/forgot-password` endpoint, `/api/auth/reset-password` endpoint, `/forgot-password` and `/reset-password` pages
- **Email verification**: verify email addresses on registration before allowing full account access
- **Email notifications (orders, quotes)**: transactional emails for order confirmations, quote updates
- **Newsletter registration**: subscriber model, footer signup form, email campaigns
- **Upgrade rate limiting to Redis**: current in-memory rate limiter is per-instance on Vercel serverless. Upgrade to Upstash Redis for cross-instance rate limiting
- **OAuth email linking review**: `allowDangerousEmailAccountLinking: true` is intentional but could be replaced with explicit email verification flow

### No Blockers
- **GA4 / Meta Pixel tracking**: needs tracking IDs from admin
- **Product reviews/ratings**: user reviews with star ratings on product pages
- **Testimonials section**: customer testimonials on homepage
- **Free shipping threshold**: "Add X more for free shipping" progress bar in CartDrawer. Threshold + enabled toggle configurable from admin panel (new SiteSettings/key-value model). Per-currency support
- **Coupon code in cart**: Cart v1 skipped coupons (product-specific restrictions make multi-item application complex). Future: add coupon field to CartDrawer that validates against cart items, or enable Stripe-native promotion codes

### Postponed
- **Live chat widget**: Tawk.to (free) — script tag integration, deferred
- **Dark/light admin mode**: large task (~20 files, ~500 class changes), low priority
- **Content versioning**: revision history for content changes, needs new DB model
