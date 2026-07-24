# Vestique

A fashion/dress e-commerce MVP built with Next.js 14, Supabase, and Tailwind CSS.

## Getting Started

### 1. Clone and install
```bash
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run the contents of `supabase/schema.sql`
3. In **Storage**, create a public bucket named `product-images`
4. In **Authentication → Providers**, enable Google OAuth (optional)

### 3. Configure environment variables
Fill in `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pages

| Route | Description |
|---|---|
| `/` | Product catalog with search & category filter |
| `/login` | Sign in (email/password + Google OAuth) |
| `/signup` | Create account (customer or designer) |
| `/product/[id]` | Product detail + recommendations |
| `/wishlist` | User's saved items |
| `/cart` | Cart with quantity controls + Place Order |
| `/orders` | Order history with status |
| `/designer/upload` | Upload product (designer role only) |

---

## Roles

- **Customer** — Browse, wishlist, add to cart, place orders
- **Designer** — All customer features + upload products to the catalog

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Next.js

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (Auth, Postgres, Storage)
- **lucide-react** (icons)
