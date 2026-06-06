import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchListings } from "@/lib/listings";

// GET /api/listings?city=College+Station+TX&maxPrice=500000
// Returns { listings: Listing[], fallback?: boolean }
// - Requires an auth session
// - Results cached in memory for 24h per city key
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const maxPrice = parseInt(searchParams.get("maxPrice") || "500000", 10) || 500000;

  if (!city.trim()) {
    return NextResponse.json({ listings: [], fallback: true });
  }

  const result = await fetchListings(city, maxPrice);
  return NextResponse.json(result);
}
