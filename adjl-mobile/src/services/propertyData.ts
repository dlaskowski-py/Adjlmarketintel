/**
 * propertyData — provider-agnostic property record lookup.
 *
 * Callers depend on `PropertyDataProvider` and `PropertyRecord` only. Swapping
 * RentCast for ATTOM (or blending both) means adding a new class here; no
 * caller changes.
 *
 * Everything is nullable: public-records coverage is uneven, and a missing
 * field must be visibly missing rather than silently defaulted to zero.
 */

import type { ParsedAddress } from "@/lib/addressFromUrl";
import { formatAddress } from "@/lib/addressFromUrl";

export interface SaleComp {
  id: string;
  formattedAddress: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  /** Miles from the subject property. */
  distance: number | null;
  /** ISO date the comp last transacted / was last seen. */
  date: string | null;
}

export interface RentComp {
  id: string;
  formattedAddress: string;
  /** Monthly rent. */
  rent: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  distance: number | null;
  date: string | null;
}

export interface PropertyRecord {
  /** The address the lookup was performed with. */
  address: ParsedAddress;
  /** Provider's canonical formatting of the address, when available. */
  formattedAddress: string;

  // ── Physical characteristics (public record) ──
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  /** Lot size in square feet. */
  lotSize: number | null;
  propertyType: string | null;

  // ── Assessor / tax record ──
  assessedValue: number | null;
  annualPropertyTax: number | null;

  // ── Transaction history ──
  lastSalePrice: number | null;
  /** ISO date string. */
  lastSaleDate: string | null;

  /** Monthly HOA dues. Null means "unknown", not "none". */
  hoaMonthly: number | null;

  // ── Provider estimates ──
  /** Monthly rent estimate. */
  rentEstimate: number | null;
  rentEstimateRange: { low: number; high: number } | null;
  valueEstimate: number | null;

  saleComps: SaleComp[];
  rentComps: RentComp[];

  /** Provider name, for attribution in the UI. */
  source: string;
  /** ISO timestamp of retrieval. */
  fetchedAt: string;
}

export interface PropertyDataProvider {
  /** Stable identifier, surfaced in the UI as the data attribution. */
  readonly name: string;
  getProperty(address: ParsedAddress): Promise<PropertyRecord>;
}

export type PropertyDataErrorCode =
  | "missing-credentials"
  | "not-found"
  | "rate-limited"
  | "unauthorized"
  | "network";

export class PropertyDataError extends Error {
  readonly code: PropertyDataErrorCode;

  constructor(code: PropertyDataErrorCode, message: string) {
    super(message);
    this.name = "PropertyDataError";
    this.code = code;
  }
}

// ── helpers ─────────────────────────────────────────────────

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * RentCast returns tax/assessment history keyed by year:
 *   { "2023": { value: 412000 }, "2024": { value: 430000 } }
 * Pick the most recent entry.
 */
function latestByYear(record: unknown): Record<string, unknown> | null {
  if (!record || typeof record !== "object") return null;
  const entries = Object.entries(record as Record<string, unknown>)
    .filter(([year]) => /^\d{4}$/.test(year))
    .sort(([a], [b]) => Number(b) - Number(a));
  const latest = entries[0]?.[1];
  return latest && typeof latest === "object" ? (latest as Record<string, unknown>) : null;
}

// ── RentCast implementation ─────────────────────────────────

const RENTCAST_BASE = "https://api.rentcast.io/v1";

export class RentCastProvider implements PropertyDataProvider {
  readonly name = "RentCast";

  constructor(private readonly apiKey: string) {}

  async getProperty(address: ParsedAddress): Promise<PropertyRecord> {
    if (!this.apiKey) {
      throw new PropertyDataError("missing-credentials", "No RentCast API key configured.");
    }

    const query = formatAddress(address);

    // Property details are required; the two AVM calls are enrichment and are
    // allowed to fail without sinking the whole lookup.
    const [detailsResult, valueResult, rentResult] = await Promise.allSettled([
      this.get(`/properties?address=${encodeURIComponent(query)}`),
      this.get(`/avm/value?address=${encodeURIComponent(query)}`),
      this.get(`/avm/rent/long-term?address=${encodeURIComponent(query)}`),
    ]);

    if (detailsResult.status === "rejected") throw detailsResult.reason;

    const raw = detailsResult.value;
    const details = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
    if (!details) {
      throw new PropertyDataError("not-found", `No property record found for ${query}.`);
    }

    const value = valueResult.status === "fulfilled"
      ? (valueResult.value as Record<string, unknown>)
      : null;
    const rent = rentResult.status === "fulfilled"
      ? (rentResult.value as Record<string, unknown>)
      : null;

    const assessment = latestByYear(details.taxAssessments);
    const taxes = latestByYear(details.propertyTaxes);
    const hoa = details.hoa as Record<string, unknown> | undefined;

    const rentLow = num(rent?.rentRangeLow);
    const rentHigh = num(rent?.rentRangeHigh);

    return {
      address,
      formattedAddress: str(details.formattedAddress) ?? query,

      beds: num(details.bedrooms),
      baths: num(details.bathrooms),
      sqft: num(details.squareFootage),
      yearBuilt: num(details.yearBuilt),
      lotSize: num(details.lotSize),
      propertyType: str(details.propertyType),

      assessedValue: num(assessment?.value),
      annualPropertyTax: num(taxes?.total),

      lastSalePrice: num(details.lastSalePrice),
      lastSaleDate: str(details.lastSaleDate),

      hoaMonthly: num(hoa?.fee),

      rentEstimate: num(rent?.rent),
      rentEstimateRange:
        rentLow !== null && rentHigh !== null ? { low: rentLow, high: rentHigh } : null,
      valueEstimate: num(value?.price),

      saleComps: mapSaleComps(value?.comparables),
      rentComps: mapRentComps(rent?.comparables),

      source: this.name,
      fetchedAt: new Date().toISOString(),
    };
  }

  private async get(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${RENTCAST_BASE}${path}`, {
        headers: { "X-Api-Key": this.apiKey, "Content-Type": "application/json" },
      });
    } catch (err) {
      throw new PropertyDataError(
        "network",
        `Could not reach RentCast: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new PropertyDataError("unauthorized", "RentCast rejected the API key.");
    }
    if (res.status === 404) {
      throw new PropertyDataError("not-found", "RentCast has no record for that address.");
    }
    if (res.status === 429) {
      throw new PropertyDataError("rate-limited", "RentCast rate limit reached.");
    }
    if (!res.ok) {
      throw new PropertyDataError("network", `RentCast returned ${res.status}.`);
    }

    return res.json();
  }
}

function mapSaleComps(input: unknown): SaleComp[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, i) => {
    const c = raw as Record<string, unknown>;
    return {
      id: str(c.id) ?? `sale-comp-${i}`,
      formattedAddress: str(c.formattedAddress) ?? "Unknown address",
      price: num(c.price),
      beds: num(c.bedrooms),
      baths: num(c.bathrooms),
      sqft: num(c.squareFootage),
      yearBuilt: num(c.yearBuilt),
      distance: num(c.distance),
      date: str(c.removedDate) ?? str(c.lastSeenDate) ?? str(c.listedDate),
    };
  });
}

function mapRentComps(input: unknown): RentComp[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, i) => {
    const c = raw as Record<string, unknown>;
    return {
      id: str(c.id) ?? `rent-comp-${i}`,
      formattedAddress: str(c.formattedAddress) ?? "Unknown address",
      rent: num(c.price) ?? num(c.rent),
      beds: num(c.bedrooms),
      baths: num(c.bathrooms),
      sqft: num(c.squareFootage),
      distance: num(c.distance),
      date: str(c.removedDate) ?? str(c.lastSeenDate) ?? str(c.listedDate),
    };
  });
}

/**
 * Factory — the single place callers construct a provider. Swapping in ATTOM
 * later means changing this function, not every call site.
 */
export function createPropertyDataProvider(apiKey: string): PropertyDataProvider {
  return new RentCastProvider(apiKey);
}
