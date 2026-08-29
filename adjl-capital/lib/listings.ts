// RentCast API — formerly Realty Mole
// Docs: https://developers.rentcast.io/reference/sale-listings
// Auth header: X-Api-Key
// Base URL: https://api.rentcast.io/v1

export interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  price: number;
  status: string;
  listedDate: string;
  daysOnMarket: number;
  mlsNumber?: string;
  listingAgent?: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface RentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  comparables: Array<{
    formattedAddress: string;
    rent: number;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
  }>;
}

const BASE = "https://api.rentcast.io/v1";

function authHeaders(): Record<string, string> | null {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) return null;
  return { "X-Api-Key": key, "Content-Type": "application/json" };
}

// In-memory cache: city slug → { listings, fetchedAt }
const listingCache = new Map<string, { listings: RentCastListing[]; fetchedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getSaleListings(
  city: string,
  state: string,
  maxPrice = 500000,
  limit = 3
): Promise<RentCastListing[]> {
  const cacheKey = `${city}-${state}`.toLowerCase().replace(/\s+/g, "-");
  const cached = listingCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.listings;
  }

  const headers = authHeaders();
  if (!headers) {
    // No API key configured → degrade gracefully to the fallback links.
    return [];
  }

  try {
    const params = new URLSearchParams({
      city,
      state,
      propertyType: "Multi-Family",
      status: "Active",
      price: `0-${maxPrice}`,
      limit: String(limit),
    });

    const res = await fetch(`${BASE}/listings/sale?${params}`, { headers });

    if (!res.ok) {
      console.error(`RentCast error: ${res.status}`);
      return [];
    }

    const data: RentCastListing[] = await res.json();
    const listings = Array.isArray(data) ? data : [];
    listingCache.set(cacheKey, { listings, fetchedAt: Date.now() });
    return listings;
  } catch (err) {
    console.error("RentCast fetch error:", err);
    return [];
  }
}

export async function getRentEstimate(
  address: string,
  propertyType = "Multi-Family",
  bedrooms?: number,
  bathrooms?: number,
  squareFootage?: number
): Promise<RentEstimate | null> {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const params = new URLSearchParams({ address, propertyType });
    if (bedrooms) params.set("bedrooms", String(bedrooms));
    if (bathrooms) params.set("bathrooms", String(bathrooms));
    if (squareFootage) params.set("squareFootage", String(squareFootage));

    const res = await fetch(`${BASE}/avm/rent/long-term?${params}`, { headers });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
