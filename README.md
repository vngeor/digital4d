# Digital4D

A multilingual e-commerce platform for 3D printing services, built with Next.js 16 and React 19. Supports Bulgarian, English, and Spanish.

**Live:** [digital4d.eu](https://digital4d.eu)

## Features

- **Multilingual** - Full i18n support (BG/EN/ES) with next-intl
- **E-commerce** - Product catalog, categories, digital downloads, Stripe payments
- **Product Packages & SIZE×COLOR Matrix** - Weight/size variants (e.g., "1 kg", "500g") per product with individual pricing. SIZE×COLOR matrix (`ProductPackageVariant`) tracks per-combination availability — a specific size+color can be in_stock while others are sold_out. Validated at checkout
- **Coupons & Discounts** - Percentage/fixed coupons, product-specific or global, promotional badges on product cards, live countdown timers
- **Wishlist** - Save products for later, price drop & coupon notifications
- **Recently Viewed** - localStorage-based recently viewed products section on homepage (always-carousel with prev/next arrows; all 3 locale names stored; no login required)
- **Quote System** - File uploads (STL/OBJ/3MF), quote requests, admin-customer messaging
- **Notifications** - Unified notification system with scheduling, smart recipient selection, coupon & wishlist alerts
- **CMS** - Dynamic pages, rich text editor, banners, news/services content, show/hide from nav, title alignment
- **Admin Dashboard** - Products, orders, quotes, users, content, banners, coupons, notifications, media, audit logs; quick field toggles (published/featured/bestSeller) with optimistic UI directly in the table; EUR-only currency throughout
- **Role-Based Access Control** - 4 roles (Admin/Editor/Author/Subscriber) with per-role and per-user permission overrides
- **Security** - Nonce-based CSP (per-request, strict-dynamic), rate limiting (login, register, search, coupons, quotes), security headers (HSTS, X-Frame-Options, nosniff), XSS sanitization (sanitize-html), input validation, checkout origin whitelist, sanitized error logging, auto-logout after 5 min inactivity, permission-gated admin pages and API routes
- **Birthday Prompts** - Registration birthDate field, profile banner for missing birthDate, header indicator with pulsing dot
- **Authentication** - Email/password + OAuth (Google, GitHub), "Remember me" checkbox, auto-retry on OAuth cold-start errors
- **Global Search** - Site-wide search with Cmd+K shortcut, "View All" results page, keyboard navigation, recent searches
- **Image Optimization** - Automatic compression, WebP conversion, Vercel Blob storage
- **SEO** - Dynamic OG tags, Twitter cards, JSON-LD schemas (Product, NewsArticle, Service, Organization), sitemap, robots.txt, per-page generateMetadata
- **Footer** - Site-wide footer with Terms of Use and Privacy Policy links
- **Mobile Responsive** - iOS Safari optimized (input zoom prevention, tap highlight removal, font smoothing), touch-friendly targets, responsive coupon badges, mobile-safe modals/popups with proper viewport constraints, CSS cascade layer architecture for Tailwind v4 compatibility

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com) |
| Database | [PostgreSQL](https://www.postgresql.org) via [Neon](https://neon.tech) |
| ORM | [Prisma 7](https://prisma.io) |
| Auth | [NextAuth.js v5](https://authjs.dev) |
| i18n | [next-intl](https://next-intl-docs.vercel.app) |
| Storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| Payments | [Stripe](https://stripe.com) |
| Editor | [TipTap](https://tiptap.dev) |
| Icons | [Lucide React](https://lucide.dev) |

## Project Structure

```
digital4d-next/
├── app/
│   ├── [menuSlug]/        # Dynamic CMS pages
│   ├── admin/             # Admin dashboard
│   │   ├── audit-logs/    # Action audit trail
│   │   ├── banners/       # Homepage banners management
│   │   ├── content/       # News/services content
│   │   ├── coupons/       # Coupon & discount management
│   │   ├── media/         # Media gallery
│   │   ├── menu/          # Navigation menu items
│   │   ├── notifications/ # User notification management
│   │   ├── notification-templates/ # Auto-scheduled templates
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product catalog management
│   │   ├── quotes/        # Quote requests management
│   │   ├── roles/         # Role permission matrix
│   │   ├── types/         # Content types configuration
│   │   └── users/         # User management
│   ├── api/               # API routes
│   │   ├── admin/         # Admin-only endpoints
│   │   ├── auth/          # Authentication
│   │   ├── checkout/      # Stripe payment flow
│   │   ├── coupons/       # Coupon validation
│   │   ├── notifications/ # User notifications
│   │   ├── quotes/        # Quote system
│   │   ├── search/        # Global site search
│   │   ├── wishlist/      # Wishlist management
│   │   └── upload/        # Image uploads
│   ├── components/        # Reusable UI components
│   ├── checkout/          # Stripe success/cancel pages
│   ├── login/             # Authentication pages
│   ├── my-orders/         # User order history
│   ├── news/              # News listing
│   ├── products/          # Product catalog & downloads
│   ├── profile/           # User profile
│   ├── search/            # Search results page
│   ├── services/          # Services listing
│   └── wishlist/          # Saved products
├── lib/                   # Utilities
│   ├── admin.ts           # Auth guards (requirePermission, requirePermissionApi)
│   ├── permissions.ts     # Permission resolution (role + user overrides)
│   ├── blob.ts            # Vercel Blob helpers
│   ├── prisma.ts          # Database client
│   ├── rateLimit.ts       # In-memory rate limiter (per-IP)
│   ├── validation.ts      # Input length validation helpers
│   ├── sanitize.ts        # HTML sanitization (sanitize-html)
│   ├── generateCode.ts    # Order/quote number generation
│   ├── cronNotifications.ts # Cron job logic for auto-scheduled notifications
│   └── orthodoxEaster.ts  # Orthodox Easter date calculation
├── messages/              # i18n translations (bg, en, es)
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
└── scripts/               # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- Vercel account (for Blob storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/vngeor/digital4d.git
cd digital4d

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client & push schema
npm run db:generate
npm run db:push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file with these variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

# OAuth Providers (optional)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Stripe Payments (optional)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="https://your-domain.com"

# Local Development (optional)
USE_LOCAL_UPLOADS="true"  # Use local storage instead of Vercel Blob

# Cron (optional)
CRON_SECRET="generate-random-32-byte-hex"  # For scheduled notification templates
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |
| `npm run blob:cleanup` | Delete orphaned blob files |
| `npm run blob:cleanup:dry` | Preview orphaned blobs (dry run) |
| `npm run deploy:clean` | Deploy to Vercel without build cache |

## Database Schema

Key models:

- **User** - Accounts with roles (ADMIN/EDITOR/AUTHOR/SUBSCRIBER)
- **RolePermission** - Per-role permission overrides
- **UserPermission** - Per-user permission overrides
- **Product** - E-commerce catalog with multilingual content
- **ProductVariant** - Color variants per product (colorHex, colorName BG/EN/ES, image, status)
- **ProductPackage** - Size/weight variants per product (label, price, salePrice, status)
- **ProductPackageVariant** - SIZE×COLOR junction — per-combination status (in_stock/sold_out/etc.)
- **ProductCategory** - Product categorization
- **Order** - Customer orders
- **QuoteRequest** - Quote requests with file attachments
- **QuoteMessage** - Quote conversation history
- **DigitalPurchase** - Digital download tokens
- **Coupon** - Discount codes (percentage/fixed, product-specific, date ranges)
- **CouponUsage** - Coupon usage tracking per user
- **Notification** - User notifications (admin messages, coupons, wishlist alerts, auto-scheduled)
- **NotificationTemplate** - Auto-scheduled notification templates (birthday, holidays, custom dates with optional auto-coupon)
- **TemplateSendLog** - Tracks template sends per user per year (dedup)
- **WishlistItem** - User wishlisted products
- **WishlistNotification** - Prevents duplicate wishlist notifications
- **MenuItem** - Dynamic navigation
- **Content** - CMS content (news, services)
- **ContentType** - Content categorization
- **Banner** - Homepage hero, promo strip, featured cards

## API Routes

### Public
- `GET /api/menu` - Navigation menu
- `GET /api/banners` - Homepage banners
- `GET /api/news` - Published news
- `POST /api/quotes` - Submit quote request
- `POST /api/checkout` - Stripe checkout session
- `POST /api/coupons/validate` - Validate coupon code
- `GET /api/search?q=&limit=` - Global site search

### Authenticated
- `GET/PUT /api/user/profile` - User profile
- `GET /api/user/orders` - User order history
- `GET /api/quotes/[id]/messages` - Quote messages
- `GET /api/notifications` - User notifications
- `GET/POST/DELETE /api/wishlist` - Wishlist management

### Admin Only
- `/api/admin/products` - CRUD products
- `/api/admin/orders` - Manage orders
- `/api/admin/quotes` - Manage quotes
- `/api/admin/content` - Manage CMS content
- `/api/admin/banners` - Manage banners
- `/api/admin/coupons` - Manage coupons
- `/api/admin/notifications` - Manage notifications
- `/api/admin/notification-templates` - Manage auto-scheduled notification templates
- `/api/cron/notifications` - Daily cron job for processing templates
- `/api/admin/users` - Manage users
- `/api/admin/users/permissions` - Per-user permission overrides
- `/api/admin/media` - Media gallery
- `/api/admin/menu` - Manage navigation
- `/api/admin/types` - Manage content types
- `/api/admin/roles` - Role permission matrix
- `/api/admin/categories` - Manage product categories

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

The build process automatically:
- Generates Prisma client
- Pushes database schema
- Builds Next.js application

### Manual

```bash
npm run build
npm run start
```

## Admin Access

1. Register a new account
2. Update user role in database:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
   ```
3. Access admin at `/admin`

**Roles:** Admin (full access), Editor (configurable), Author (configurable), Subscriber (no admin access)

**Security:**
- Admin panel auto-logs out after 5 minutes of inactivity with 1-minute warning
- Rate limiting: login (5/15min), register (3/hr), search (20/min), coupons (10/min), quotes (5/hr)
- Nonce-based CSP: per-request cryptographic nonces with `strict-dynamic` (no `unsafe-inline` for scripts)
- Security headers: HSTS, X-Frame-Options (DENY), nosniff, Referrer-Policy, Permissions-Policy
- XSS sanitization on all user-facing HTML rendering (sanitize-html)
- Input validation with max length checks on all public API routes
- Checkout origin whitelisting (prevents open redirect)
- Sanitized error logging (no stack traces or DB details in production logs)

---

## Admin Panel Guide

The admin panel (`/admin`) provides full control over all aspects of the platform.

### Dashboard (`/admin`)

Overview with key statistics:
- Total users, orders, pending orders, content items
- Recent orders with status badges
- Recent user registrations

---

### Products (`/admin/products`)

Manage your product catalog with full e-commerce features.

**Features:**
- Drag-and-drop reordering
- Category filtering tabs
- Homepage position indicator (top 8 published products shown on homepage)
- Clickable slugs and SKUs with external links

**Product Fields:**
| Field | Description |
|-------|-------------|
| Slug | URL-friendly identifier (e.g., `my-product`) |
| SKU | Auto-generated or custom stock keeping unit |
| Name | Multilingual (BG/EN/ES) |
| Description | Rich text with TipTap editor |
| Price | Fixed price with currency selection |
| Sale Price | Discounted price (when "On Sale" enabled) |
| Price Type | `Fixed`, `From` (starting price), or `Quote` (request quote) |
| Category | Product category assignment |
| Tags | Multiple tags for filtering |
| Image | Main product image (auto-compressed) |
| Gallery | Multiple additional images |
| File URL | Digital download file (for digital products) |
| File Type | `Digital`, `Physical`, or `Service` |
| Status | `in_stock`, `out_of_stock`, `coming_soon`, `pre_order`, `sold_out` — controls availability and image overlay banners |
| Featured | ⭐ Circle badge on card, prioritized on homepage |
| Best Seller | ✓ Amber badge on card and product detail page |
| Published | Visible on frontend |

**Quick Toggles** (click directly in the products table without opening the form):
- 👁 Published — show/hide on frontend
- ⭐ Featured — star badge + homepage priority
- 🏆 Best Seller — amber badge on product cards and detail page

**Export**: "Export CSV" button downloads all products as `products-YYYY-MM-DD.csv` (SKU, name BG/EN/ES, category, brand, type, status, price, sale price, featured, best seller, published, tags, slug). UTF-8 BOM for Excel Cyrillic support.

**Categories** (`/admin/products/categories`):
- Create/edit product categories
- Multilingual names and descriptions
- 41-color visual swatch picker
- Category images

---

### Orders (`/admin/orders`)

Track and manage customer orders.

**Features:**
- Status filter tabs: All, Pending, In Progress, Completed, Cancelled
- Quick status change dropdown in table
- Click-to-copy order numbers

**Order Fields:**
| Field | Description |
|-------|-------------|
| Order Number | Auto-generated unique ID (e.g., `ORD-XXXX@D4D`) |
| Customer Name | Customer's full name |
| Customer Email | Contact email |
| Phone | Optional phone number |
| Description | Order details/requirements |
| Status | `PENDING` → `IN_PROGRESS` → `COMPLETED` or `CANCELLED` |
| Notes | Internal admin notes |

---

### Quotes (`/admin/quotes`)

Handle quote requests for custom 3D printing services.

**Features:**
- Status filter tabs with pending count badge
- File downloads (STL/OBJ/3MF)
- Conversation history with customer
- "Seen/Not seen" status for sent quotes

**Quote Statuses:**
| Status | Description |
|--------|-------------|
| Pending | New request awaiting review |
| Quoted | Price sent to customer |
| Accepted | Customer accepted the quote |
| Rejected | Admin rejected the request |
| Counter Offer | Customer proposed different price |
| User Declined | Customer declined the quote |

**Quote Fields:**
| Field | Description |
|-------|-------------|
| Quote Number | Auto-generated (e.g., `QUO-XXXX@D4D`) |
| Customer Info | Name, email, phone |
| Product | Linked product (optional) |
| Message | Customer's requirements |
| File | Uploaded 3D model file |
| Quoted Price | Your price offer |
| Admin Notes | Message to customer with quote |

---

### Banners (`/admin/banners`)

Manage homepage visual elements.

**Banner Types:**
| Type | Description | Recommended Size |
|------|-------------|------------------|
| Hero | Full-width carousel slides | 1920 x 1080px (16:9) |
| Promo | Announcement strip below header | Text only (image optional) |
| Card | Featured content cards | 800 x 450px (16:9) |

**Features:**
- Drag-and-drop reordering
- Type filter tabs
- Quick publish/unpublish toggle
- Image upload with preview

**Banner Fields:**
| Field | Description |
|-------|-------------|
| Type | Hero, Promo, or Card |
| Title | Multilingual headline |
| Subtitle | Multilingual description |
| Image | Banner image |
| Link | Click destination URL |
| Link Text | Button/link label (multilingual) |
| Published | Visible on homepage |
| Order | Display order within type |

---

### Content (`/admin/content`)

Manage news articles and service pages.

**Features:**
- Type filter tabs (dynamically from your content)
- Drag-and-drop reordering
- Homepage position for news (top 4 shown)
- Rich text editor (TipTap)

**Content Fields:**
| Field | Description |
|-------|-------------|
| Type | Content type (e.g., `news`, `service`) |
| Slug | URL path (e.g., `/news/my-article`) |
| Title | Multilingual headline |
| Body | Rich text content (multilingual) |
| Image | Featured image |
| Menu Item | Link to navigation menu |
| Published | Visible on frontend |
| Order | Display order |

---

### Menu (`/admin/menu`)

Configure navigation menu items.

**Features:**
- Linked content count indicator
- Quick publish toggle
- Rich text body for landing pages

**Menu Item Fields:**
| Field | Description |
|-------|-------------|
| Slug | URL path (e.g., `services` → `/services`) |
| Type | Categorization for content linking |
| Title | Multilingual menu label |
| Body | Landing page content (multilingual, rich text) |
| Published | Visible in navigation |
| Order | Menu display order |

---

### Content Types (`/admin/types`)

Define content categories with custom styling.

**Fields:**
| Field | Description |
|-------|-------------|
| Slug | Type identifier (e.g., `news`, `service`) |
| Name | Multilingual display name |
| Description | Type description for listing pages |
| Color | Badge color — 41 options via visual swatch picker (all Tailwind base colors + cobalt, navy, ocean, plum, crimson, coral, gold, mint, jade, silver, etc.) |
| Order | Display order |

---

### Users (`/admin/users`)

Manage user accounts, roles, and per-user permissions.

**Features:**
- User statistics (total, admins, editors, authors, subscribers)
- Role filter tabs (All, Admin, Editor, Author, Subscriber)
- Quick role change dropdown
- Order and quote history per user
- **Permissions tab** (for Editor/Author users) — override role defaults per user

**User Fields:**
| Field | Description |
|-------|-------------|
| Name | Display name |
| Email | Account email |
| Phone | Contact phone |
| Image | Profile picture (from OAuth) |
| Role | `ADMIN`, `EDITOR`, `AUTHOR`, or `SUBSCRIBER` |
| Orders | Count of orders placed |

---

### Roles & Permissions (`/admin/roles`)

Configure role-level permissions with a visual matrix.

**Features:**
- Permission matrix: 11 resources × 4 actions (view, create, edit, delete)
- Admin role is locked (always full access)
- Editor and Author permissions are fully configurable
- Per-user overrides available from the Users page

**Permission Resolution (3-tier):**
1. **User override** (highest priority) — set per-user on Users page
2. **Role override** — set on Roles page
3. **Code defaults** — hardcoded fallback in `lib/permissions.ts`

---

### Coupons (`/admin/coupons`)

Manage discount codes for products and checkout.

**Features:**
- Percentage or fixed-amount discounts
- Product-specific or global (all products) coupons
- Usage limits (total and per-user)
- Date range scheduling (start/expiry)
- `showOnProduct` toggle for promotional badges on product cards and detail pages
- Product picker with all-products-on-focus and select all/deselect all
- Usage statistics and deep linking

---

### Notifications (`/admin/notifications`)

Send and manage user notifications. Tab navigation to Templates page.

**Features:**
- Smart recipient selection with all-users-on-focus, search, and select all
- Quick filters: Birthday Today/This Week/This Month, All Users, By Role
- Schedule notifications for future delivery
- Admin message, coupon, and auto notification types
- Optional deep links
- "Auto" filter tab to view template-generated notifications
- RichTextEditor (TipTap) for HTML message composition
- Per-type badges: Birthday, Christmas, New Year, Easter, Template — each with distinct color
- Locale-aware title/message display (auto-notifications store JSON, parsed per locale)
- Mobile responsive with proper touch targets and spacing

---

### Notification Templates (`/admin/notification-templates`)

Manage auto-scheduled notification templates for recurring events.

**Features:**
- Template triggers: Birthday, Christmas, New Year, Orthodox Easter, Custom Date
- Configurable "days before" event scheduling
- Multi-language message templates with placeholder support (`{name}`, `{couponCode}`, `{couponValue}`, `{expiresAt}`)
- Auto-coupon generation: personal coupon per recipient with configurable type, value, duration, product restrictions
- Product picker with all-products-on-focus and select all/deselect all
- Test send to a single user for verification
- Active/inactive toggle and last run statistics
- Daily Vercel Cron job at 8 AM UTC processes active templates
- Duplicate prevention: one notification per user per template per year

---

### Media Gallery (`/admin/media`)

Manage uploaded images and files.

**Features:**
- Grid and list views
- File type filtering
- Image preview with metadata
- Bulk delete support

---

### Audit Logs (`/admin/audit-logs`)

Track all admin actions.

**Features:**
- Action badges with icons (create, edit, delete)
- Resource badges matching sidebar icons
- User attribution
- Date range filtering

---

### Common Admin Features

All admin tables include:
- **Search** - Filter by text content
- **Sorting** - Click column headers
- **Pagination** - Automatic for large datasets
- **Bulk Actions** - Delete with confirmation
- **Responsive** - Works on mobile devices

### Keyboard Shortcuts

- Click order/quote numbers to copy to clipboard
- External link icons on slugs open in new tab

---

## Roadmap

### Blocked on External Services
- **Forgot password** — requires email service (Resend)
- **Email verification** — verify on registration
- **Newsletter registration** — subscriber model, footer signup
- **Upgrade rate limiting to Redis** — Upstash for cross-instance protection

### Planned
- **GA4 / Meta Pixel tracking**
- **Product reviews/ratings**
- **Testimonials section**
- **Color + Size filters on products page** - Filter catalog by variant color swatches and package size/weight chips (e.g., "1 kg"), dynamically generated from actual DB data

---

## License

Private - All rights reserved

## Author

**Digital4D** - [digital4d.eu](https://digital4d.eu)