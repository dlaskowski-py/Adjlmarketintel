# ADJL Capital — Market Intelligence (iOS)

Native iOS app for ADJL Capital, built with **React Native + Expo + expo-router**.
Replicates the design system from the web MVP (navy `#0F1A2E`, gold `#C9A84C`,
Cormorant Garamond display / Barlow body / Barlow Condensed numerics).

## Status

Foundation is in place:

- **Auth gate** — login screen → tabs, with session persisted via
  `expo-secure-store`. Sign out by tapping the avatar in the header.
- **6-tab navigation** matching the HTML nav: Top 20 · States · College ·
  Defense · Compare · Analyze (custom navy/gold tab bar).
- **Design system** — fonts loaded via `@expo-google-fonts`, shared
  `AppText` / `Screen` / `ScreenHeader` components and ADJL color tokens
  in `src/constants/adjl.ts`.
- Top 20 shows the hero, stat bar, and sample market cards to demonstrate
  the card design; the other tabs are themed scaffolds ready for data.

Next: port the full TOP20 / STATES datasets, market & state detail panels,
the property analyzer (DSCR / cap-rate / IRR), and AI synopsis.

## Run it

```bash
cd adjl-mobile
npm install
npx expo start          # press i for the iOS simulator, or scan the QR with Expo Go
```

Demo login: any of the three partner emails
(`daniel@` / `andrew@` / `james@adjlcapital.com`) with any non-empty password.
On-device auth is a local demo; production auth lives server-side in the web app.

## Project layout

```
src/
  app/
    _layout.tsx          root: fonts + auth gate (Stack)
    (auth)/login.tsx     login screen
    (tabs)/
      _layout.tsx        6-tab navigator (navy/gold)
      index.tsx          Top 20
      states.tsx college.tsx defense.tsx compare.tsx analyze.tsx
  components/            AppText, Screen, ScreenHeader, TabScaffold, ui (cards/hero)
  constants/adjl.ts      colors, fonts, spacing
  context/auth.tsx       AuthProvider (SecureStore-persisted session)
```

Built for iOS — no Next.js or web-only libraries.
