import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRentEstimate } from "@/lib/listings";

// GET /api/rent-estimate?address=...&bedrooms=...&bathrooms=...&sqft=...
// Returns { estimate: RentEstimate | null }
// Used by the analyzer to auto-fill a rent estimate when an address is known.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const bedrooms = searchParams.get("bedrooms");
  const bathrooms = searchParams.get("bathrooms");
  const sqft = searchParams.get("sqft");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const estimate = await getRentEstimate(
    address,
    "Multi-Family",
    bedrooms ? Number(bedrooms) : undefined,
    bathrooms ? Number(bathrooms) : undefined,
    sqft ? Number(sqft) : undefined
  );

  return NextResponse.json({ estimate });
}
