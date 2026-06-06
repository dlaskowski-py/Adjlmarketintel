# ADJL Capital — Market Intelligence App

## Claude Code Build Instructions

> **Read this entire document before writing a single line of code.**
> This is the complete specification for building the ADJL Capital Market Intelligence web application.
> The attached file `ADJL_Market_Intelligence_v3.html` is the working MVP. Your job is to turn it into a full Next.js application. Do not redesign anything — replicate it exactly and add the new features listed below.

-----

## 0. What You Are Building

A private web application for ADJL Capital, a three-partner private equity firm. The three partners are:

- **Daniel Laskowski** — [daniel@adjlcapital.com](mailto:daniel@adjlcapital.com)
- **Andrew Jongeneel** — [andrew@adjlcapital.com](mailto:andrew@adjlcapital.com)
- **James Harvey** — [james@adjlcapital.com](mailto:james@adjlcapital.com)

The app lets them research real estate markets, analyze investment properties, and track deals. Everything is already working in the HTML file. You are migrating it to a proper application with authentication, a database, and a secure backend.

-----

## 1. Tech Stack

Use exactly these technologies. Do not substitute.

```
Framework:       Next.js 14 (App Router, TypeScript)
Styling:         Tailwind CSS
Components:      shadcn/ui
Auth:            NextAuth.js v5 (credentials provider)
Database:        Supabase (PostgreSQL)
ORM:             Prisma
AI:              @anthropic-ai/sdk (server-side only)
Deployment:      Vercel
Property API:    Realty Mole (realtymole.com)
Fonts:           Cormorant Garamond + Barlow + Barlow Condensed (Google Fonts via next/font)
```

-----

## 2. Design System

Copy these exactly from the HTML file. Do not change any colors, fonts, or spacing.

```css
/* Colors */
--navy:     #0F1A2E   /* primary background */
--navy-mid: #1B2B4B   /* card backgrounds */
--gold:     #C9A84C   /* primary accent */
--gold-l:   #E2C87A   /* secondary accent */
--cream:    #F8F5EF   /* body text */
--muted:    rgba(248,245,239,0.5)  /* secondary text */
--green:    #1A6B3C   /* positive / hot */
--red:      #8B1A1A   /* negative / caution */
--border:   rgba(201,168,76,0.15)  /* borders */

/* Fonts */
Display:   'Cormorant Garamond' — headlines, city names, scores, rank numbers
Body:      'Barlow' — all UI text, labels, buttons, paragraphs
Numbers:   'Barlow Condensed' — prices, metrics, data values

/* Patterns */
Cards:     rgba(27,43,75,0.6) background + 1px gold border, backdrop-filter blur
Sections:  Gold left-border box for strategy, red left-border box for risk
Badges:    green for positive growth, gold for neutral, red for negative
Active:    Gold 3px left border on selected rows
```

-----

## 3. Project Structure

Create this exact folder structure:

```
adjl-capital/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Navbar + protected wrapper
│   │   ├── page.tsx            ← Top 20 Markets (default route)
│   │   ├── states/page.tsx     ← All 50 States
│   │   ├── college/page.tsx    ← College Towns
│   │   ├── defense/page.tsx    ← Defense & Tech
│   │   ├── compare/page.tsx    ← Compare All
│   │   ├── analyze/page.tsx    ← Property Analyzer
│   │   └── pipeline/page.tsx   ← Saved Deals
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── claude/route.ts     ← Anthropic API proxy
│       ├── listings/route.ts   ← Realty Mole proxy
│       └── deals/
│           ├── route.ts        ← GET all, POST create
│           └── [id]/route.ts   ← PATCH, DELETE
├── components/
│   ├── ui/                     ← shadcn components (auto-generated)
│   ├── Navbar.tsx
│   ├── MarketRow.tsx
│   ├── StateRow.tsx
│   ├── DetailPanel.tsx
│   ├── AISynopsis.tsx
│   ├── ListingCards.tsx
│   ├── AnalyzerForm.tsx
│   ├── AnalysisResults.tsx
│   ├── VerdictBadge.tsx
│   └── PipelineTable.tsx
├── lib/
│   ├── data/
│   │   ├── markets.ts          ← TOP20 array (extracted from HTML)
│   │   └── states.ts           ← STATES array (extracted from HTML)
│   ├── calc/
│   │   └── analyzer.ts         ← calcScenario + verdict functions
│   ├── claude.ts               ← Server-side Claude wrapper
│   ├── listings.ts             ← Realty Mole wrapper
│   └── db/
│       └── prisma.ts           ← Prisma singleton
├── prisma/
│   └── schema.prisma
├── middleware.ts               ← Auth protection
└── .env.local
```

-----

## 4. Environment Variables

Create `.env.local` with these keys. Tell the user to fill them in before running:

```bash
ANTHROPIC_API_KEY=sk-ant-...          # console.anthropic.com/keys
NEXTAUTH_SECRET=                       # run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000     # change to prod URL on Vercel
DATABASE_URL=postgresql://...          # Supabase project settings
REALTY_MOLE_API_KEY=                   # realtymole.com after signup
```

-----

## 5. Database Schema

Create `prisma/schema.prisma` with exactly this content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  deals     Deal[]
  createdAt DateTime @default(now())
}

model Deal {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  address      String
  sourceUrl    String?
  city         String
  price        Float
  units        Int
  bedsPerUnit  Int
  rentPerUnit  Float
  strategy     String
  yearBuilt    Int?
  sqft         Int?
  mortgageRate Float
  results      Json
  aiAnalysis   String?
  verdict      String
  irr          Float
  status       String   @default("researching")
  notes        String?
  savedBy      String
  savedAt      DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

-----

## 6. Data Files

### `lib/data/markets.ts`

Extract the `TOP20` array from the HTML file and export it as TypeScript. The TypeScript interface is:

```typescript
export interface Market {
  id: string
  rank: string
  cat: string           // e.g. 'college' | 'military defense' | 'tech'
  tcls: string          // CSS tag class: 'tc' | 'tm' | 'tt' | 'td' | 'tl'
  tlbl: string          // Tag label text
  score: number
  active: boolean
  city: string
  drv: string           // Driver / university description
  median: string        // e.g. '$395,000'
  rent: string          // e.g. '$1,253/mo'
  growth: string        // e.g. '+0.2%'
  vac: string           // Vacancy description
  perRoom: string       // Per-room rate
  bc: 'bu' | 'bw' | 'bd'  // Badge class: up/warn/down
  why: string
  strat: string
  risk: string
}
```

The 20 markets are (in order): College Station TX, Tuscaloosa AL, Columbus OH, Gainesville FL, Athens GA, Auburn AL, Harrisonburg VA, Indianapolis IN, Ypsilanti MI — then San Antonio TX, Raleigh-Durham NC, Augusta GA, Charlotte NC, Nashville TN, Huntsville AL, Colorado Springs CO, Boise ID, Hampton Roads VA, Savannah GA.

**Active deal flag:** Georgia’s Atlanta deal is tracked in the states list (not the top 20). College Station has `active: false`.

### `lib/data/states.ts`

Extract the `STATES` array from the HTML file and export as TypeScript:

```typescript
export interface State {
  abbr: string
  name: string
  price: string
  rent: string
  growth: string
  inv: 'hot' | 'good' | 'mod' | 'cau'
  invL: string
  active?: boolean
  driver: string
  note: string
}
```

Georgia (GA) has `active: true`. All other states have no active flag.

-----

## 7. Calculation Engine

Create `lib/calc/analyzer.ts`. Convert these functions from the HTML to TypeScript exactly — do not change the math:

```javascript
// COPY THIS EXACTLY — do not modify the calculations
function calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, rate, label, downPct, numInvestors){
  const down = price * downPct;
  const mortgage = price - down;
  const rm = (rate/100)/12;
  const n = 25*12;
  const monthlyPmt = mortgage * (rm*Math.pow(1+rm,n)) / (Math.pow(1+rm,n)-1);
  const annualDebt = monthlyPmt * 12;
  const effectiveRent = strategy === 'room' ? rentPerUnit * bedsPerUnit * units : rentPerUnit * units;
  const grossAnnual = effectiveRent * 12;
  const egi = grossAnnual * 0.92;
  const opex = egi * 0.52;
  const noi = egi - opex;
  const dscr = annualDebt > 0 ? noi / annualDebt : 999;
  const capRate = (noi / price) * 100;
  const onePctRule = (effectiveRent / price) * 100;
  const mgmtFee = numInvestors > 1 ? down * 0.015 : 0;
  const netCF = noi - annualDebt - mgmtFee;
  const perInvCF = numInvestors > 0 ? netCF / numInvestors : netCF;
  const exitPrice = price * 1.12;
  let remBal = mortgage;
  for(let i=0;i<48;i++){const int=remBal*rm; remBal-=(monthlyPmt-int);}
  const netExit = exitPrice - remBal;
  const profitPool = netExit - down;
  const carry = numInvestors > 1 ? profitPool * 0.16 : 0;
  const invPool = profitPool - carry;
  const perInvExit = numInvestors > 0 ? invPool / numInvestors : invPool;
  const totalBack = (perInvCF * 4) + (down/numInvestors||down) + perInvExit;
  const invested = numInvestors > 1 ? (down/numInvestors) * 1.03 : down;
  const cfs = [-invested, perInvCF, perInvCF, perInvCF, perInvCF + (down/numInvestors||down) + perInvExit];
  let irr = 0.15;
  for(let i=0;i<2000;i++){
    const f=cfs.reduce((s,c,j)=>s+c/Math.pow(1+irr,j),0);
    const df=cfs.reduce((s,c,j)=>s-j*c/Math.pow(1+irr,j+1),0);
    if(Math.abs(df)<1e-10) break;
    irr=Math.max(irr-f/df,-0.99);
  }
  const moic = totalBack / invested;
  return {down,annualDebt,noi,dscr,capRate,onePctRule,netCF,perInvCF,
    exitPrice,perInvExit,totalBack,invested,irr:irr*100,moic,monthlyPmt,
    grossAnnual,effectiveRent,mgmtFee,numInvestors,label};
}

function verdict(irr, dscr, onePct){
  if(irr >= 18 && dscr >= 1.25 && onePct >= 1.0) return {cls:'verdict-buy', label:'STRONG BUY', emoji:'✓'};
  if(irr >= 12 && dscr >= 1.10) return {cls:'verdict-maybe', label:'CONDITIONAL', emoji:'~'};
  return {cls:'verdict-pass', label:'PASS', emoji:'✗'};
}
```

Export a `runAnalysis(inputs: AnalyzerInputs)` function that calls `calcScenario` three times:

- `adjl`: `numInvestors=3`, `label="ADJL Owned"`
- `deal5`: `numInvestors=5`, `label="Investor Deal"`
- `solo`: `numInvestors=1`, `label="Single Investor"`

All three use `downPct=0.20`.

-----

## 8. Backend API Routes

### `app/api/claude/route.ts`

```typescript
// POST /api/claude
// Body: { prompt: string }
// Returns: { text: string }
// - Requires valid NextAuth session (return 401 if not authenticated)
// - Rate limit: 20 requests per user per minute
// - Uses claude-sonnet-4-20250514, max_tokens: 1000
// - ANTHROPIC_API_KEY comes from process.env — never expose to client
```

The three prompt types used by the frontend:

**Market synopsis prompt** (when user clicks a curated market):

```
You are a real estate investment analyst for ADJL Capital, a private equity firm.
Write a sharp 3-paragraph growth synopsis for {city} ({driver}).

Paragraph 1 — Why It's Booming: Specific economic catalysts, job growth, population trends making this market boom in 2026. Specific companies and numbers.

Paragraph 2 — Home Price Analysis: Current median price of {median}. How it compares to the national average of $355,000. Rent of {rent}. What ADJL Capital can realistically acquire at this price point.

Paragraph 3 — 3–5 Year Outlook: Forward-looking assessment of rent growth, appreciation potential, and fit for ADJL Capital's multifamily + per-room leasing or defense/military workforce housing strategy.

Around 200 words. Plain text only, no bullets, no markdown.
```

**State analysis prompt** (when user clicks a state):

```
You are a real estate investment analyst for ADJL Capital, a private equity firm.
Write a sharp 3-paragraph investment analysis for {name} as a state-level real estate market.

Paragraph 1 — Why It's Worth Watching: Key economic drivers, job growth, population trends, and what makes this state interesting or challenging for investors in 2026.

Paragraph 2 — Home Price & Rental Analysis: Median home price of {price} vs. national average of $355,000. Average rent of {rent}/mo. Best cities within the state for multifamily investment.

Paragraph 3 — ADJL Investment Outlook: Whether this state fits ADJL Capital's strategy (multifamily near colleges or defense/military workforce housing), what to target, and main risks.

Around 200 words. Plain text, no bullets, no markdown.
```

**Property analyzer prompt** (after running numbers):

```
You are a real estate investment analyst for ADJL Capital. Analyze this property:

Location: {city}
Price: {price}
Units: {units} units, {beds} beds each
Rent: {strategy === 'room' ? '$'+rent+'/bedroom (per-room)' : '$'+rent+'/unit'}
Year Built: {yearBuilt}
Mortgage Rate: {rate}%

Key metrics (ADJL-owned scenario):
- NOI: {noi}/yr
- DSCR: {dscr}x
- Cap Rate: {capRate}%
- 1% Rule: {onePct}%
- IRR: {irr}%

Write 2–3 sharp paragraphs: (1) whether this is a good investment and why, (2) the biggest risk, (3) one specific recommendation to improve the deal. Be direct — if it's a bad deal say so clearly. Plain text, no bullets. Max 180 words.
```

### `app/api/listings/route.ts`

```typescript
// GET /api/listings?city=College+Station+TX&maxPrice=500000
// Returns: { listings: Listing[] }
// - Requires auth session
// - Cache results in memory for 24 hours per city key
// - Calls Realty Mole API: GET https://realty-mole-property-api.p.rapidapi.com/properties
//   with params: city, state, propertyType=Multi Family, limit=3, maxPrice
// - If API fails or returns 0 results, return { listings: [], fallback: true }
//   (frontend will show Zillow/Redfin links instead)

interface Listing {
  id: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFootage: number
  yearBuilt: number
  daysOnMarket: number
  photos: string[]
  zillowUrl?: string
}
```

### `app/api/deals/route.ts`

```typescript
// GET /api/deals — returns all deals for authenticated user, sorted by savedAt desc
// POST /api/deals — creates new deal, returns created deal with id
// Body for POST: { address, sourceUrl?, city, price, units, bedsPerUnit, rentPerUnit,
//                  strategy, yearBuilt?, sqft?, mortgageRate, results, aiAnalysis?,
//                  verdict, irr, notes? }
```

### `app/api/deals/[id]/route.ts`

```typescript
// PATCH /api/deals/:id — update status or notes
// Body: { status?: string, notes?: string }
// DELETE /api/deals/:id — delete deal (must belong to auth user)
```

-----

## 9. Authentication

### `app/(auth)/login/page.tsx`

Design the login page to match the app’s design system:

- Full navy `#0F1A2E` background
- Centered card with `rgba(27,43,75,0.6)` background and gold border
- “ADJL” in white + “Capital” in gold `#C9A84C`, Cormorant Garamond, large
- “Market Intelligence Platform” subtitle in Barlow, muted
- Email + password fields with dark background, gold focus border
- “Sign In” button in solid gold `#C9A84C` with navy text
- Error state: red border on fields with message below

### `middleware.ts`

Protect all routes under `/(dashboard)/`. Redirect to `/login` if no session. Allow `/login` and `/api/auth/*` unauthenticated.

### Seed Users

Create `prisma/seed.ts` that creates the three partner accounts:

```typescript
const partners = [
  { email: 'daniel@adjlcapital.com', name: 'Daniel Laskowski', password: 'CHANGE_ME_1' },
  { email: 'andrew@adjlcapital.com', name: 'Andrew Jongeneel', password: 'CHANGE_ME_2' },
  { email: 'james@adjlcapital.com',  name: 'James Harvey',     password: 'CHANGE_ME_3' },
]
// Hash passwords with bcrypt rounds=12 before saving
```

Run with: `npx prisma db seed`

-----

## 10. Components

### `components/Navbar.tsx`

Top navigation bar. Matches the HTML exactly:

- Fixed position, full width, `rgba(9,16,28,0.95)` background, gold bottom border
- Left: “ADJL” (white) + “Capital” (gold) in Cormorant Garamond
- Center: navigation tab buttons — Top 20, All 50 States, College Towns, Defense & Tech, Compare All, ⚡ Analyze Property, My Pipeline
- Right: user initials avatar (circle) + logout button
- Active tab: gold border + gold text + subtle gold background
- Mobile: hamburger menu collapsing all tabs

### `components/MarketRow.tsx`

```typescript
interface MarketRowProps {
  market: Market
  selected: boolean
  onClick: () => void
}
```

Layout (left to right):

1. Rank number column (46px, navy bg, gold Cormorant Garamond number)
1. Main column: city name (Cormorant Garamond), driver text, metrics row (median · rent · growth badge)
1. Right column: score (Cormorant Garamond, gold), type tag pill

When `selected=true`: gold 3px left border, slightly darker background.
On hover: translate 2px right, gold border, box shadow.

Below the main content: three small buttons — “Search Zillow →”, “Search Redfin →”, “Analyze Property” — these open Zillow/Redfin in new tab or navigate to /analyze with city pre-filled.

Zillow search URL pattern: `https://www.zillow.com/homes/for_sale/{city}_rb/?price=0-500000&beds=2-&homeTypes=multi-family`
Redfin search URL pattern: `https://www.redfin.com/city/search/{city-slug}`

### `components/StateRow.tsx`

```typescript
interface StateRowProps {
  state: State
  selected: boolean
  onClick: () => void
}
```

Layout: state abbreviation (large Cormorant Garamond gold) · state name · median price · avg rent · investment rating badge · optional “ACTIVE DEAL” badge if `state.active === true`.

### `components/DetailPanel.tsx`

Right-side sticky panel. Shown when a market or state is selected.

For markets:

1. Active deal pill (if applicable): gold “★ ADJL ACTIVE DEAL — Atlanta”
1. Header: rank badge + type pill + city name (Cormorant Garamond 1.8rem) + driver text
1. Score row: large score number + animated fill bar (transitions width from 0 to score% on mount)
1. 4 metric boxes in 2×2 grid: Median Home Price, Avg Rent (with growth badge), Vacancy, Per-Room Rate
1. AI Synopsis section (see AISynopsis component)
1. Why This Market (body text)
1. ADJL Strategy (gold left-border box)
1. Key Risk (red left-border box)
1. Live Listings (see ListingCards component)

For states: same structure but only 2 metric boxes (median price, avg rent) and no per-room / vacancy.

Empty state: centered icon + “Select a Market” heading + “Click any row for AI growth synopsis, pricing, and strategy.”

### `components/AISynopsis.tsx`

```typescript
interface AISynopsisProps {
  cacheKey: string          // market id or state abbr — used for session cache
  promptData: object        // data to pass to /api/claude
  promptType: 'market' | 'state' | 'analyze'
}
```

- On mount (or when `cacheKey` changes): check session cache. If hit, render text immediately.
- If miss: show loading state (3 animated dots + “Analyzing market…” text), call `POST /api/claude`, render result, store in cache.
- The ai-dot indicator turns green when loaded.
- If API fails: show “AI analysis unavailable — API connection required.” in muted italic text.

### `components/ListingCards.tsx`

Shown inside DetailPanel below the AI synopsis when a market is selected.

- On mount: call `GET /api/listings?city={city}&maxPrice=500000`
- Loading state: 2-3 skeleton cards
- If listings returned: show cards with photo, address, price, beds/baths, days on market, “Analyze This Property” button
- If `fallback: true` returned: show Zillow + Redfin search link buttons instead

### `components/AnalyzerForm.tsx`

Two input modes on the Analyze Property page:

**Mode 1 — URL input:**
Text field + “Analyze URL” button. On submit: POST to `/api/claude` with the URL, asking Claude to extract property details as JSON. Populate form fields with extracted values. If extraction fails, show “Enter details manually” message.

**Mode 2 — Manual form:**
9 fields in 3-column grid:

- City / Market (text)
- Purchase Price ($) (number)
- Number of Units (number, 1-20)
- Beds per Unit (number, 1-8)
- Monthly Rent / Unit ($) (number)
- Strategy (select: “Per Unit” | “Per Room”)
- Year Built (number)
- Total Sq Ft (number)
- Mortgage Rate (%) (number, default 6.0)

“Run Analysis” button: calls `runAnalysis()` from `lib/calc/analyzer.ts` client-side (no API needed for math), then calls `/api/claude` for AI narrative.

### `components/AnalysisResults.tsx`

Shown below the form after running analysis.

1. Property summary bar (address/city, price, units, strategy description)
1. Verdict row — 3 columns: ADJL Owned · Investor Deal (5×$X) · Single Investor
   Each shows: large symbol (✓ / ~ / ✗), verdict label, IRR + DSCR summary
   Colors: green (#4CAF7D) for BUY, gold for CONDITIONAL, red (#FF8080) for PASS
1. Metrics comparison — 3 columns, each showing:
- Down Payment
- Mortgage / mo
- Gross Revenue / yr
- NOI / yr
- DSCR (green ≥1.25, gold ≥1.10, red below)
- Cap Rate (green ≥7%, gold ≥5%, red below)
- 1% Rule (green ≥1.0%, gold ≥0.8%, red below)
- Annual Net CF (green if positive, red if negative)
- Exit Profit Year 4
- True IRR (green ≥18%, gold ≥12%, red below)
- Money Multiple (green ≥1.8x, gold ≥1.4x, red below)
1. AI Investment Analysis box (AISynopsis with promptType=‘analyze’)
1. “Save to Pipeline” button → POST /api/deals → shows success toast
1. Disclaimer: “Conservative assumptions: 8% vacancy · 52% expense ratio · 20% down · 12% appreciation over 4 years”

### `components/VerdictBadge.tsx`

Small reusable badge. Props: `verdict: 'buy' | 'conditional' | 'pass'`

- buy: green background, “STRONG BUY” text
- conditional: gold background, “CONDITIONAL” text
- pass: red background, “PASS” text

### `components/PipelineTable.tsx`

Table of saved deals fetched from GET /api/deals.

Columns: Address · City · Price · Verdict · IRR · DSCR · Status · Saved By · Date · Actions

- Status column: dropdown (Researching / Under Review / Active / Passed) — onChange calls PATCH /api/deals/:id
- Actions: edit notes (opens inline textarea), delete (with confirmation)
- Click row to expand: shows full 3-column metric comparison + AI analysis text
- Empty state: “No deals saved yet. Analyze a property to get started.”
- Export button: GET /api/deals/export → download CSV

-----

## 11. Page Implementations

### `app/(dashboard)/page.tsx` — Top 20

```typescript
// Split layout: left list (scrollable) + right detail panel (sticky)
// Left: FilterBar + search input + section header "College Town Markets" + college rows
//       + section header "Defense & Tech Boom Markets" + defense rows
// Right: DetailPanel (empty state until row clicked)
// State: selectedMarketId (string | null), filterCat (string)
// Filter logic: show/hide rows based on filterCat matching market.cat
// Search: filter rows where city+drv+cat includes search string (case insensitive)
```

### `app/(dashboard)/states/page.tsx` — All 50 States

```typescript
// Same split layout
// Left: SortBar (A-Z | Price ↑ | Price ↓ | Hottest) + search + 50 StateRows
// Right: DetailPanel for states
// Default sort: alphabetical
// Georgia row shows ACTIVE DEAL badge
```

### `app/(dashboard)/college/page.tsx` — College Towns

Same as Top 20 page but pre-filtered to `cat.includes('college')` only. No filter bar needed.

### `app/(dashboard)/defense/page.tsx` — Defense & Tech

Same as Top 20 page but pre-filtered to defense/tech markets. No filter bar needed.

### `app/(dashboard)/compare/page.tsx` — Compare All

Full-width table (no detail panel). Shows all 70 rows — top 20 curated markets then all 50 states.

Columns: ID · Market · Type · Median Price · Avg Rent · Rent Growth · Score

Clicking any row: navigate to the appropriate tab (`/`, `/states`, `/college`, `/defense`) and select that row.

### `app/(dashboard)/analyze/page.tsx` — Property Analyzer

```typescript
// Full-width page (no split)
// Components: hero heading + AnalyzerForm + AnalysisResults (hidden until analysis run)
// URL prefill: if query params ?city=...&price=... are present, pre-fill form fields
// (MarketRow "Analyze Property" button links here with ?city=College+Station+TX&price=395000)
```

### `app/(dashboard)/pipeline/page.tsx` — My Pipeline

```typescript
// Full-width page
// PipelineTable component
// Summary stats at top: total deals, average IRR, deals by status
```

-----

## 12. Build Order

Build in exactly this order. Each step should be fully working before moving to the next.

### Step 1 — Scaffold

```bash
npx create-next-app@latest adjl-capital --typescript --tailwind --app --src-dir=false
cd adjl-capital
npm install @anthropic-ai/sdk next-auth@beta prisma @prisma/client bcryptjs @types/bcryptjs axios
npx shadcn@latest init
npx prisma init
```

### Step 2 — Data & Types

Create `lib/data/markets.ts` and `lib/data/states.ts` by extracting from the HTML file.
Create all TypeScript interfaces.
Create `lib/calc/analyzer.ts` with the exact calcScenario and verdict functions.

### Step 3 — Database

Set up `prisma/schema.prisma` with User and Deal models.
Create `lib/db/prisma.ts` singleton.
Run `npx prisma db push`.
Create and run `prisma/seed.ts`.

### Step 4 — Auth

Set up NextAuth.js with credentials provider.
Create login page matching design system.
Create `middleware.ts` protecting dashboard routes.
Test: all three partner logins work.

### Step 5 — Layout & Navigation

Create `app/(dashboard)/layout.tsx` with Navbar.
Create `components/Navbar.tsx`.
All 7 tabs visible and routing correctly.

### Step 6 — Market List + Detail Panel

Create `components/MarketRow.tsx`, `components/StateRow.tsx`, `components/DetailPanel.tsx`.
Create `app/(dashboard)/page.tsx` (Top 20).
Create `app/(dashboard)/states/page.tsx` (All 50).
No AI calls yet — just the layout and data display.

### Step 7 — AI Integration

Create `app/api/claude/route.ts`.
Create `components/AISynopsis.tsx`.
Wire AI synopsis into DetailPanel.
Test: clicking a market loads AI synopsis.

### Step 8 — Property Analyzer

Create `components/AnalyzerForm.tsx` and `components/AnalysisResults.tsx`.
Create `app/(dashboard)/analyze/page.tsx`.
Test: enter property details → 3-column analysis displays correctly.

### Step 9 — Deal Pipeline

Create `app/api/deals/route.ts` and `app/api/deals/[id]/route.ts`.
Create `components/PipelineTable.tsx`.
Create `app/(dashboard)/pipeline/page.tsx`.
Add “Save to Pipeline” button to AnalysisResults.
Test: save a deal → appears in pipeline → status update → delete.

### Step 10 — Live Listings

Create `lib/listings.ts` and `app/api/listings/route.ts`.
Create `components/ListingCards.tsx`.
Wire into DetailPanel.
Test: click College Station → listing cards appear.

### Step 11 — Remaining Pages

Create `app/(dashboard)/college/page.tsx`.
Create `app/(dashboard)/defense/page.tsx`.
Create `app/(dashboard)/compare/page.tsx`.

### Step 12 — Deploy

```bash
git init && git add . && git commit -m "initial"
# Push to GitHub, import to Vercel
# Add all env vars in Vercel dashboard
# Run: npx prisma db push (against production DB)
# Run: npx prisma db seed (against production DB)
```

-----

## 13. Key Behaviors to Preserve from the HTML

These behaviors must work identically in the app:

1. **AI Synopsis caching** — once a market’s synopsis is loaded, clicking it again is instant (use React state / session storage, not DB)
1. **Score bar animation** — the gold fill bar animates from 0% to the score width on mount (CSS transition 0.55s ease)
1. **Row selection state** — gold 3px left border + slightly darker background on selected row
1. **Active deal badge** — Georgia (GA) shows green “ACTIVE DEAL” badge in the state list AND a gold “★ ADJL ACTIVE DEAL — Atlanta” pill in the detail panel header
1. **Growth badge colors** — `bc: 'bu'` = green, `bc: 'bw'` = gold, `bc: 'bd'` = red
1. **Investment rating colors** — `inv: 'hot'` = green, `'good'` = gold, `'mod'` = muted, `'cau'` = red
1. **Verdict colors** — STRONG BUY = #4CAF7D green, CONDITIONAL = gold, PASS = #FF8080 red
1. **Metric color coding** — DSCR ≥1.25 green / ≥1.10 gold / below red; Cap Rate ≥7% green / ≥5% gold; 1% Rule ≥1.0% green; IRR ≥18% green / ≥12% gold; Moic ≥1.8x green / ≥1.4x gold
1. **Zillow URLs** — format: `https://www.zillow.com/homes/for_sale/{CITY}_rb/?price=0-500000&beds=2-&homeTypes=multi-family`
1. **Empty detail panel** — shows a centered icon + “Select a Market” when nothing is selected

-----

## 14. What NOT to Change

- Do not change any colors from the design system
- Do not change any fonts
- Do not change the calculation logic in `calcScenario` or `verdict`
- Do not change the market data or state data
- Do not change the AI prompt wording
- Do not add features not listed in this document
- Do not use any UI library other than shadcn/ui for components

-----

## 15. Definition of Done

The app is complete when:

- [ ] All three partners can log in with their email/password
- [ ] All 6 tabs are accessible and display correct data
- [ ] Clicking any of the 20 markets loads AI synopsis (requires ANTHROPIC_API_KEY)
- [ ] Clicking any of the 50 states loads AI analysis (requires ANTHROPIC_API_KEY)
- [ ] Georgia shows ACTIVE DEAL badge everywhere
- [ ] Property Analyzer runs full 3-column analysis for any manual input
- [ ] URL paste attempts Claude extraction and falls back gracefully
- [ ] Analysis results show correct BUY/CONDITIONAL/PASS verdict with correct colors
- [ ] “Save to Pipeline” saves deal to database
- [ ] Pipeline table shows all saved deals with status dropdown and delete
- [ ] Live listings appear in detail panel (requires REALTY_MOLE_API_KEY)
- [ ] App is deployed to Vercel with custom domain
- [ ] All three partner accounts work on production

-----

*ADJL Capital, LLC — Private & Confidential — June 2026*
*Daniel Laskowski · Andrew Jongeneel · James Harvey*