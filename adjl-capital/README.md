# ADJL Capital — Market Intelligence

Private market-intelligence platform for ADJL Capital (Daniel Laskowski, Andrew
Jongeneel, James Harvey). Migrated from the single-file HTML MVP to a full
Next.js 14 application with authentication, a Postgres database, and a secure
server-side AI backend.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **NextAuth.js v5** (credentials provider)
- **Supabase** (PostgreSQL) via **Prisma**
- **@anthropic-ai/sdk** (server-side only)
- **Realty Mole** property API (listings)
- Fonts: Cormorant Garamond + Barlow + Barlow Condensed (`next/font`)

## Features

- Email/password login for the three partners (NextAuth + bcrypt)
- **Top 20** curated markets, **All 50 States**, **College Towns**,
  **Defense & Tech**, and a **Compare All** table (70 rows)
- Per-row AI growth synopsis (Claude), cached for the session
- **Property Analyzer** — manual entry or paste a Zillow/Redfin URL; runs the
  DSCR / cap-rate / IRR engine across three ownership scenarios (ADJL-owned,
  5-investor, single investor) with a STRONG BUY / CONDITIONAL / PASS verdict
- **Deal Pipeline** — save analyses to Postgres, update status, edit notes,
  delete, expand for full metrics, export CSV
- **Live Listings** in the market detail panel (Realty Mole, 24h cache, with
  Zillow/Redfin fallback)

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` (used by Next) and `.env` (used by the
Prisma CLI), then fill in the values:

```bash
ANTHROPIC_API_KEY=sk-ant-...          # console.anthropic.com/keys
NEXTAUTH_SECRET=                       # run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000     # prod URL on Vercel
AUTH_SECRET=                           # same value as NEXTAUTH_SECRET
DATABASE_URL=postgresql://...          # Supabase project settings → Database
REALTY_MOLE_API_KEY=                   # realtymole.com after signup
```

> NextAuth v5 reads `AUTH_SECRET`/`AUTH_URL`; keep them in sync with the
> `NEXTAUTH_*` values.

### 3. Database

```bash
npx prisma db push      # create the User + Deal tables
npx prisma db seed      # create the three partner accounts
```

Set the seed passwords before seeding (defaults are `CHANGE_ME_*`):

```bash
SEED_PW_DANIEL=... SEED_PW_ANDREW=... SEED_PW_JAMES=... npx prisma db seed
```

### 4. Run

```bash
npm run dev
# http://localhost:3000  →  redirects to /login
```

## Deploy (Vercel)

1. Push to GitHub and import the repo into Vercel (set the **Root Directory** to
   `adjl-capital`).
2. Add every variable from `.env.example` in the Vercel project settings.
3. Against the production database, run `npx prisma db push` then
   `npx prisma db seed`.
4. Set `NEXTAUTH_URL` / `AUTH_URL` to the production domain.

## Project Layout

```
app/
  (auth)/login            login page
  (dashboard)/            protected app (Navbar + 7 tabs)
  api/                    auth, claude, listings, deals (+[id], export)
components/               UI components (+ ui/ shadcn primitives)
lib/
  data/                   markets.ts (TOP20), states.ts (STATES)
  calc/analyzer.ts        calcScenario + verdict + runAnalysis
  claude.ts listings.ts prompts.ts rateLimit.ts db/prisma.ts
prisma/                   schema.prisma + seed.ts
auth.ts auth.config.ts    NextAuth v5 config
middleware.ts             route protection
```

_ADJL Capital, LLC — Private & Confidential._
