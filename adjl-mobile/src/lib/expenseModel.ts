/**
 * expenseModel — pure estimators for the operating costs public data can't
 * give us directly.
 *
 * Every estimate carries a confidence level so the UI can show the user which
 * numbers came from a real record versus a zip-code-level model versus a flat
 * assumption. These are deliberately NOT summed into a single number here —
 * the distinction has to survive all the way to the screen.
 *
 * All functions are pure and total: bad input (null, NaN, negative) degrades to
 * a zero-value estimate rather than throwing.
 */

export type Confidence =
  /** Straight from a public record or user-entered actual. */
  | "actual"
  /** Derived from a location/characteristic model — a defensible estimate. */
  | "modeled"
  /** A rule-of-thumb percentage. Directionally right, not property-specific. */
  | "assumed";

export interface ExpenseEstimate {
  /** Annual dollars. */
  annual: number;
  /** Convenience: annual / 12, rounded to the cent. */
  monthly: number;
  confidence: Confidence;
  /** Short human-readable explanation of where the number came from. */
  basis: string;
}

// ── numeric guards ──────────────────────────────────────────

type Maybe = number | null | undefined;

function safe(value: Maybe): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimate(annual: number, confidence: Confidence, basis: string): ExpenseEstimate {
  const safeAnnual = Number.isFinite(annual) && annual > 0 ? round2(annual) : 0;
  return { annual: safeAnnual, monthly: round2(safeAnnual / 12), confidence, basis };
}

// ── zip → state ─────────────────────────────────────────────

/** Numeric ZIP3 prefix ranges → state. Compact and sufficient for modeling. */
const ZIP3_RANGES: [number, number, string][] = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"],
  [150, 196, "PA"], [197, 199, "DE"], [200, 205, "DC"], [206, 219, "MD"],
  [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"],
  [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"],
  [550, 567, "MN"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"],
  [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"],
  [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"],
  [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
  [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"],
  [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"],
  [995, 999, "AK"],
];

/** Infers the state from a 5-digit zip. Returns null when out of range. */
export function stateFromZip(zip: string | null | undefined): string | null {
  if (!zip || !/^\d{5}/.test(zip)) return null;
  const prefix = Number(zip.slice(0, 3));
  for (const [lo, hi, state] of ZIP3_RANGES) {
    if (prefix >= lo && prefix <= hi) return state;
  }
  return null;
}

// ── insurance ───────────────────────────────────────────────

/** Annual premium per $1,000 of insured (replacement) value, by state. */
const INSURANCE_RATE_PER_1K: Record<string, number> = {
  FL: 15.0, LA: 14.0, OK: 13.0, TX: 11.0, KS: 10.0, CO: 10.0, NE: 10.0,
  MS: 9.5, AR: 9.0, AL: 9.0, MT: 8.5, MN: 8.0, MO: 8.0, SD: 8.0,
  ND: 7.5, IA: 7.5, KY: 7.5, SC: 7.5, WY: 7.0, TN: 7.0, GA: 7.0,
  NC: 6.5, NM: 6.5, RI: 6.0, CA: 6.0, AZ: 5.5, NY: 5.5, NJ: 5.5,
  IN: 5.5, IL: 5.5, MA: 5.5, CT: 5.5, WV: 5.5, OH: 5.0, MI: 5.0,
  VA: 5.0, MD: 5.0, DC: 5.0, AK: 5.0, HI: 4.5, PA: 4.5, DE: 4.5,
  ID: 4.5, ME: 4.5, NV: 4.5, WI: 4.0, UT: 4.0, OR: 4.0, WA: 4.0,
  NH: 4.0, VT: 4.0,
};

const NATIONAL_INSURANCE_RATE_PER_1K = 6.5;

/** ZIP3 prefixes with elevated wind / wildfire exposure → multiplier. */
const CATASTROPHE_ZIP3: [number, number, number][] = [
  [330, 334, 1.35], [339, 339, 1.35], [341, 342, 1.35], // South FL coast
  [770, 775, 1.30], [777, 779, 1.30], // TX Gulf coast
  [700, 701, 1.30], [703, 705, 1.30], // LA coast
  [365, 366, 1.25], [395, 395, 1.25], // AL / MS coast
  [284, 285, 1.20], [294, 294, 1.20], // NC / SC coast
  [313, 315, 1.15], // GA coast
  [82, 84, 1.15], // NJ shore
  [950, 961, 1.20], [933, 936, 1.15], // CA wildfire belts
];

function catastropheFactor(zip: string | null | undefined): number {
  if (!zip || !/^\d{5}/.test(zip)) return 1;
  const prefix = Number(zip.slice(0, 3));
  for (const [lo, hi, factor] of CATASTROPHE_ZIP3) {
    if (prefix >= lo && prefix <= hi) return factor;
  }
  return 1;
}

/** Older housing stock costs more to insure (wiring, plumbing, roof age). */
function ageFactor(yearBuilt: Maybe): { factor: number; label: string } {
  const year = safe(yearBuilt);
  if (year === 0) return { factor: 1.15, label: "year built unknown" };
  if (year < 1950) return { factor: 1.3, label: "pre-1950" };
  if (year < 1980) return { factor: 1.15, label: "1950–1979" };
  if (year < 2000) return { factor: 1.05, label: "1980–1999" };
  return { factor: 1.0, label: "2000+" };
}

const REPLACEMENT_COST_PER_SQFT = 200;
/** Land isn't insured — only the structure. */
const STRUCTURE_SHARE_OF_VALUE = 0.85;
const MINIMUM_ANNUAL_PREMIUM = 500;

export interface InsuranceInput {
  zip?: string | null;
  sqft?: Maybe;
  yearBuilt?: Maybe;
  valueEstimate?: Maybe;
}

/**
 * Zip-level base rate, adjusted for structure age and insured value.
 * Always 'modeled' — never a real quote.
 */
export function estimateInsurance({
  zip,
  sqft,
  yearBuilt,
  valueEstimate,
}: InsuranceInput): ExpenseEstimate {
  const state = stateFromZip(zip);
  const baseRate = (state && INSURANCE_RATE_PER_1K[state]) || NATIONAL_INSURANCE_RATE_PER_1K;
  const cat = catastropheFactor(zip);
  const age = ageFactor(yearBuilt);

  const value = safe(valueEstimate);
  const area = safe(sqft);
  const insuredValue =
    value > 0 ? value * STRUCTURE_SHARE_OF_VALUE : area * REPLACEMENT_COST_PER_SQFT;

  if (insuredValue <= 0) {
    return estimate(0, "modeled", "Insufficient data — needs value estimate or square footage");
  }

  const annual = (insuredValue / 1000) * baseRate * cat * age.factor;
  const region = state ?? "national average";
  const catNote = cat > 1 ? `, catastrophe-exposed zip ×${cat}` : "";

  return estimate(
    Math.max(annual, MINIMUM_ANNUAL_PREMIUM),
    "modeled",
    `${region} base rate $${baseRate}/$1k${catNote}, ${age.label} ×${age.factor}`
  );
}

// ── utilities ───────────────────────────────────────────────

/** Owner-paid electric + gas + water/sewer/trash, monthly, for ~1,800 sqft. */
const UTILITIES_MONTHLY_BY_STATE: Record<string, number> = {
  HI: 650, CT: 520, AK: 500, AL: 500, SC: 480, MA: 480, ME: 470, RI: 470,
  TX: 470, LA: 470, MS: 470, FL: 460, NH: 460, NY: 450, GA: 450, WV: 450,
  VT: 450, NJ: 440, AZ: 440, TN: 440, KY: 440, OK: 440, AR: 440, CA: 430,
  MO: 430, KS: 430, IN: 430, PA: 430, VA: 430, NC: 430, MD: 430, DE: 430,
  OH: 420, MI: 420, IL: 420, DC: 420, WI: 410, MN: 410, IA: 410, NE: 410,
  SD: 410, ND: 410, MT: 400, WY: 400, CO: 390, NV: 390, NM: 390, OR: 380,
  WA: 380, ID: 380, UT: 370,
};

const NATIONAL_UTILITIES_MONTHLY = 420;
const UTILITIES_BASELINE_SQFT = 1800;

export interface UtilitiesInput {
  zip?: string | null;
  sqft?: Maybe;
  /** Two-letter state. Takes precedence over the zip lookup when supplied. */
  state?: string | null;
}

/**
 * State averages scaled by square footage. Assumes the OWNER pays all
 * utilities — zero this out for triple-net or tenant-paid arrangements.
 */
export function estimateUtilities({ zip, sqft, state }: UtilitiesInput): ExpenseEstimate {
  const resolvedState = (state?.toUpperCase() || stateFromZip(zip)) ?? null;
  const monthlyBase =
    (resolvedState && UTILITIES_MONTHLY_BY_STATE[resolvedState]) || NATIONAL_UTILITIES_MONTHLY;

  const area = safe(sqft);
  const scale = area > 0 ? clamp(area / UTILITIES_BASELINE_SQFT, 0.6, 1.8) : 1;

  const region = resolvedState ?? "national average";
  const sizeNote =
    area > 0 ? `scaled ×${round2(scale)} for ${Math.round(area)} sqft` : "unscaled (sqft unknown)";

  return estimate(
    monthlyBase * 12 * scale,
    "modeled",
    `${region} average $${monthlyBase}/mo, ${sizeNote}, owner-paid`
  );
}

// ── reserves ────────────────────────────────────────────────

interface ReserveTier {
  maxYear: number;
  maintenance: number;
  capex: number;
  label: string;
}

/** Percent of value per year, by vintage. Older stock consumes more. */
const RESERVE_TIERS: ReserveTier[] = [
  { maxYear: 1950, maintenance: 1.5, capex: 1.2, label: "pre-1950" },
  { maxYear: 1980, maintenance: 1.25, capex: 1.0, label: "1950–1979" },
  { maxYear: 2000, maintenance: 1.0, capex: 0.8, label: "1980–1999" },
  { maxYear: 2015, maintenance: 0.85, capex: 0.6, label: "2000–2014" },
  { maxYear: Infinity, maintenance: 0.7, capex: 0.45, label: "2015+" },
];

/** Unknown vintage is treated as older stock — conservative for an investor. */
const UNKNOWN_YEAR_TIER = RESERVE_TIERS[1];

function reserveTier(yearBuilt: Maybe): ReserveTier {
  const year = safe(yearBuilt);
  if (year === 0) return UNKNOWN_YEAR_TIER;
  return RESERVE_TIERS.find((tier) => year < tier.maxYear) ?? RESERVE_TIERS[RESERVE_TIERS.length - 1];
}

export interface ReserveInput {
  valueEstimate?: Maybe;
  yearBuilt?: Maybe;
}

/** Ongoing repairs, as a percentage of value. Rule of thumb → 'assumed'. */
export function maintenanceReserve({ valueEstimate, yearBuilt }: ReserveInput): ExpenseEstimate {
  const value = safe(valueEstimate);
  const tier = reserveTier(yearBuilt);
  const label = safe(yearBuilt) === 0 ? `${tier.label} (year built unknown)` : tier.label;

  if (value === 0) {
    return estimate(0, "assumed", "Insufficient data — needs a value estimate");
  }
  return estimate(
    value * (tier.maintenance / 100),
    "assumed",
    `${tier.maintenance}% of value/yr, ${label}`
  );
}

/** Roof / HVAC / systems replacement sinking fund. Rule of thumb → 'assumed'. */
export function capexReserve({ valueEstimate, yearBuilt }: ReserveInput): ExpenseEstimate {
  const value = safe(valueEstimate);
  const tier = reserveTier(yearBuilt);
  const label = safe(yearBuilt) === 0 ? `${tier.label} (year built unknown)` : tier.label;

  if (value === 0) {
    return estimate(0, "assumed", "Insufficient data — needs a value estimate");
  }
  return estimate(value * (tier.capex / 100), "assumed", `${tier.capex}% of value/yr, ${label}`);
}

// ── income-based allowances ─────────────────────────────────

export const DEFAULT_VACANCY_RATE = 0.05;

export interface VacancyInput {
  /** Monthly rent. */
  rentEstimate?: Maybe;
  /** Fractional rate, e.g. 0.07 for 7%. Defaults to 5%. */
  marketVacancyRate?: Maybe;
}

/** Expected annual rent loss from turnover. */
export function vacancyAllowance({
  rentEstimate,
  marketVacancyRate,
}: VacancyInput): ExpenseEstimate {
  const rent = safe(rentEstimate);
  const rate =
    typeof marketVacancyRate === "number" && Number.isFinite(marketVacancyRate)
      ? clamp(marketVacancyRate, 0, 0.5)
      : DEFAULT_VACANCY_RATE;

  const source = typeof marketVacancyRate === "number" ? "market rate" : "default";
  return estimate(
    rent * 12 * rate,
    "assumed",
    `${round2(rate * 100)}% of gross rent (${source})`
  );
}

export const DEFAULT_MANAGEMENT_RATE_PERCENT = 8;

export interface ManagementInput {
  /** Monthly rent. */
  rentEstimate?: Maybe;
  /** Percent of collected rent, e.g. 8. Defaults to 8%. */
  ratePercent?: Maybe;
}

/** Third-party property management fee. Default 8%, user-overridable. */
export function propertyManagement({ rentEstimate, ratePercent }: ManagementInput): ExpenseEstimate {
  const rent = safe(rentEstimate);
  const rate =
    typeof ratePercent === "number" && Number.isFinite(ratePercent)
      ? clamp(ratePercent, 0, 100)
      : DEFAULT_MANAGEMENT_RATE_PERCENT;

  const source = typeof ratePercent === "number" ? "user-set" : "default";
  return estimate(rent * 12 * (rate / 100), "assumed", `${round2(rate)}% of gross rent (${source})`);
}
