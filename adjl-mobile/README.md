# Roofline (iOS)

Know what a house is really worth. Native iOS app built with **React Native + Expo (SDK 53) + expo-router**.

Independent consumer product — no firm branding anywhere in the UI. The curated
market research it ships with is proprietary, just unattributed.

## What it does

**Four tabs, deliberately plain.**

| Tab | Free | Paid |
|---|---|---|
| **Markets** | Full research on 19 curated markets + all 50 states | AI market/state outlook |
| **Nearby** | Your location, closest researched market, state context | Live listings within a radius |
| **Analyze** | — | Full underwrite + itemized expenses + AI review |
| **Saved** | View, annotate and delete your analyses (never gated) | — |

Account and settings live behind the header icon rather than eating a tab.

### The differentiated part

The analyzer itemizes operating expenses and **labels every line with how much
we actually know**:

- `Actual` — straight from the county tax record
- `Modeled` — derived from zip/state tables and property characteristics
- `Assumed` — a defensible rule of thumb

Tap any line to see its derivation (e.g. *"FL base rate $15/$1k, catastrophe-exposed
zip ×1.35, pre-1950 ×1.3"*). These are never collapsed into one number. No
competitor shows their work.

Pasting a Zillow/Redfin/Realtor.com link parses the address **deterministically
and offline** — it does not ask an LLM to guess a purchase price.

## Monetization

Monthly subscription through **RevenueCat** (`react-native-purchases`). Apple
requires in-app purchase for digital subscriptions — Stripe is not an option.

Gating is **feature-level, not route-level**: the paywall appears in place of the
locked feature so users can see what they'd be buying, and the back stack stays
coherent. A `<Paywalled>` wrapper handles this.

> The client-side gate is UX only. Once the backend proxy exists it must verify
> entitlement independently — a client-only gate is bypassed in minutes.

## Location

Foreground only (`when in use`). Never background, no tracking.

Permission is checked with `getForegroundPermissionsAsync()` on mount and only
**requested on an explicit tap** — iOS grants exactly one prompt, and spending it
on app open is unrecoverable. A manual ZIP-code path is always available for
users who decline, and is the only path testable without a device.

## Run it

```bash
cd adjl-mobile
npm install
npx expo start        # press i for the simulator, or scan with Expo Go
```

Location works in Expo Go. **Purchases do not** — RevenueCat is a native module
and needs a development build. Its Preview API Mode keeps the app loading in Expo
Go regardless, and Account has a `__DEV__`-only "simulate subscription" toggle so
the paid experience is demoable before billing is live.

Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to enable real purchases.

## Verify

```bash
npx tsc --noEmit      # types
npx jest              # 74 tests
npx expo export --platform ios --output-dir .export-check
```

## Layout

```
src/
  app/
    _layout.tsx           providers + storage migration
    (tabs)/               index (Markets) · nearby · analyze · saved
    market/[id].tsx  state/[abbr].tsx
    account.tsx  paywall.tsx        (modals)
  components/             AppText, Screen, ui (primitives), Paywalled,
                          AISynopsis, ExpenseBreakdown
  constants/              brand.ts (rename the app here) · theme.ts
  context/                subscription.tsx · settings.tsx
  data/                   markets.ts (19, with coordinates) · states.ts (50)
  lib/                    analyzer · expenseModel · expenseLines · addressFromUrl
                          geo · rentcast · claude · pipeline · storage
  services/propertyData.ts
```

The app name appears in exactly one place — `src/constants/brand.ts` — plus
`app.json`. Renaming is a two-file change.

## Not done yet

- **Backend proxy.** Subscribers should never see an API key. Until a server
  holds the Anthropic/RentCast credentials and verifies entitlement, AI and
  listings fall back to optional keys under Account → Data connections.
- App Store Connect setup: Paid Apps agreement (24–48h to process — start early),
  subscription product, RevenueCat wiring, sandbox testers.
- Icon and splash art are still Expo placeholders.
