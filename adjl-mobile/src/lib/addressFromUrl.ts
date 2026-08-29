/**
 * addressFromUrl — extract a street address from a pasted listing URL.
 *
 * Zillow, Redfin and Realtor.com all encode the full address in the URL path,
 * so we can parse it from the slug alone. This module NEVER fetches or scrapes
 * the page — it is pure string parsing over the URL.
 *
 * Parsing is deliberately conservative: when the slug is ambiguous we return
 * `null` so the caller can fall back to manual entry, rather than guessing and
 * handing downstream analysis a wrong address.
 */

export interface ParsedAddress {
  /** e.g. "1234 Main St" */
  street: string;
  /** e.g. "Austin" */
  city: string;
  /** Two-letter uppercase, e.g. "TX" */
  state: string;
  /** Five digits, e.g. "78701" */
  zip: string;
}

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
]);

/**
 * Street-type tokens used to split "street" from "city" in a hyphenated slug.
 *
 * Only unambiguous suffixes are listed. Words that frequently appear inside
 * city names (Park, Glen, Grove, Ridge, Heights, Valley, Creek, Point…) are
 * intentionally excluded: mis-splitting "Glen Ellyn" into a street is worse
 * than failing over to manual entry.
 */
const STREET_SUFFIXES = new Set([
  "st", "street", "ave", "avenue", "blvd", "boulevard", "rd", "road",
  "dr", "drive", "ln", "lane", "ct", "court", "cir", "circle",
  "pl", "place", "ter", "terrace", "way", "trl", "trail",
  "pkwy", "parkway", "hwy", "highway", "pike", "plz", "plaza",
  "sq", "square", "xing", "crossing", "expy", "expressway",
  "fwy", "freeway", "aly", "alley", "walk", "loop", "row", "cv",
]);

/** Secondary-unit designators that belong to the street, not the city. */
const UNIT_MARKERS = new Set([
  "apt", "unit", "ste", "suite", "fl", "floor", "bldg", "rm", "lot", "spc", "trlr",
]);

const DIRECTIONALS = new Set(["n", "s", "e", "w", "ne", "nw", "se", "sw"]);

function isState(token: string): boolean {
  return US_STATES.has(token.toUpperCase());
}

/** Title-cases an address fragment, keeping directionals and ordinals idiomatic. */
function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (DIRECTIONALS.has(lower)) return lower.toUpperCase(); // N, SW
      if (/^\d+(st|nd|rd|th)$/i.test(word)) return lower; // 1st, 22nd
      if (/^\d/.test(word)) return word.toUpperCase(); // 1234, 5B
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Splits leading tokens into street + city using the last street-suffix token.
 * Returns null when no suffix is present (ambiguous → manual entry).
 */
function splitStreetCity(tokens: string[]): { street: string; city: string } | null {
  let suffixIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (STREET_SUFFIXES.has(tokens[i].toLowerCase())) suffixIndex = i;
  }
  if (suffixIndex === -1) return null;

  // Absorb trailing unit designators, e.g. "… St Apt 4B Austin".
  let end = suffixIndex;
  while (end + 2 < tokens.length && UNIT_MARKERS.has(tokens[end + 1].toLowerCase())) {
    end += 2;
  }

  const street = tokens.slice(0, end + 1);
  const city = tokens.slice(end + 1);
  if (street.length === 0 || city.length === 0) return null;

  return { street: street.join(" "), city: city.join(" ") };
}

/** Parses a "1234-Main-St-Austin-TX-78701" style slug. */
function parseHyphenSlug(slug: string): ParsedAddress | null {
  const tokens = slug.split("-").filter(Boolean);
  if (tokens.length < 4) return null;

  let zipIndex = tokens.length - 1;
  // ZIP+4 arrives as two trailing tokens: "78701-1234".
  if (/^\d{4}$/.test(tokens[zipIndex]) && /^\d{5}$/.test(tokens[zipIndex - 1] ?? "")) {
    zipIndex -= 1;
  }
  const zip = tokens[zipIndex];
  if (!/^\d{5}$/.test(zip)) return null;

  const stateToken = tokens[zipIndex - 1];
  if (!stateToken || !isState(stateToken)) return null;

  const split = splitStreetCity(tokens.slice(0, zipIndex - 1));
  if (!split) return null;

  return {
    street: titleCase(split.street),
    city: titleCase(split.city),
    state: stateToken.toUpperCase(),
    zip,
  };
}

/** zillow.com/homedetails/1234-Main-St-Austin-TX-78701/12345678_zpid/ */
function parseZillow(segments: string[]): ParsedAddress | null {
  const slug = segments
    .filter((s) => !/^\d+_zpid$/i.test(s))
    .map((s) => s.replace(/_rb$/i, ""))
    .filter((s) => /-[A-Za-z]{2}-\d{5}(-\d{4})?$/.test(s))
    .pop();
  return slug ? parseHyphenSlug(slug) : null;
}

/** redfin.com/TX/Austin/1234-Main-St-78701/home/12345678 */
function parseRedfin(segments: string[]): ParsedAddress | null {
  const [stateSeg, citySeg, streetSeg, ...rest] = segments;
  if (!stateSeg || !citySeg || !streetSeg) return null;
  // Search pages look like /city/30818/TX/Austin — no address to extract.
  if (!isState(stateSeg)) return null;

  const tokens = streetSeg.split("-").filter(Boolean);
  const zip = tokens[tokens.length - 1];
  if (!/^\d{5}$/.test(zip)) return null;

  let streetTokens = tokens.slice(0, -1);
  if (streetTokens.length === 0) return null;

  // Unit lives in its own segment: /1234-Main-St-78701/unit-5/home/123
  const next = rest[0];
  if (next && /^(unit|apt|ste|suite)-/i.test(next)) {
    streetTokens = streetTokens.concat(next.split("-").filter(Boolean));
  }

  return {
    street: titleCase(streetTokens.join(" ")),
    city: titleCase(citySeg.replace(/-/g, " ")),
    state: stateSeg.toUpperCase(),
    zip,
  };
}

/** realtor.com/realestateandhomes-detail/1234-Main-St_Austin_TX_78701_M12345-67890 */
function parseRealtor(segments: string[]): ParsedAddress | null {
  const detailIndex = segments.findIndex((s) => /^realestateandhomes-detail$/i.test(s));
  const slug = detailIndex >= 0 ? segments[detailIndex + 1] : undefined;
  if (!slug || !slug.includes("_")) return null;

  const parts = slug.split("_").filter(Boolean);
  if (parts.length < 4) return null;

  const [streetRaw, cityRaw, stateRaw, zipRaw] = parts;
  if (!isState(stateRaw)) return null;

  const zip = zipRaw.slice(0, 5);
  if (!/^\d{5}$/.test(zip)) return null;
  if (!streetRaw || !cityRaw) return null;

  return {
    street: titleCase(streetRaw.replace(/-/g, " ")),
    city: titleCase(cityRaw.replace(/-/g, " ")),
    state: stateRaw.toUpperCase(),
    zip,
  };
}

export type ListingSource = "zillow" | "redfin" | "realtor";

/** Identifies the listing site from a URL, or null if unsupported. */
export function detectSource(url: string): ListingSource | null {
  const host = safeHost(url);
  if (!host) return null;
  if (host.endsWith("zillow.com")) return "zillow";
  if (host.endsWith("redfin.com")) return "redfin";
  if (host.endsWith("realtor.com")) return "realtor";
  return null;
}

function safeHost(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Extracts a normalized address from a Zillow / Redfin / Realtor.com URL.
 * Returns null when the site is unsupported or the slug cannot be parsed
 * confidently — callers should fall back to manual entry.
 */
export function addressFromUrl(url: string): ParsedAddress | null {
  const source = detectSource(url);
  if (!source) return null;

  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let pathname: string;
  try {
    pathname = new URL(withProtocol).pathname;
  } catch {
    return null;
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

  if (segments.length === 0) return null;

  switch (source) {
    case "zillow":
      return parseZillow(segments);
    case "redfin":
      return parseRedfin(segments);
    case "realtor":
      return parseRealtor(segments);
  }
}

/** Convenience single-line form, e.g. "1234 Main St, Austin, TX 78701". */
export function formatAddress(address: ParsedAddress): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}
