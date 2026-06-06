// ADJL Capital — design system (ported from the HTML MVP).
// DO NOT change colors or fonts.

export const Colors = {
  navy: "#0F1A2E", // primary background
  navyMid: "#1B2B4B", // card backgrounds
  navyDeep: "#060D1A",
  navBar: "#091018", // rgba(9,16,28,.95)
  gold: "#C9A84C", // primary accent
  goldL: "#E2C87A", // secondary accent
  cream: "#F8F5EF", // body text
  white: "#FFFFFF",
  muted: "rgba(248,245,239,0.5)", // secondary text
  faint: "rgba(248,245,239,0.3)",
  green: "#1A6B3C",
  greenBright: "#4CAF7D", // positive / hot
  red: "#8B1A1A",
  redBright: "#FF8080", // negative / caution
  blue: "#6B9FFF",
  purple: "#B97FFF",
  border: "rgba(201,168,76,0.15)",
  borderStrong: "rgba(201,168,76,0.30)",
  card: "rgba(27,43,75,0.6)",
  goldTint: "rgba(201,168,76,0.08)",
  goldDim: "rgba(201,168,76,0.4)",
} as const;

// Font family keys — must match the names loaded via useFonts() in _layout.tsx.
export const Fonts = {
  display: "CormorantGaramond_600SemiBold", // headlines, city names, scores
  displayBold: "CormorantGaramond_700Bold",
  displayLight: "CormorantGaramond_400Regular",
  displayItalic: "CormorantGaramond_400Regular_Italic",
  body: "Barlow_400Regular", // all UI text
  bodyMedium: "Barlow_500Medium",
  bodySemibold: "Barlow_600SemiBold",
  bodyBold: "Barlow_700Bold",
  bodyLight: "Barlow_300Light",
  condensed: "BarlowCondensed_600SemiBold", // prices, metrics, data values
  condensedMedium: "BarlowCondensed_500Medium",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;
