# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Prisma generate + DB push + Next.js build
npm run lint         # ESLint (flat config, Next.js core-web-vitals + typescript)
npm run start        # Start production server

npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema changes to DB
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed database (npx tsx prisma/seed.ts)

npm run blob:cleanup     # Delete orphaned Vercel Blob files
npm run blob:cleanup:dry # Dry run of blob cleanup
```

No test framework is configured.

## Architecture

**Digital4D** is a multilingual e-commerce platform for 3D printing services. Next.js 16 App Router with React 19, TypeScript 5, Tailwind CSS 4, Prisma 7, PostgreSQL (Neon).

### Routing & i18n

- **Locales**: Bulgarian (default), English, Spanish — configured in `i18n/config.ts`
- **Translations**: `messages/{bg,en,es}.json` — uses `next-intl`
- **Middleware** (`middleware.ts`): detects locale from cookie → IP country → Accept-Language header, sets `NEXT_LOCALE` cookie. Also protects `/admin/*` routes by checking for auth session cookie
- **Multilingual DB fields**: every user-facing text has `fieldBg`, `fieldEn`, `fieldEs` columns. Access pattern: `` `field${locale.charAt(0).toUpperCase() + locale.slice(1)}` ``

### Auth

- **NextAuth v5** (`auth.ts`): Credentials + Google + GitHub providers, JWT strategy (30-day sessions)
- **Roles**: `USER` / `ADMIN` enum in Prisma schema
- **Guards**: `requireAdmin()` for server components (redirects), `requireAdminApi()` for API routes (returns 401). Both in `lib/admin.ts`

### Database

- **Prisma 7** with Neon HTTP adapter (`lib/prisma.ts`) — **no transaction support**
- Schema in `prisma/schema.prisma` — key models: User, Product, ProductCategory, Content, ContentType, MenuItem, Order, QuoteRequest, QuoteMessage, DigitalPurchase, Banner
- Prisma results must be serialized for client components: `JSON.parse(JSON.stringify(data))`

### API Layer

- **No server actions** — all mutations through API routes in `app/api/`
- Admin CRUD routes in `app/api/admin/` (types, products, categories, content, banners, menu, orders, quotes, users)
- HTTP methods per route: GET (list/filter), POST (create), PUT (update by ID), PATCH (bulk operations like reordering), DELETE (by ID in query params)
- Error format: `{ error: "message" }` with appropriate HTTP status
- No optimistic updates — refetch after mutations

### Storage & Images

- **Vercel Blob** primary, local `public/uploads/` fallback (`lib/blob.ts`). Set `USE_LOCAL_UPLOADS=true` for local dev
- Upload endpoint (`/api/upload`): admin-only, max 5MB, Sharp compression to WebP (1920px max width, 80% quality), transparent PNGs kept as PNG

### Admin UI Patterns

- `app/components/admin/` contains reusable admin components
- **`DataTable<T>`**: generic paginated table with search, nested field access (e.g., `"user.name"`)
- **`SortableDataTable<T>`**: DataTable + dnd-kit drag-and-drop reordering (requires `order` field)
- **Modal-based CRUD forms** with multi-language tabs (BG/EN/ES)
- **RichTextEditor**: TipTap editor with formatting toolbar
- Admin sidebar has live pending quotes badge (30s polling)

### Styling

- **Tailwind v4** with inline theme in `app/globals.css` (no separate config file)
- Dark theme with glassmorphism: `.glass` and `.glass-strong` utility classes
- Primary gradient: `from-emerald-500 to-cyan-500`
- Fonts: `Exo_2` (headings), `Inter` (body) — both with Latin + Cyrillic subsets
- Icons: `lucide-react`
- Badge colors: 16 predefined in `lib/colors.ts` with `getColorClass()` helper

### Code Generation

- `lib/generateCode.ts`: auto-generates order numbers (`ORD-XXXX@D4D`) and quote numbers (`QUO-XXXX@D4D`)
- Auto-slug from English name, auto-SKU (`D4D-{count}-{timestamp}`)

### Payments

- **Stripe** checkout for digital products, webhook at `/api/checkout/webhook` creates `DigitalPurchase` records
- Downloads: token-based, max 3 downloads, expiring links

## Key Constraints

1. **No transactions** — Neon HTTP adapter doesn't support them; use sequential operations
2. **No server actions** — all backend logic via API routes
3. **Trilingual content** — always maintain BG/EN/ES variants for user-facing fields
4. **Admin auth is dual-layer** — middleware checks cookie existence, `requireAdmin()`/`requireAdminApi()` does full role validation