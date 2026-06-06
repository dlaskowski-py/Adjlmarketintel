import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSaleListings } from "@/lib/listings";

// GET /api/listings?city=College+Station&state=TX&maxPrice=500000
// Returns { listings: RentCastListing[], fallback: boolean }
// - Requires an auth session
// - Results cached in memory for 24h per city-state key (see lib/listings.ts)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const maxPrice = Number(searchParams.get("maxPrice") || 500000);

  if (!city || !state) {
    return NextResponse.json({ error: "city and state required" }, { status: 400 });
  }

  const listings = await getSaleListings(city, state, maxPrice);

  return NextResponse.json({
    listings,
    fallback: listings.length === 0,
  });
}
