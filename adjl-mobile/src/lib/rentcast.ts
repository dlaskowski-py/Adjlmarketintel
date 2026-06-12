// RentCast API — sale listings + rent estimates, with the user-entered key.
// 24h in-memory cache to respect the free tier (50 calls/month).
const BASE = "https://api.rentcast.io/v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export interface RentCastListing {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  price: number;
  daysOnMarket: number;
  listingAgent?: { name: string; phone: string };
}

const listingCache = new Map<string, { listings: RentCastListing[]; fetchedAt: number }>();

export async function getSaleListings(
  apiKey: string,
  city: string,
  state: string,
  maxPrice = 500000,
  limit = 3
): Promise<RentCastListing[]> {
  if (!apiKey) return [];

  const cacheKey = `${city}-${state}`.toLowerCase().replace(/\s+/g, "-");
  const cached = listingCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.listings;

  try {
    const params = new URLSearchParams({
      city,
      state,
      propertyType: "Multi-Family",
      status: "Active",
      price: `0-${maxPrice}`,
      limit: String(limit),
    });
    const res = await fetch(`${BASE}/listings/sale?${params}`, {
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const listings: RentCastListing[] = Array.isArray(data) ? data : [];
    listingCache.set(cacheKey, { listings, fetchedAt: Date.now() });
    return listings;
  } catch {
    return [];
  }
}

export interface RentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
}

export async function getRentEstimate(
  apiKey: string,
  address: string,
  bedrooms?: number
): Promise<RentEstimate | null> {
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ address, propertyType: "Multi-Family" });
    if (bedrooms) params.set("bedrooms", String(bedrooms));
    const res = await fetch(`${BASE}/avm/rent/long-term?${params}`, {
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
