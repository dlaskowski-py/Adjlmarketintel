import axios from "axios";

export interface Listing {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  daysOnMarket: number;
  photos: string[];
  zillowUrl?: string;
}

export interface ListingsResult {
  listings: Listing[];
  fallback?: boolean;
}

const REALTY_MOLE_HOST = "realty-mole-property-api.p.rapidapi.com";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache, keyed by city query.
const cache = new Map<string, { at: number; data: ListingsResult }>();

// Splits "College Station, TX" → { city: "College Station", state: "TX" }
function splitCity(raw: string): { city: string; state?: string } {
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return { city: parts[0], state: parts[parts.length - 1] };
  }
  return { city: raw.trim() };
}

export async function fetchListings(rawCity: string, maxPrice = 500000): Promise<ListingsResult> {
  const key = `${rawCity.toLowerCase()}|${maxPrice}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.REALTY_MOLE_API_KEY;
  if (!apiKey) {
    const data: ListingsResult = { listings: [], fallback: true };
    cache.set(key, { at: Date.now(), data });
    return data;
  }

  const { city, state } = splitCity(rawCity);

  try {
    const res = await axios.get(`https://${REALTY_MOLE_HOST}/properties`, {
      params: {
        city,
        state,
        propertyType: "Multi Family",
        limit: 3,
        maxPrice,
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": REALTY_MOLE_HOST,
      },
      timeout: 12000,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = Array.isArray(res.data) ? res.data : [];
    const listings: Listing[] = raw.slice(0, 3).map((p, i) => ({
      id: String(p.id ?? p.formattedAddress ?? i),
      address: p.formattedAddress || p.addressLine1 || `${city}${state ? ", " + state : ""}`,
      price: Number(p.price ?? p.lastSalePrice ?? 0),
      bedrooms: Number(p.bedrooms ?? 0),
      bathrooms: Number(p.bathrooms ?? 0),
      squareFootage: Number(p.squareFootage ?? 0),
      yearBuilt: Number(p.yearBuilt ?? 0),
      daysOnMarket: Number(p.daysOnMarket ?? 0),
      photos: Array.isArray(p.photos) ? p.photos : [],
    }));

    const valid = listings.filter((l) => l.price > 0);
    const data: ListingsResult =
      valid.length > 0 ? { listings: valid } : { listings: [], fallback: true };

    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    const data: ListingsResult = { listings: [], fallback: true };
    cache.set(key, { at: Date.now(), data });
    return data;
  }
}
