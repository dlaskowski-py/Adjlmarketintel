/**
 * Single source of truth for product identity.
 *
 * Every user-visible mention of the product name comes from here. Renaming the
 * app is a change to this file (plus app.json), not a sweep through the UI.
 */
export const Brand = {
  name: "Roofline",
  tagline: "Know what a house is really worth",
  /** Shown on the paywall and account screen. */
  subscriptionPitch: "Unlock the full underwriting toolkit",
  supportEmail: "support@roofline.app",
  termsUrl: "https://roofline.app/terms",
  privacyUrl: "https://roofline.app/privacy",
  /** Attribution for the curated research data set. */
  researchCredit: "Proprietary market research",
  legal: `© ${new Date().getFullYear()} Roofline`,
} as const;
