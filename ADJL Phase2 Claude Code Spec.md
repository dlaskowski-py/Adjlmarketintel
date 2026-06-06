# ADJL Capital — Phase 2 Build Instructions

## Claude Code Spec: AI Integration + Property Analyzer + Live Listings + Deal Pipeline

> **Read this entire document before writing any code.**
> Phase 1 built the scaffold, auth, navigation, and data display. Phase 2 adds everything that makes the app intelligent: AI market analysis, the property investment analyzer, live property listings via RentCast, and the saved deal pipeline.
> 
> **Assume Phase 1 is complete.** All routes exist, all components are scaffolded, auth works, all three partners can log in. You are now implementing the logic and data inside those shells.
> 
> Reference file: `ADJL_Market_Intelligence_v3.html` — this is the working HTML prototype. All behavior in this spec comes directly from that file.

-----

## New Environment Variable

Add this to `.env.local` — it did not exist in Phase 1:

```bash
RENTCAST_API_KEY=        # Sign up free at rentcast.io — 50 calls/month on Developer plan
```

-----

## Step 1 — Claude API Proxy

Create `app/api/claude/route.ts`.

This is the single backend endpoint that handles ALL Claude API calls. The frontend never calls Anthropic directly. The API key never touches the browser.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Simple in-memory rate limiter: 20 requests per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  // Require auth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Wait 1 minute.' }, { status: 429 })
  }

  const { prompt } = await req.json()
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
```

-----

## Step 2 — AI Synopsis Component

Create `components/AISynopsis.tsx`.

This component handles all AI text loading across the app — market detail panel, state detail panel, and property analyzer. It uses a session-level cache so re-clicking the same market never re-fetches.

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'

// Session-level cache — persists for the browser session, not beyond
const synopsisCache = new Map<string, string>()

interface AISynopsisProps {
  cacheKey: string       // Unique key: market id, state abbr, or deal id
  prompt: string         // The full prompt to send to Claude
  label?: string         // Label above box, defaults to "AI Growth Synopsis"
}

export function AISynopsis({ cacheKey, prompt, label = 'AI Growth Synopsis' }: AISynopsisProps) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const dotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Check cache first
    if (synopsisCache.has(cacheKey)) {
      setText(synopsisCache.get(cacheKey)!)
      return
    }

    // Fetch from API
    setLoading(true)
    setError(false)
    setText(null)

    fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.text) {
          synopsisCache.set(cacheKey, data.text)
          setText(data.text)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [cacheKey, prompt])

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#C9A84C' }}>
          {label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.18rem 0.45rem', background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.18)', fontSize: '0.55rem',
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: loading ? 'rgba(201,168,76,0.55)' : '#4CAF7D' }}>
          <span ref={dotRef} style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: loading ? '#C9A84C' : '#4CAF7D',
            animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none',
            display: 'inline-block'
          }} />
          Claude AI
        </span>
      </div>

      {/* Content box */}
      <div style={{
        background: 'rgba(27,43,75,0.4)', border: '1px solid rgba(201,168,76,0.15)',
        borderLeft: '3px solid #C9A84C', padding: '0.9rem 1rem', minHeight: '60px'
      }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LoadingDots />
            <span style={{ fontSize: '0.72rem', color: 'rgba(248,245,239,0.5)' }}>
              Analyzing market…
            </span>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '0.82rem', color: 'rgba(248,245,239,0.35)', fontStyle: 'italic' }}>
            AI analysis loads when API key is configured.
          </p>
        )}

        {text && text.split('\n\n').filter(Boolean).map((para, i) => (
          <p key={i} style={{
            fontSize: '0.82rem', lineHeight: '1.75',
            color: 'rgba(248,245,239,0.8)',
            marginBottom: i < text.split('\n\n').length - 1 ? '0.55rem' : 0
          }}>
            {para}
          </p>
        ))}
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#C9A84C', display: 'inline-block',
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
    </div>
  )
}
```

Add these keyframes to your global CSS (`app/globals.css`):

```css
@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
```

-----

## Step 3 — Wire AI Into Detail Panel

Update `components/DetailPanel.tsx` to use `AISynopsis`.

The prompt templates are extracted exactly from the HTML prototype. Use them verbatim.

### For curated markets (Top 20 tab):

```typescript
const marketPrompt = `You are a real estate investment analyst for ADJL Capital, a private equity firm. Write a sharp 3-paragraph growth synopsis for ${market.city} (${market.drv}).

Paragraph 1 — Why It's Booming: The specific economic catalysts, job growth, population trends making this market boom in 2026. Specific companies, numbers, and recent developments.

Paragraph 2 — Home Price Analysis: Current median price of ${market.median}. How it compares to national average ($355,000). Recent price trend (${market.growth}). Average rent of ${market.rent}. What ADJL Capital can realistically acquire at this price point for a multifamily investment.

Paragraph 3 — 3–5 Year Outlook: Forward-looking assessment of rent growth, appreciation potential, and why this market fits ADJL Capital's investment strategy of multifamily acquisition with per-room student leasing or military/defense workforce housing.

Keep it sharp, data-informed, written for sophisticated investors. Around 200 words. Plain text only, no bullets.`
```

Render it with:

```tsx
<AISynopsis
  cacheKey={`market-${market.id}`}
  prompt={marketPrompt}
  label="AI Growth Synopsis"
/>
```

### For states (All 50 States tab):

```typescript
const statePrompt = `You are a real estate investment analyst for ADJL Capital, a private equity firm. Write a sharp 3-paragraph investment analysis for ${state.name} as a state-level real estate market.

Paragraph 1 — Why It's Worth Watching: Key economic drivers, job growth, population trends, and what's making this state interesting or challenging for investors in 2026. Specific data points.

Paragraph 2 — Home Price & Rental Analysis: Current median home price of ${state.price}, how it compares to the national average of $355,000, recent price trends, and average rent of ${state.rent}/mo. What cap rates look like. Which cities within the state offer the best opportunities.

Paragraph 3 — ADJL Investment Outlook: Whether this state fits ADJL Capital's strategy (multifamily, per-room student leasing near colleges, or defense/military workforce housing), what type of properties to target, and the main risks to watch.

Keep it sharp, specific, and data-informed. Around 200 words. Plain text, no bullets, no markdown.`
```

Render with:

```tsx
<AISynopsis
  cacheKey={`state-${state.abbr}`}
  prompt={statePrompt}
  label="AI Market Analysis"
/>
```

-----

## Step 4 — RentCast API Integration

### 4a. Create `lib/listings.ts`

```typescript
// RentCast API — formerly Realty Mole
// Docs: https://developers.rentcast.io/reference/sale-listings
// Auth header: X-Api-Key
// Base URL: https://api.rentcast.io/v1

export interface RentCastListing {
  id: string
  formattedAddress: string
  addressLine1: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFootage: number
  yearBuilt: number
  price: number
  status: string
  listedDate: string
  daysOnMarket: number
  mlsNumber?: string
  listingAgent?: {
    name: string
    phone: string
    email: string
  }
}

export interface RentEstimate {
  rent: number
  rentRangeLow: number
  rentRangeHigh: number
  comparables: Array<{
    formattedAddress: string
    rent: number
    bedrooms: number
    bathrooms: number
    squareFootage: number
  }>
}

const BASE = 'https://api.rentcast.io/v1'
const KEY = process.env.RENTCAST_API_KEY!
const headers = { 'X-Api-Key': KEY, 'Content-Type': 'application/json' }

// In-memory cache: city slug → { listings, fetchedAt }
const listingCache = new Map<string, { listings: RentCastListing[]; fetchedAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function getSaleListings(
  city: string,
  state: string,
  maxPrice = 500000,
  limit = 3
): Promise<RentCastListing[]> {
  const cacheKey = `${city}-${state}`.toLowerCase().replace(/\s+/g, '-')
  const cached = listingCache.get(cacheKey)

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.listings
  }

  try {
    const params = new URLSearchParams({
      city,
      state,
      propertyType: 'Multi-Family',
      status: 'Active',
      price: `0-${maxPrice}`,
      limit: String(limit),
    })

    const res = await fetch(`${BASE}/listings/sale?${params}`, { headers })

    if (!res.ok) {
      console.error(`RentCast error: ${res.status}`)
      return []
    }

    const data: RentCastListing[] = await res.json()
    listingCache.set(cacheKey, { listings: data, fetchedAt: Date.now() })
    return data
  } catch (err) {
    console.error('RentCast fetch error:', err)
    return []
  }
}

export async function getRentEstimate(
  address: string,
  propertyType = 'Multi-Family',
  bedrooms?: number,
  bathrooms?: number,
  squareFootage?: number
): Promise<RentEstimate | null> {
  try {
    const params = new URLSearchParams({ address, propertyType })
    if (bedrooms) params.set('bedrooms', String(bedrooms))
    if (bathrooms) params.set('bathrooms', String(bathrooms))
    if (squareFootage) params.set('squareFootage', String(squareFootage))

    const res = await fetch(`${BASE}/avm/rent/long-term?${params}`, { headers })

    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
```

### 4b. Create `app/api/listings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getSaleListings } from '@/lib/listings'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const state = searchParams.get('state')
  const maxPrice = Number(searchParams.get('maxPrice') || 500000)

  if (!city || !state) {
    return NextResponse.json({ error: 'city and state required' }, { status: 400 })
  }

  const listings = await getSaleListings(city, state, maxPrice)

  return NextResponse.json({
    listings,
    fallback: listings.length === 0,
  })
}
```

### 4c. Create `components/ListingCards.tsx`

Shown inside the DetailPanel below the AI synopsis when a market is selected. Lazy-loads only when panel opens — never on page load.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Listing {
  id: string
  formattedAddress: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFootage: number
  yearBuilt: number
  daysOnMarket: number
  listingAgent?: { name: string; phone: string }
}

interface ListingCardsProps {
  city: string       // e.g. "College Station"
  state: string      // e.g. "TX"
  maxPrice?: number  // defaults to 500000
}

export function ListingCards({ city, state, maxPrice = 500000 }: ListingCardsProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/listings?city=${encodeURIComponent(city)}&state=${state}&maxPrice=${maxPrice}`)
      .then(r => r.json())
      .then(data => {
        setListings(data.listings || [])
        setFallback(data.fallback || false)
      })
      .catch(() => setFallback(true))
      .finally(() => setLoading(false))
  }, [city, state, maxPrice])

  // Parse city abbreviation for state from city name (e.g. "College Station, TX")
  const [parsedCity, parsedState] = city.includes(',')
    ? city.split(',').map(s => s.trim())
    : [city, state]

  const zillowUrl = `https://www.zillow.com/homes/for_sale/${encodeURIComponent(parsedCity)}_rb/?price=0-${maxPrice}&beds=2-&homeTypes=multi-family`
  const redfinUrl = `https://www.redfin.com/city/search/${parsedCity.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div>
      {/* Section header */}
      <div style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: '#C9A84C',
        display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem'
      }}>
        Live Listings
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.12)' }} />
        <span style={{ color: 'rgba(201,168,76,0.4)', fontWeight: 400 }}>
          via RentCast · under ${(maxPrice / 1000).toFixed(0)}K
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              height: '80px', background: 'rgba(27,43,75,0.3)',
              border: '1px solid rgba(201,168,76,0.08)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      )}

      {/* Fallback: show search links */}
      {!loading && fallback && (
        <div style={{
          padding: '0.8rem', background: 'rgba(27,43,75,0.3)',
          border: '1px solid rgba(201,168,76,0.1)'
        }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(248,245,239,0.45)', marginBottom: '0.6rem' }}>
            No active multi-family listings found via API. Search directly:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a href={zillowUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: '0.62rem', fontWeight: 600, padding: '0.25rem 0.65rem',
                border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.65)',
                textDecoration: 'none' }}>
              Search Zillow →
            </a>
            <a href={redfinUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: '0.62rem', fontWeight: 600, padding: '0.25rem 0.65rem',
                border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.65)',
                textDecoration: 'none' }}>
              Search Redfin →
            </a>
          </div>
        </div>
      )}

      {/* Listing cards */}
      {!loading && !fallback && listings.map(listing => (
        <div key={listing.id} style={{
          background: 'rgba(27,43,75,0.4)', border: '1px solid rgba(201,168,76,0.1)',
          padding: '0.75rem', marginBottom: '0.5rem'
        }}>
          <div style={{
            fontSize: '0.82rem', fontWeight: 600, color: 'var(--cream)',
            marginBottom: '0.25rem', lineHeight: 1.3
          }}>
            {listing.formattedAddress}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#C9A84C',
              fontFamily: 'Barlow Condensed, sans-serif' }}>
              ${listing.price.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(248,245,239,0.55)' }}>
              {listing.bedrooms}bd / {listing.bathrooms}ba
              {listing.squareFootage ? ` · ${listing.squareFootage.toLocaleString()} sqft` : ''}
              {listing.yearBuilt ? ` · Built ${listing.yearBuilt}` : ''}
            </span>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem'
          }}>
            <span style={{
              fontSize: '0.65rem', color: listing.daysOnMarket > 60
                ? '#FF8080' : listing.daysOnMarket > 30 ? '#C9A84C' : '#4CAF7D'
            }}>
              {listing.daysOnMarket} days on market
            </span>
            {listing.listingAgent && (
              <span style={{ fontSize: '0.62rem', color: 'rgba(248,245,239,0.35)' }}>
                {listing.listingAgent.name}
              </span>
            )}
            <button
              onClick={() => {
                // Navigate to analyzer with pre-filled city and price
                const params = new URLSearchParams({
                  address: listing.formattedAddress,
                  city: `${listing.city}, ${listing.state}`,
                  price: String(listing.price),
                  units: '4',
                  beds: String(listing.bedrooms || 2),
                })
                router.push(`/analyze?${params}`)
              }}
              style={{
                fontSize: '0.6rem', fontWeight: 600, padding: '0.22rem 0.6rem',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                color: '#C9A84C', cursor: 'pointer', letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              Analyze →
            </button>
          </div>
        </div>
      ))}

      {/* Always show search links below cards */}
      {!loading && !fallback && listings.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
          <a href={zillowUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.22rem 0.6rem',
              border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.55)',
              textDecoration: 'none' }}>
            More on Zillow →
          </a>
          <a href={redfinUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.22rem 0.6rem',
              border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.55)',
              textDecoration: 'none' }}>
            More on Redfin →
          </a>
        </div>
      )}
    </div>
  )
}
```

-----

## Step 5 — Property Analyzer

### 5a. Calculation engine — `lib/calc/analyzer.ts`

Copy these functions exactly from the HTML prototype. Do not modify the math.

```typescript
export interface AnalyzerInputs {
  city: string
  price: number
  units: number
  bedsPerUnit: number
  rentPerUnit: number
  strategy: 'unit' | 'room'
  yearBuilt?: number
  sqft?: number
  mortgageRate: number
}

export interface ScenarioResult {
  label: string
  numInvestors: number
  down: number
  mortgage: number
  monthlyPmt: number
  annualDebt: number
  effectiveRent: number
  grossAnnual: number
  noi: number
  dscr: number
  capRate: number
  onePctRule: number
  mgmtFee: number
  netCF: number
  perInvCF: number
  exitPrice: number
  perInvExit: number
  totalBack: number
  invested: number
  irr: number
  moic: number
}

export interface AnalysisResult {
  adjl: ScenarioResult   // 3 partners, equal split
  deal5: ScenarioResult  // 5 investors × $20K, 16% carry
  solo: ScenarioResult   // 1 investor, 100% ownership
}

export type VerdictResult = {
  cls: 'verdict-buy' | 'verdict-maybe' | 'verdict-pass'
  label: 'STRONG BUY' | 'CONDITIONAL' | 'PASS'
  emoji: '✓' | '~' | '✗'
}

function calcScenario(
  price: number, units: number, bedsPerUnit: number, rentPerUnit: number,
  strategy: 'unit' | 'room', rate: number, label: string,
  downPct: number, numInvestors: number
): ScenarioResult {
  const down = price * downPct
  const mortgage = price - down
  const rm = (rate / 100) / 12
  const n = 25 * 12
  const monthlyPmt = mortgage * (rm * Math.pow(1 + rm, n)) / (Math.pow(1 + rm, n) - 1)
  const annualDebt = monthlyPmt * 12
  const effectiveRent = strategy === 'room'
    ? rentPerUnit * bedsPerUnit * units
    : rentPerUnit * units
  const grossAnnual = effectiveRent * 12
  const egi = grossAnnual * 0.92        // 8% vacancy
  const opex = egi * 0.52               // 52% expense ratio
  const noi = egi - opex
  const dscr = annualDebt > 0 ? noi / annualDebt : 999
  const capRate = (noi / price) * 100
  const onePctRule = (effectiveRent / price) * 100
  const mgmtFee = numInvestors > 1 ? down * 0.015 : 0
  const netCF = noi - annualDebt - mgmtFee
  const perInvCF = numInvestors > 0 ? netCF / numInvestors : netCF

  // 4-year exit at 12% appreciation
  const exitPrice = price * 1.12
  let remBal = mortgage
  for (let i = 0; i < 48; i++) {
    const int = remBal * rm
    remBal -= (monthlyPmt - int)
  }
  const netExit = exitPrice - remBal
  const profitPool = netExit - down
  const carry = numInvestors > 1 ? profitPool * 0.16 : 0
  const invPool = profitPool - carry
  const perInvExit = numInvestors > 0 ? invPool / numInvestors : invPool
  const totalBack = (perInvCF * 4) + (down / numInvestors || down) + perInvExit
  const invested = numInvestors > 1 ? (down / numInvestors) * 1.03 : down

  // Newton's method IRR
  const cfs = [
    -invested,
    perInvCF, perInvCF, perInvCF,
    perInvCF + (down / numInvestors || down) + perInvExit
  ]
  let irr = 0.15
  for (let i = 0; i < 2000; i++) {
    const f = cfs.reduce((s, c, j) => s + c / Math.pow(1 + irr, j), 0)
    const df = cfs.reduce((s, c, j) => s - j * c / Math.pow(1 + irr, j + 1), 0)
    if (Math.abs(df) < 1e-10) break
    irr = Math.max(irr - f / df, -0.99)
  }
  const moic = totalBack / invested

  return {
    label, numInvestors, down, mortgage, monthlyPmt, annualDebt,
    effectiveRent, grossAnnual, noi, dscr, capRate, onePctRule,
    mgmtFee, netCF, perInvCF, exitPrice, perInvExit,
    totalBack, invested, irr: irr * 100, moic
  }
}

export function verdict(irr: number, dscr: number, onePct: number): VerdictResult {
  if (irr >= 18 && dscr >= 1.25 && onePct >= 1.0) {
    return { cls: 'verdict-buy', label: 'STRONG BUY', emoji: '✓' }
  }
  if (irr >= 12 && dscr >= 1.10) {
    return { cls: 'verdict-maybe', label: 'CONDITIONAL', emoji: '~' }
  }
  return { cls: 'verdict-pass', label: 'PASS', emoji: '✗' }
}

export function runAnalysis(inputs: AnalyzerInputs): AnalysisResult {
  const { price, units, bedsPerUnit, rentPerUnit, strategy, mortgageRate } = inputs
  return {
    adjl:  calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, mortgageRate, 'ADJL Owned', 0.20, 3),
    deal5: calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, mortgageRate, 'Investor Deal', 0.20, 5),
    solo:  calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, mortgageRate, 'Single Investor', 0.20, 1),
  }
}
```

### 5b. Rent estimate hook — `app/api/rent-estimate/route.ts`

Used by the analyzer to auto-fill rent estimate when user pastes an address.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRentEstimate } from '@/lib/listings'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const bedrooms = searchParams.get('bedrooms')
  const bathrooms = searchParams.get('bathrooms')
  const sqft = searchParams.get('sqft')

  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

  const estimate = await getRentEstimate(
    address,
    'Multi-Family',
    bedrooms ? Number(bedrooms) : undefined,
    bathrooms ? Number(bathrooms) : undefined,
    sqft ? Number(sqft) : undefined
  )

  return NextResponse.json({ estimate })
}
```

### 5c. Create `app/(dashboard)/analyze/page.tsx`

The page accepts optional query params for pre-filling from listing cards:
`?address=...&city=...&price=...&units=...&beds=...`

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { runAnalysis, verdict } from '@/lib/calc/analyzer'
import type { AnalyzerInputs, AnalysisResult } from '@/lib/calc/analyzer'
import { AISynopsis } from '@/components/AISynopsis'

export default function AnalyzePage() {
  const params = useSearchParams()

  // Form state — pre-fill from query params if present
  const [form, setForm] = useState<AnalyzerInputs>({
    city: params.get('city') || '',
    price: Number(params.get('price')) || 0,
    units: Number(params.get('units')) || 4,
    bedsPerUnit: Number(params.get('beds')) || 2,
    rentPerUnit: 0,
    strategy: 'unit',
    yearBuilt: undefined,
    sqft: undefined,
    mortgageRate: 6.0,
  })

  const [urlInput, setUrlInput] = useState('')
  const [address, setAddress] = useState(params.get('address') || '')
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [analysisKey, setAnalysisKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)

  // Auto-fetch rent estimate when address + beds are available
  useEffect(() => {
    if (!address || !form.bedsPerUnit) return
    fetch(`/api/rent-estimate?address=${encodeURIComponent(address)}&bedrooms=${form.bedsPerUnit}`)
      .then(r => r.json())
      .then(data => {
        if (data.estimate?.rent && !form.rentPerUnit) {
          setForm(f => ({ ...f, rentPerUnit: data.estimate.rent }))
        }
      })
      .catch(() => {})
  }, [address])

  async function handleUrlAnalyze() {
    if (!urlInput.trim()) return
    setUrlLoading(true)

    // Ask Claude to extract property details from the URL
    const extractPrompt = `A user has provided this property listing URL: ${urlInput}

Based on the URL and address you can infer from it, return ONLY a valid JSON object with no other text:
{
  "address": "full street address",
  "city": "City, ST",
  "price": 445000,
  "units": 4,
  "bedsPerUnit": 2,
  "bathsPerUnit": 2,
  "sqft": 3600,
  "yearBuilt": 1980,
  "estRentPerUnit": 1300,
  "propertyType": "fourplex"
}
If you cannot determine a value, use null.`

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: extractPrompt }),
      })
      const data = await res.json()
      const raw = data.text?.replace(/```json|```/g, '').trim()
      const prop = JSON.parse(raw)

      setAddress(prop.address || '')
      setForm(f => ({
        ...f,
        city: prop.city || f.city,
        price: prop.price || f.price,
        units: prop.units || f.units,
        bedsPerUnit: prop.bedsPerUnit || f.bedsPerUnit,
        rentPerUnit: prop.estRentPerUnit || f.rentPerUnit,
        yearBuilt: prop.yearBuilt || f.yearBuilt,
        sqft: prop.sqft || f.sqft,
      }))
    } catch {
      // Extraction failed — form is still usable manually
    } finally {
      setUrlLoading(false)
    }
  }

  function handleRunAnalysis() {
    if (!form.price || !form.rentPerUnit) return
    setLoading(true)
    // runAnalysis is synchronous — no async needed
    const result = runAnalysis(form)
    setResults(result)
    // Create unique key for AI synopsis caching
    setAnalysisKey(`analyze-${form.price}-${form.units}-${form.rentPerUnit}-${form.strategy}`)
    setLoading(false)
  }

  // Build analyzer AI prompt from current results
  const analyzerPrompt = results ? `You are a real estate investment analyst for ADJL Capital. Analyze this property:

Location: ${form.city}
Price: $${form.price.toLocaleString()}
Units: ${form.units} units, ${form.bedsPerUnit} beds each
Rent: ${form.strategy === 'room' ? `$${form.rentPerUnit}/bedroom (per-room strategy)` : `$${form.rentPerUnit}/unit (whole unit)`}
Year Built: ${form.yearBuilt || 'Unknown'}
Mortgage Rate: ${form.mortgageRate}%

Key metrics:
- NOI: $${Math.round(results.adjl.noi).toLocaleString()}/yr
- DSCR: ${results.adjl.dscr.toFixed(2)}x
- Cap Rate: ${results.adjl.capRate.toFixed(1)}%
- 1% Rule: ${results.adjl.onePctRule.toFixed(2)}%
- IRR (ADJL owned): ${results.adjl.irr.toFixed(1)}%
- IRR (single investor): ${results.solo.irr.toFixed(1)}%

Write 2–3 sharp paragraphs: (1) whether this is a good investment and why, (2) the biggest risk, (3) one specific recommendation to improve the deal. Be direct and honest — if it's a bad deal, say so clearly. Plain text, no bullets. Max 180 words.` : ''

  // ... render the full page layout
  // See component structure below
}
```

**Page layout** (render inside the return):

```
Full-width page, max-width 960px, centered.

1. Hero heading:
   - "Property Investment Analyzer" in Cormorant Garamond
   - Subtitle: "Paste a Zillow or Redfin URL, or enter details manually."

2. URL input row:
   - Text input: "Paste Zillow or Redfin URL..."
   - "Extract Details" button → calls handleUrlAnalyze()
   - While loading: button shows spinner

3. Divider: "— or enter details manually —"

4. Manual form (3-column grid, navy card background):
   - Row 1: City/Market | Purchase Price ($) | Number of Units
   - Row 2: Beds per Unit | Monthly Rent/Unit ($) | Strategy dropdown (Per Unit / Per Room)
   - Row 3: Year Built | Total Sq Ft | Mortgage Rate (%)
   - "Run Analysis" button (full width, gold background)

5. Results section (shown after running):

   a. Property summary bar:
      - Address/city · price · units · strategy description

   b. Verdict row (3 columns):
      Each column:
        - Title: "ADJL Owned" | "Investor Deal (5×$20K)" | "Single Investor"
        - Large symbol: ✓ / ~ / ✗
        - Verdict label in matching color
        - IRR and DSCR summary line

   c. Metrics comparison (3 columns, same structure as HTML):
      Each column shows 11 metrics with color coding:
        - Down Payment (no color)
        - Mortgage / mo (no color)
        - Gross Revenue / yr (no color)
        - NOI / yr (no color)
        - DSCR → green ≥1.25, gold ≥1.10, red below
        - Cap Rate → green ≥7%, gold ≥5%, red below
        - 1% Rule → green ≥1.0%, gold ≥0.8%, red below
        - Annual Net CF → green if positive, red if negative
        - Exit Profit Yr 4 → always green
        - True IRR → green ≥18%, gold ≥12%, red below
        - Money Multiple → green ≥1.8x, gold ≥1.4x, red below

   d. AI Analysis box:
      <AISynopsis cacheKey={analysisKey} prompt={analyzerPrompt} label="Claude AI Investment Analysis" />

   e. "Save to Pipeline" button (calls POST /api/deals)

   f. Disclaimer:
      "Conservative assumptions: 8% vacancy · 52% expense ratio · 20% down
       · 12% appreciation over 4 years · 6% mortgage. Not financial advice."
```

-----

## Step 6 — Deal Pipeline

### 6a. `app/api/deals/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deals = await prisma.deal.findMany({
    orderBy: { savedAt: 'desc' },
    // All partners share one pipeline — no userId filter
  })

  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const deal = await prisma.deal.create({
    data: {
      userId: session.user.id,
      savedBy: session.user.name || session.user.email || 'Partner',
      address: body.address || body.city,
      sourceUrl: body.sourceUrl || null,
      city: body.city,
      price: body.price,
      units: body.units,
      bedsPerUnit: body.bedsPerUnit,
      rentPerUnit: body.rentPerUnit,
      strategy: body.strategy,
      yearBuilt: body.yearBuilt || null,
      sqft: body.sqft || null,
      mortgageRate: body.mortgageRate,
      results: body.results,
      aiAnalysis: body.aiAnalysis || null,
      verdict: body.verdict,
      irr: body.irr,
      notes: body.notes || null,
    }
  })

  return NextResponse.json(deal, { status: 201 })
}
```

### 6b. `app/api/deals/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['status', 'notes']
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(deal)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.deal.delete({ where: { id: params.id } })
  return NextResponse.json({ deleted: true })
}
```

### 6c. `app/api/deals/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deals = await prisma.deal.findMany({ orderBy: { savedAt: 'desc' } })

  const headers_row = ['Address', 'City', 'Price', 'Units', 'Beds/Unit', 'Rent/Unit',
    'Strategy', 'Verdict', 'IRR (%)', 'DSCR', 'Status', 'Saved By', 'Date', 'Notes']

  const rows = deals.map(d => {
    const results = d.results as Record<string, Record<string, number>>
    return [
      d.address, d.city, d.price, d.units, d.bedsPerUnit, d.rentPerUnit,
      d.strategy, d.verdict,
      results?.adjl?.irr?.toFixed(1) || '',
      results?.adjl?.dscr?.toFixed(2) || '',
      d.status, d.savedBy,
      new Date(d.savedAt).toLocaleDateString(),
      d.notes || ''
    ]
  })

  const csv = [headers_row, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="adjl-pipeline-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  })
}
```

### 6d. `components/PipelineTable.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'

// Status options
const STATUS_OPTIONS = ['Researching', 'Under Review', 'Active', 'Passed']
const STATUS_COLORS: Record<string, string> = {
  Researching: '#C9A84C',
  'Under Review': '#6B9FFF',
  Active: '#4CAF7D',
  Passed: '#FF8080',
}

export function PipelineTable() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(setDeals)
      .finally(() => setLoading(false))
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }

  async function saveNotes(id: string) {
    const notes = editingNotes[id]
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setDeals(prev => prev.map(d => d.id === id ? { ...d, notes } : d))
    setEditingNotes(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function deleteDeal(id: string) {
    if (!confirm('Delete this deal from the pipeline?')) return
    await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return <div style={{ padding: '2rem', color: 'rgba(248,245,239,0.4)' }}>Loading pipeline…</div>

  if (deals.length === 0) return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem',
        fontWeight: 300, color: 'var(--cream)', marginBottom: '0.5rem' }}>
        No deals saved yet
      </p>
      <p style={{ fontSize: '0.82rem', color: 'rgba(248,245,239,0.4)' }}>
        Analyze a property to get started.{' '}
        <a href="/analyze" style={{ color: '#C9A84C', textDecoration: 'none' }}>
          Go to Analyzer →
        </a>
      </p>
    </div>
  )

  return (
    <div>
      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px', background: 'rgba(201,168,76,0.15)',
        border: '1px solid rgba(201,168,76,0.15)', marginBottom: '1.5rem' }}>
        {[
          ['Total Deals', deals.length],
          ['Avg IRR', `${(deals.reduce((s, d) => s + (d.irr || 0), 0) / deals.length).toFixed(1)}%`],
          ['Active', deals.filter(d => d.status === 'Active').length],
          ['Passed', deals.filter(d => d.status === 'Passed').length],
        ].map(([label, value]) => (
          <div key={label as string} style={{ background: 'rgba(27,43,75,0.5)',
            padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.5rem', fontWeight: 600, color: '#C9A84C' }}>
              {value}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600,
              letterSpacing: '0.13em', textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.4)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <a href="/api/deals/export"
          style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.4rem 1rem',
            border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.7)',
            textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Export CSV ↓
        </a>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid',
        gridTemplateColumns: '1fr 120px 80px 80px 130px 100px 60px',
        gap: '1px', background: 'rgba(201,168,76,0.15)',
        marginBottom: '1px' }}>
        {['Property', 'Price', 'IRR', 'DSCR', 'Status', 'Saved By', ''].map(h => (
          <div key={h} style={{ background: '#0F1A2E', padding: '0.6rem 0.8rem',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.13em',
            textTransform: 'uppercase', color: '#C9A84C' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Deal rows */}
      {deals.map(deal => {
        const res = deal.results as Record<string, Record<string, number>>
        const isExpanded = expandedId === deal.id
        const verdictColor = deal.verdict === 'buy' ? '#4CAF7D'
          : deal.verdict === 'conditional' ? '#C9A84C' : '#FF8080'

        return (
          <div key={deal.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : deal.id)}
              style={{ display: 'grid',
                gridTemplateColumns: '1fr 120px 80px 80px 130px 100px 60px',
                gap: '1px', background: 'rgba(201,168,76,0.08)', cursor: 'pointer',
                marginBottom: '1px', transition: 'background 0.15s' }}>

              {/* Property */}
              <div style={{ background: 'rgba(27,43,75,0.6)', padding: '0.7rem 0.85rem' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--cream)',
                  marginBottom: '0.15rem' }}>
                  {deal.address}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(248,245,239,0.45)' }}>
                  {deal.units} units · {deal.bedsPerUnit}bd · {deal.strategy === 'room' ? 'per room' : 'per unit'}
                </div>
              </div>

              {/* Price */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', color: 'var(--cream)',
                display: 'flex', alignItems: 'center' }}>
                ${(deal.price / 1000).toFixed(0)}K
              </div>

              {/* IRR */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                color: verdictColor, fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '0.9rem', fontWeight: 600,
                display: 'flex', alignItems: 'center' }}>
                {res?.adjl?.irr?.toFixed(1)}%
              </div>

              {/* DSCR */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                color: res?.adjl?.dscr >= 1.25 ? '#4CAF7D' : res?.adjl?.dscr >= 1.1 ? '#C9A84C' : '#FF8080',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', fontWeight: 600,
                display: 'flex', alignItems: 'center' }}>
                {res?.adjl?.dscr?.toFixed(2)}x
              </div>

              {/* Status dropdown */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                display: 'flex', alignItems: 'center' }}
                onClick={e => e.stopPropagation()}>
                <select
                  value={deal.status}
                  onChange={e => updateStatus(deal.id, e.target.value)}
                  style={{ background: 'rgba(27,43,75,0.8)', border: '1px solid rgba(201,168,76,0.2)',
                    color: STATUS_COLORS[deal.status] || 'var(--cream)',
                    fontSize: '0.72rem', padding: '0.2rem 0.4rem', outline: 'none',
                    fontFamily: 'Barlow, sans-serif', cursor: 'pointer' }}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Saved by */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                fontSize: '0.7rem', color: 'rgba(248,245,239,0.45)',
                display: 'flex', alignItems: 'center' }}>
                {deal.savedBy?.split(' ')[0]}
              </div>

              {/* Delete */}
              <div style={{ background: 'rgba(27,43,75,0.5)', padding: '0.7rem 0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={e => { e.stopPropagation(); deleteDeal(deal.id) }}>
                <span style={{ color: 'rgba(139,26,26,0.6)', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: 700 }}>×</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ background: 'rgba(15,26,46,0.8)',
                border: '1px solid rgba(201,168,76,0.1)',
                padding: '1rem', marginBottom: '0.5rem' }}>

                {/* 3 scenario metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem', marginBottom: '1rem' }}>
                  {(['adjl', 'deal5', 'solo'] as const).map(key => {
                    const s = res?.[key]
                    if (!s) return null
                    const lbl = key === 'adjl' ? 'ADJL Owned'
                      : key === 'deal5' ? 'Investor Deal' : 'Single Investor'
                    return (
                      <div key={key} style={{ background: 'rgba(27,43,75,0.4)',
                        border: '1px solid rgba(201,168,76,0.1)', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700,
                          color: '#C9A84C', marginBottom: '0.5rem',
                          letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {lbl}
                        </div>
                        {[
                          ['IRR', `${s.irr?.toFixed(1)}%`],
                          ['DSCR', `${s.dscr?.toFixed(2)}x`],
                          ['NOI/yr', `$${Math.round(s.noi)?.toLocaleString()}`],
                          ['Cash Flow', `$${Math.round(s.perInvCF)?.toLocaleString()}`],
                          ['Money Multiple', `${s.moic?.toFixed(2)}x`],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex',
                            justifyContent: 'space-between', padding: '0.3rem 0',
                            borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(248,245,239,0.45)' }}>
                              {label}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600,
                              color: 'var(--cream)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* AI analysis */}
                {deal.aiAnalysis && (
                  <div style={{ background: 'rgba(27,43,75,0.4)',
                    borderLeft: '3px solid #C9A84C', padding: '0.8rem 1rem',
                    marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700,
                      letterSpacing: '0.13em', textTransform: 'uppercase',
                      color: '#C9A84C', marginBottom: '0.5rem' }}>
                      Claude AI Analysis
                    </div>
                    <p style={{ fontSize: '0.8rem', lineHeight: '1.7',
                      color: 'rgba(248,245,239,0.72)' }}>
                      {deal.aiAnalysis}
                    </p>
                  </div>
                )}

                {/* Notes editor */}
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'rgba(201,168,76,0.45)', marginBottom: '0.4rem' }}>
                    Notes
                  </div>
                  <textarea
                    value={editingNotes[deal.id] ?? deal.notes ?? ''}
                    onChange={e => setEditingNotes(prev => ({ ...prev, [deal.id]: e.target.value }))}
                    placeholder="Add notes about this deal..."
                    rows={3}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.18)',
                      color: 'var(--cream)', fontFamily: 'Barlow, sans-serif',
                      fontSize: '0.82rem', padding: '0.6rem 0.8rem',
                      outline: 'none', resize: 'vertical' }}
                  />
                  {editingNotes[deal.id] !== undefined && (
                    <button
                      onClick={() => saveNotes(deal.id)}
                      style={{ marginTop: '0.4rem', padding: '0.4rem 1rem',
                        background: '#C9A84C', color: '#0F1A2E',
                        border: 'none', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Save Notes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

-----

## Step 7 — Wire ListingCards into DetailPanel

In `components/DetailPanel.tsx`, import and add `<ListingCards>` below the AI synopsis.

Parse city and state from the market data — the `city` field is formatted as “College Station, TX”:

```typescript
import { ListingCards } from './ListingCards'

// Inside detail panel, after AISynopsis:
const [cityName, stateAbbr] = market.city.split(',').map(s => s.trim())

// ...in render:
<ListingCards city={cityName} state={stateAbbr} />
```

For state detail panels, use the state abbreviation to infer a major city. You can add a `majorCity` field to the State interface, or simply use the state abbreviation and let RentCast return statewide results.

-----

## Step 8 — Pipeline Page

Create `app/(dashboard)/pipeline/page.tsx`:

```typescript
import { PipelineTable } from '@/components/PipelineTable'

export default function PipelinePage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 0 4rem' }}>
      <div style={{ marginBottom: '1.8rem' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2rem', fontWeight: 300, color: 'var(--cream)',
          marginBottom: '0.3rem' }}>
          Deal <em style={{ fontStyle: 'italic', color: '#E2C87A' }}>Pipeline</em>
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(248,245,239,0.5)' }}>
          All saved property analyses. Shared across all three partners.
        </p>
      </div>
      <PipelineTable />
    </div>
  )
}
```

-----

## Step 9 — RentCast Usage Notes

**Free tier is 50 calls/month.** To stay within limits:

1. Only fetch listings when a market detail panel actually opens — never on page load
1. Cache results for 24 hours (already in `lib/listings.ts`)
1. Don’t fetch listings for state detail panels — only for the 20 curated markets
1. The rent estimate endpoint is separate from the listings endpoint — each call counts

**When to upgrade to paid ($20/month):**
You’ll need to upgrade to the Starter plan (500 calls/month) once all three partners are actively clicking through markets. 20 markets × 3 partners × 3 days = 180 calls. Free tier runs out in about 8 days of normal usage.

**Error handling:**
If `RENTCAST_API_KEY` is missing or returns a non-200, `getSaleListings()` returns `[]` and `ListingCards` shows the Zillow/Redfin fallback links. The app never breaks — it degrades gracefully.

-----

## Phase 2 Definition of Done

- [ ] Clicking any curated market loads AI synopsis via `/api/claude`
- [ ] Clicking any state loads AI analysis via `/api/claude`
- [ ] Re-clicking the same market is instant (cached in session)
- [ ] RentCast listing cards appear in market detail panel (or Zillow/Redfin fallback if no results)
- [ ] “Analyze →” button on listing cards pre-fills the analyzer form
- [ ] Property analyzer form accepts manual input and URL paste
- [ ] URL paste attempts Claude extraction and falls back gracefully
- [ ] Running analysis shows 3-column verdict with correct colors and math
- [ ] AI investment analysis appears below the 3-column results
- [ ] “Save to Pipeline” saves the deal with all metrics to the database
- [ ] Pipeline page shows all deals with status dropdown, notes editor, and delete
- [ ] CSV export downloads correctly
- [ ] Expanding a pipeline row shows the 3-scenario metric breakdown and AI text
- [ ] Rate limit (20 req/user/min) prevents accidental API cost overruns
- [ ] App never crashes when RentCast or Claude API is unavailable — always degrades gracefully

-----

*ADJL Capital, LLC — Phase 2 Claude Code Spec — June 2026*