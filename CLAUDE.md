# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Prisma generate + DB push + Next.js build
npm run lint         # ESLint (flat config, Next.js core-web-vitals + typescript)
npm run start        # Start production server
npm run postinstall  # Prisma generate (runs automatically after npm install)

npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema changes to DB
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed database (npx tsx prisma/seed.ts)

npm run blob:cleanup     # Delete orphaned Vercel Blob files
npm run blob:cleanup:dry # Dry run of blob cleanup
```

No test framework is configured.

## Architecture

**Digital4D** is a multilingual e-commerce platform for 3D printing services at **digital4d.eu**. Next.js 16 App Router with React 19, TypeScript 5, Tailwind CSS 4, Prisma 7, PostgreSQL (Neon).

### Routing & i18n

- **Locales**: Bulgarian (default), English, Spanish — configured in `i18n/config.ts`
- **Translations**: `messages/{bg,en,es}.json` — uses `next-intl`
- **Middleware** (`middleware.ts`): detects locale from cookie → IP country (`x-vercel-ip-country`, `cf-ipcountry`, `x-country-code`) → Accept-Language header, sets `NEXT_LOCALE` cookie. Also protects `/admin/*` routes by checking for auth session cookie
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
- **3-tier permission resolution** (`lib/permissions.ts`): User override → Role override → Code defaults. Resources: dashboard, products, categories, content, types, banners, menu, orders, quotes, media, coupons, notifications, users, roles, audit. Actions: view, create, edit, delete
- **Admin idle timeout**: `AdminIdleGuard` component auto-logs out after 5 minutes of inactivity with 1-minute warning countdown
- **Neon cold start handling**: `withRetry()` wrapper around PrismaAdapter auto-retries on first request timeout after DB inactivity
- **OAuth config**: `allowDangerousEmailAccountLinking: true` for Google & GitHub; Google has `access_type: "offline"`; GitHub requests `"read:user user:email"` scope
- **Password**: bcryptjs hashing, min 6 chars + at least one special character

### Database

- **Prisma 7** with Neon HTTP adapter (`lib/prisma.ts`) — **no transaction support**
- Schema in `prisma/schema.prisma` — key models: User, Product, ProductCategory, Content, ContentType, MenuItem, Order, QuoteRequest, QuoteMessage, DigitalPurchase, Banner, RolePermission, UserPermission, Coupon, CouponUsage, Notification, WishlistItem, WishlistNotification, NotificationTemplate, TemplateSendLog
- Prisma results must be serialized for client components: `JSON.parse(JSON.stringify(data))`

### API Layer

- **No server actions** — all mutations through API routes in `app/api/`
- Admin CRUD routes in `app/api/admin/` (types, products, categories, content, banners, menu, orders, quotes, users, roles, users/permissions, coupons, notifications, notification-templates)
- HTTP methods per route: GET (list/filter), POST (create), PUT (update by ID), PATCH (bulk operations like reordering), DELETE (by ID in query params)
- Error format: `{ error: "message" }` with appropriate HTTP status
- No optimistic updates — refetch after mutations

**Public API routes:**
- `GET /api/banners` — homepage banners
- `GET /api/menu` — navigation menu items
- `GET /api/news` — published news/content
- `POST /api/quotes` — submit quote request with file upload
- `POST /api/checkout` — create Stripe checkout session (supports coupon codes)
- `GET /api/products/download/[token]` — token-based digital download
- `POST /api/coupons/validate` — validate coupon code for a product

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
- `POST /api/auth/register` — user registration
- `/api/auth/[...nextauth]` — NextAuth handler
- `POST /api/checkout/webhook` — Stripe webhook

**Cron routes:**
- `GET /api/cron/notifications` — daily cron job (8 AM UTC) processes notification templates, protected by `CRON_SECRET`

### Storage & Images

- **Vercel Blob** primary, local `public/uploads/` fallback (`lib/blob.ts`). Set `USE_LOCAL_UPLOADS=true` for local dev
- Upload endpoint (`/api/upload`): admin-only, max 5MB, Sharp compression to WebP (1920px max width, 80% quality), transparent PNGs kept as PNG
- Quote file uploads: STL, OBJ, 3MF (max 50MB)
- Helpers: `uploadBlob()`, `deleteBlobSafe()`, `deleteBlobsBatch()`, `isVercelBlobUrl()`, `isLocalUploadUrl()`

### Pages

- **Homepage** (`app/page.tsx`): hero carousel, featured products, news section, featured cards
- **Products** (`app/products/`): catalog with filtering, detail pages, digital download
- **News** (`app/news/`): listing and detail pages with modal view
- **Services** (`app/services/`): listing and detail pages
- **Dynamic CMS** (`app/[menuSlug]/`): menu-driven pages with nested content
- **Profile** (`app/profile/`): user profile management
- **My Orders** (`app/my-orders/`): order history, quote conversations with auto-scroll from notifications
- **Wishlist** (`app/wishlist/`): saved products with price drop tracking
- **Checkout** (`app/checkout/`): Stripe success/cancel pages
- **Login** (`app/login/`): auth with OAuth + credentials
- **404** (`app/not-found.tsx`): custom page with interactive 3D dinosaur (Three.js + React Three Fiber)
- **OG Images** (`app/opengraph-image.tsx`, `app/twitter-image.tsx`): dynamic social media images using `next/og` (edge runtime)

### Admin UI Patterns

- `app/components/admin/` contains reusable admin components
- **`DataTable<T>`**: generic paginated table with search, nested field access (e.g., `"user.name"`), optional `renderMobileCard` prop for responsive mobile card views
- **`SortableDataTable<T>`**: DataTable + dnd-kit drag-and-drop reordering (requires `order` field), optional `renderMobileCard` prop (no drag handles on mobile)
- **Mobile responsive**: All admin pages use dual-view pattern — desktop table (`hidden lg:block`) + mobile cards (`lg:hidden`) at the `lg` (1024px) breakpoint. The `renderMobileCard` prop is passed to DataTable/SortableDataTable; it receives the same filtered/searched/paginated data as the desktop table. The Roles page uses a custom role-tabbed card layout (EDITOR/AUTHOR tabs) instead of a table on mobile.
- **Modal-based CRUD forms** with multi-language tabs (BG/EN/ES)
- **`ConfirmModal`**: reusable confirmation dialog with customizable title/message, keyboard support (Escape), glassmorphic styling
- **`RichTextEditor`**: TipTap editor with formatting toolbar, image upload, color picker. Toolbar has responsive touch targets (`p-2 sm:p-1.5`)
- **`StatsCard`**: responsive padding (`p-4 sm:p-6`) and text sizes (`text-2xl sm:text-3xl`)
- **`BulkActionBar`**: responsive fixed positioning (`bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2`)
- **`AdminPermissionsContext`**: React context providing `can(resource, action)` helper for client-side permission checks
- **`AdminIdleGuard`**: wraps admin layout, auto-logout after 5 min inactivity with 1-min warning modal
- Admin sidebar has live pending quotes badge (30s polling), mobile hamburger menu with drawer overlay
- Admin pages: dashboard, products, categories, orders, quotes, content, banners, menu, types, media, coupons, notifications, users, roles, audit logs
- **Audit logs** (`/admin/audit-logs`): action badges with icons (Plus/Pencil/Trash2), resource badges with matching sidebar icons (Package, FileText, etc.) via `ACTION_STYLES` and `RESOURCE_STYLES` maps

### Frontend Components

- **`Header`**: navigation with dynamic menu, user dropdown, language switcher, mobile responsive
- **`NotificationBell`**: unified notifications with i18n support; quote notifications show admin message preview, link to specific quote on my-orders with auto-scroll
- **`WishlistButton`**: heart toggle on product cards/detail pages, adds/removes from wishlist
- **`LanguageSwitcher`**: locale switching with `useTransition`
- **`ProductCatalog`**: product filtering, search, category tabs
- **`QuoteForm`**: drag-and-drop file upload, auto-fill from profile
- **`ProfileEditForm`**: modal form with validation
- **`NewsModal`**: article display with category colors
- **`Dinosaur3D` / `Dinosaur3DWrapper`**: 3D T-Rex model (Three.js, React Three Fiber, OrbitControls), dynamically imported with SSR disabled

### Styling

- **Tailwind v4** with inline theme in `app/globals.css` (no separate config file)
- Dark theme with glassmorphism: `.glass` and `.glass-strong` utility classes
- Primary gradient: `from-emerald-500 to-cyan-500`
- Fonts: `Exo_2` (headings), `Inter` (body) — both with Latin + Cyrillic subsets
- Icons: `lucide-react`
- Badge colors: 16 predefined in `lib/colors.ts` with `getColorClass()` helper
- Custom animations: `animate-float`, `animate-float-slow`, `animate-float-reverse`, `animate-pulse-glow`, `animate-fade-in-up`, `animate-sale-blink` (urgency blink for coupon timers)
- Animation delays: `.animation-delay-200`, `.animation-delay-400`, `.animation-delay-1000`, `.animation-delay-2000`
- Toast notifications: `sonner`
- **Responsive breakpoints**: mobile-first design. Key breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px — admin table/card toggle). Product detail page stacks to single column on mobile (`grid-cols-1 md:grid-cols-2`). Homepage contact section shows phone numbers on all sizes.

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

- **Notification model**: userId, type (quote_offer/admin_message/coupon/wishlist_price_drop/wishlist_coupon/auto_birthday/auto_holiday/auto_custom), title, message, link, couponId, quoteId, productId, read/readAt, scheduledAt, createdById
- **i18n pattern**: Notification `title`/`message` fields store JSON with translation keys (e.g., `"quote_offer"`, `{"price":"7.50","hasCoupon":true}`). Localized at display time in `NotificationBell` using `getLocalizedTitle()`/`getLocalizedMessage()` helpers. Use `t.raw()` for template strings with placeholders.
- **Admin page** (`/admin/notifications`): send notifications to users with smart recipient selection
  - **User picker**: all-users-on-focus (cached), debounced search, select all/deselect all with 3-state checkbox
  - **Quick filters**: Birthday Today/This Week/This Month, All Users (with count confirmation), By Role dropdown
  - **Schedule/snooze**: toggle to schedule notifications for future delivery with datetime picker
  - **Types**: admin messages, coupon, and auto notifications with optional deep links
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

- **Stripe** checkout for digital products, webhook at `/api/checkout/webhook` creates `DigitalPurchase` records
- **Coupon support**: checkout accepts `couponCode`, validates server-side, applies discount, records `CouponUsage` after payment
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

## Key Constraints

1. **No transactions** — Neon HTTP adapter doesn't support them; use sequential operations
2. **No server actions** — all backend logic via API routes
3. **Trilingual content** — always maintain BG/EN/ES variants for user-facing fields
4. **Admin auth is triple-layer** — middleware checks cookie existence, `requirePermission()`/`requirePermissionApi()` does role + user-level permission validation, `AdminIdleGuard` handles inactivity timeout
5. **Prisma serialization** — always `JSON.parse(JSON.stringify())` when passing Prisma results to client components
6. **NextAuth v5 beta** — some APIs may change before final release
7. **Permission changes** — when modifying role permissions on `/admin/roles`, or user-level overrides on `/admin/users`, caches are invalidated. Changing a user's role clears their user-level overrides
