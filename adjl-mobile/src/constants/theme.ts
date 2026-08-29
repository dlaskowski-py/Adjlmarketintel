/**
 * Design tokens — deliberately plain.
 *
 * Light, neutral, high-contrast. System fonts only (no font-loading gate, no
 * bundled font files, faster cold start). Replaces the old navy/gold serif
 * identity entirely.
 */

import { Platform, type TextStyle } from "react-native";

export const Colors = {
  // Surfaces
  bg: "#FFFFFF",
  bgSubtle: "#F6F6F7",
  surface: "#FFFFFF",
  surfaceSunken: "#FAFAFB",

  // Lines
  border: "#E6E6E9",
  borderStrong: "#D3D3D8",

  // Text
  text: "#111113",
  textSecondary: "#5F5F66",
  textMuted: "#93939B",
  textInverse: "#FFFFFF",

  // Primary action — near-black, no brand color to defend
  primary: "#111113",
  primaryPressed: "#2A2A2E",

  // Accent for links / selected state
  accent: "#2563EB",
  accentSubtle: "#EFF4FF",

  // Semantic — used for metric grading (good / caution / bad)
  positive: "#067647",
  positiveSubtle: "#ECFDF3",
  warning: "#B54708",
  warningSubtle: "#FFFAEB",
  negative: "#B42318",
  negativeSubtle: "#FEF3F2",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/** Tabular figures keep columns of numbers from jittering. */
const numeric: TextStyle = Platform.select({
  ios: { fontVariant: ["tabular-nums"] },
  default: {},
}) as TextStyle;

export const Type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "600", letterSpacing: 0.5 },
  numeric: { fontSize: 16, lineHeight: 21, fontWeight: "600", ...numeric },
  numericLarge: { fontSize: 26, lineHeight: 31, fontWeight: "700", letterSpacing: -0.4, ...numeric },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof Type;

/** Maps a metric grade to its display color. */
export const gradeColor = (grade: "good" | "warn" | "bad") =>
  grade === "good" ? Colors.positive : grade === "warn" ? Colors.warning : Colors.negative;
