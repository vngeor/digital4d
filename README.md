# Digital4D

A multilingual e-commerce platform for 3D printing services, built with Next.js 16 and React 19. Supports Bulgarian, English, and Spanish.

**Live:** [digital4d.eu](https://digital4d.eu)

## Features

- **Multilingual** - Full i18n support (BG/EN/ES) with next-intl
- **E-commerce** - Product catalog, categories, digital downloads, Stripe payments
- **Quote System** - File uploads (STL/OBJ/3MF), quote requests, admin-customer messaging
- **CMS** - Dynamic pages, rich text editor, banners, news/services content
- **Admin Dashboard** - Products, orders, quotes, users, content, banners management
- **Authentication** - Email/password + OAuth (Google, GitHub)
- **Image Optimization** - Automatic compression, WebP conversion, Vercel Blob storage

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
│   │   ├── banners/       # Homepage banners management
│   │   ├── content/       # News/services content
│   │   ├── menu/          # Navigation menu items
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product catalog management
│   │   ├── quotes/        # Quote requests management
│   │   ├── types/         # Content types configuration
│   │   └── users/         # User management
│   ├── api/               # API routes
│   │   ├── admin/         # Admin-only endpoints
│   │   ├── auth/          # Authentication
│   │   ├── checkout/      # Stripe payment flow
│   │   ├── quotes/        # Quote system
│   │   └── upload/        # Image uploads
│   ├── components/        # Reusable UI components
│   ├── login/             # Authentication pages
│   ├── my-orders/         # User order history
│   ├── news/              # News listing
│   ├── products/          # Product catalog & downloads
│   ├── profile/           # User profile
│   └── services/          # Services listing
├── lib/                   # Utilities
│   ├── blob.ts            # Vercel Blob helpers
│   ├── prisma.ts          # Database client
│   └── generateCode.ts    # Order/quote number generation
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

## Database Schema

Key models:

- **User** - Accounts with roles (USER/ADMIN)
- **Product** - E-commerce catalog with multilingual content
- **ProductCategory** - Product categorization
- **Order** - Customer orders
- **QuoteRequest** - Quote requests with file attachments
- **QuoteMessage** - Quote conversation history
- **DigitalPurchase** - Digital download tokens
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

### Authenticated
- `GET /api/user/profile` - User profile
- `GET /api/user/orders` - User order history
- `GET /api/quotes/[id]/messages` - Quote messages

### Admin Only
- `/api/admin/products` - CRUD products
- `/api/admin/orders` - Manage orders
- `/api/admin/quotes` - Manage quotes
- `/api/admin/content` - Manage CMS content
- `/api/admin/banners` - Manage banners
- `/api/admin/users` - Manage users
- `/api/admin/menu` - Manage navigation
- `/api/admin/types` - Manage content types

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

## License

Private - All rights reserved

## Author

**Digital4D** - [digital4d.eu](https://digital4d.eu)