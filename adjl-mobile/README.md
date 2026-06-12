# ADJL Capital — Market Intelligence (iOS)

Native iOS app for ADJL Capital, built with **React Native + Expo + expo-router**.
Fully self-contained — no backend required. Replicates the design system from the
web MVP (navy `#0F1A2E`, gold `#C9A84C`, Cormorant Garamond / Barlow / Barlow Condensed).

## Features

- **Bring-your-own API keys** — enter your Anthropic and (optional) RentCast keys
  in the in-app **Settings** screen (gear icon). Keys are stored in the iOS
  keychain via `expo-secure-store`, validated live, and never shipped in the
  binary. The app degrades gracefully when keys are absent.
- **Top 20 curated markets** — filter chips (College / Military / Tech / Defense),
  search, full dataset, tappable rows.
- **All 50 states** — sortable (A–Z, price, hottest) + search, ACTIVE DEAL badge
  on Georgia.
- **Market & state detail screens** — animated ADJL score bar, metric grid,
  **Claude AI growth synopsis** (session-cached), Why/Strategy/Risk sections,
  RentCast live listings with Zillow/Redfin fallback, one-tap "Analyze here".
- **Property Analyzer** — paste a Zillow/Redfin URL (Claude extracts details) or
  enter manually; runs the exact `calcScenario` engine across three ownership
  scenarios (ADJL · 5-investor · solo) with DSCR / cap rate / 1% rule / IRR /
  MOIC color coding and STRONG BUY / CONDITIONAL / PASS verdicts, plus an AI
  investment analysis. RentCast auto-fills a rent estimate when an address is known.
- **Deal Pipeline** (briefcase icon) — saved analyses persisted on-device
  (AsyncStorage): summary stats, status cycling, notes, delete, expandable metrics.
- **Login** — partners sign in with their @adjlcapital.com email; investors get
  guest access with any email. Session persists in the keychain. (On-device demo
  gate only — there is no backend or sensitive data behind it.)

## Run it

```bash
cd adjl-mobile
npm install
npx expo start        # press i for iOS simulator, or scan with Expo Go
```

Then open **Settings** (gear icon) and paste your Anthropic API key
(console.anthropic.com → API Keys) to enable AI features.

## Sending to investors (TestFlight)

```bash
npm install -g eas-cli
eas login                       # Expo account
eas build:configure
eas build --platform ios        # needs an Apple Developer account ($99/yr)
eas submit --platform ios       # uploads to App Store Connect → TestFlight
```

Invite investors by email in App Store Connect → TestFlight. Each tester adds
their own API key in Settings (or you provision one shared key and rotate it
after the demo).

## Project layout

```
src/
  app/
    _layout.tsx           fonts + auth gate + route registry
    (auth)/login.tsx      login (partners + investor guest access)
    (tabs)/               Top 20 · States · College · Defense · Compare · Analyze
    market/[id].tsx       market detail (AI synopsis, listings, actions)
    state/[abbr].tsx      state detail (AI analysis)
    settings.tsx          API key entry (modal, keychain-backed)
    pipeline.tsx          saved deals
  components/             AppText, Screen(+Header), AISynopsis, ListingCards, ui
  constants/adjl.ts       design tokens (do not change)
  context/                auth.tsx, settings.tsx
  data/                   markets.ts (TOP20), states.ts (STATES) — verbatim
  lib/                    analyzer.ts (exact math), prompts.ts (verbatim),
                          claude.ts, rentcast.ts, pipeline.ts
```

iOS-native — no Next.js or web-only libraries. © 2026 ADJL Capital, LLC.
