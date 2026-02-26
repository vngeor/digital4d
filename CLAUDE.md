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
- Schema in `prisma/schema.prisma` — key models: User, Product, ProductCategory, Content, ContentType, MenuItem, Order, QuoteRequest, QuoteMessage, DigitalPurchase, Banner, RolePermission, UserPermission, Coupon, CouponUsage, Notification
- Prisma results must be serialized for client components: `JSON.parse(JSON.stringify(data))`

### API Layer

- **No server actions** — all mutations through API routes in `app/api/`
- Admin CRUD routes in `app/api/admin/` (types, products, categories, content, banners, menu, orders, quotes, users, roles, users/permissions, coupons, notifications)
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
- `POST /api/quotes/respond` — customer quote response (accept/counter-offer)
- `GET /api/notifications` — unified notifications (quotes, admin messages, coupons) with scheduledAt visibility gate

**Auth routes:**
- `POST /api/auth/register` — user registration
- `/api/auth/[...nextauth]` — NextAuth handler
- `POST /api/checkout/webhook` — Stripe webhook

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
- **My Orders** (`app/my-orders/`): order history
- **Checkout** (`app/checkout/`): Stripe success/cancel pages
- **Login** (`app/login/`): auth with OAuth + credentials
- **404** (`app/not-found.tsx`): custom page with interactive 3D dinosaur (Three.js + React Three Fiber)
- **OG Images** (`app/opengraph-image.tsx`, `app/twitter-image.tsx`): dynamic social media images using `next/og` (edge runtime)

### Admin UI Patterns

- `app/components/admin/` contains reusable admin components
- **`DataTable<T>`**: generic paginated table with search, nested field access (e.g., `"user.name"`)
- **`SortableDataTable<T>`**: DataTable + dnd-kit drag-and-drop reordering (requires `order` field)
- **Modal-based CRUD forms** with multi-language tabs (BG/EN/ES)
- **`ConfirmModal`**: reusable confirmation dialog with customizable title/message, keyboard support (Escape), glassmorphic styling
- **`RichTextEditor`**: TipTap editor with formatting toolbar, image upload, color picker
- **`AdminPermissionsContext`**: React context providing `can(resource, action)` helper for client-side permission checks
- **`AdminIdleGuard`**: wraps admin layout, auto-logout after 5 min inactivity with 1-min warning modal
- Admin sidebar has live pending quotes badge (30s polling)
- Admin pages: dashboard, products, categories, orders, quotes, content, banners, menu, types, media, coupons, notifications, users, roles, audit logs

### Frontend Components

- **`Header`**: navigation with dynamic menu, user dropdown, language switcher, mobile responsive
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
- Custom animations: `animate-float`, `animate-float-slow`, `animate-float-reverse`, `animate-pulse-glow`, `animate-fade-in-up`
- Animation delays: `.animation-delay-200`, `.animation-delay-400`, `.animation-delay-1000`, `.animation-delay-2000`
- Toast notifications: `sonner`

### Code Generation

- `lib/generateCode.ts`: auto-generates order numbers (`ORD-XXXX@D4D`) and quote numbers (`QUO-XXXX@D4D`)
- Auto-slug from English name, auto-SKU (`D4D-{count}-{timestamp}`)

### Coupons & Discounts

- **Coupon model**: code, type (percentage/fixed), value, currency, minPurchase, maxUses, perUserLimit, productIds[], allowOnSale, active, startsAt/expiresAt
- **Admin CRUD** (`/admin/coupons`): create/edit/delete coupons, product picker, usage stats, deep linking
- **Validation API** (`/api/coupons/validate`): checks active, dates, usage limits, product match, sale compatibility
- **Checkout integration**: coupon code applied at Stripe checkout, usage recorded in webhook via `CouponUsage` model
- **Customer UX**: coupon input on digital product pages (auto-apply via `?coupon=CODE` URL param), discount banner for service/physical products
- **Quote integration**: admin can attach coupon when sending quote offer, customer sees coupon badge on My Orders page

### Notifications

- **Notification model**: userId, type (quote_offer/admin_message/coupon), title, message, link, couponId, quoteId, read/readAt, scheduledAt, createdById
- **Admin page** (`/admin/notifications`): send notifications to users with smart recipient selection
  - **Quick filters**: Birthday Today/This Week/This Month, All Users (with count confirmation), By Role dropdown
  - **Schedule/snooze**: toggle to schedule notifications for future delivery with datetime picker
  - **Types**: admin messages and coupon notifications with optional deep links
- **Customer bell** (`NotificationBell`): unified notifications from quotes, admin messages, and coupons; scheduled notifications hidden until delivery time
- **Quote auto-notification**: when admin sends a quote offer, a Notification record is auto-created

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
```

## Key Constraints

1. **No transactions** — Neon HTTP adapter doesn't support them; use sequential operations
2. **No server actions** — all backend logic via API routes
3. **Trilingual content** — always maintain BG/EN/ES variants for user-facing fields
4. **Admin auth is triple-layer** — middleware checks cookie existence, `requirePermission()`/`requirePermissionApi()` does role + user-level permission validation, `AdminIdleGuard` handles inactivity timeout
5. **Prisma serialization** — always `JSON.parse(JSON.stringify())` when passing Prisma results to client components
6. **NextAuth v5 beta** — some APIs may change before final release
7. **Permission changes** — when modifying role permissions on `/admin/roles`, or user-level overrides on `/admin/users`, caches are invalidated. Changing a user's role clears their user-level overrides
