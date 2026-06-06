"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Listing {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  daysOnMarket: number;
  listingAgent?: { name: string; phone: string };
}

interface ListingCardsProps {
  city: string; // e.g. "College Station"
  state: string; // e.g. "TX"
  maxPrice?: number;
}

export default function ListingCards({ city, state, maxPrice = 500000 }: ListingCardsProps) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFallback(false);
    fetch(`/api/listings?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&maxPrice=${maxPrice}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setListings(data.listings || []);
        setFallback(data.fallback || false);
      })
      .catch(() => !cancelled && setFallback(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city, state, maxPrice]);

  const [parsedCity] = city.includes(",") ? city.split(",").map((s) => s.trim()) : [city];
  const zillowUrl = `https://www.zillow.com/homes/for_sale/${encodeURIComponent(parsedCity)}_rb/?price=0-${maxPrice}&beds=2-&homeTypes=multi-family`;
  const redfinUrl = `https://www.redfin.com/city/search/${parsedCity.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="d-sec">
      <div className="d-st">
        Live Listings
        <span style={{ color: "rgba(201,168,76,0.4)", fontWeight: 400, marginLeft: "auto" }}>
          via RentCast · under ${(maxPrice / 1000).toFixed(0)}K
        </span>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: "80px",
                background: "rgba(27,43,75,0.3)",
                border: "1px solid rgba(201,168,76,0.08)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      )}

      {!loading && fallback && (
        <div
          style={{
            padding: "0.8rem",
            background: "rgba(27,43,75,0.3)",
            border: "1px solid rgba(201,168,76,0.1)",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: "rgba(248,245,239,0.45)", marginBottom: "0.6rem" }}>
            No active multi-family listings found via API. Search directly:
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a className="zl-btn" href={zillowUrl} target="_blank" rel="noreferrer">
              Search Zillow →
            </a>
            <a className="zl-btn" href={redfinUrl} target="_blank" rel="noreferrer">
              Search Redfin →
            </a>
          </div>
        </div>
      )}

      {!loading &&
        !fallback &&
        listings.map((listing) => (
          <div
            key={listing.id}
            style={{
              background: "rgba(27,43,75,0.4)",
              border: "1px solid rgba(201,168,76,0.1)",
              padding: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--cream)",
                marginBottom: "0.25rem",
                lineHeight: 1.3,
              }}
            >
              {listing.formattedAddress}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <span className="listing-price">${listing.price.toLocaleString()}</span>
              <span style={{ fontSize: "0.72rem", color: "rgba(248,245,239,0.55)" }}>
                {listing.bedrooms}bd / {listing.bathrooms}ba
                {listing.squareFootage ? ` · ${listing.squareFootage.toLocaleString()} sqft` : ""}
                {listing.yearBuilt ? ` · Built ${listing.yearBuilt}` : ""}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  color:
                    listing.daysOnMarket > 60
                      ? "#FF8080"
                      : listing.daysOnMarket > 30
                        ? "#C9A84C"
                        : "#4CAF7D",
                }}
              >
                {listing.daysOnMarket} days on market
              </span>
              {listing.listingAgent && (
                <span style={{ fontSize: "0.62rem", color: "rgba(248,245,239,0.35)" }}>
                  {listing.listingAgent.name}
                </span>
              )}
              <button
                className="zl-btn"
                onClick={() => {
                  const params = new URLSearchParams({
                    address: listing.formattedAddress,
                    city: `${listing.city}, ${listing.state}`,
                    price: String(listing.price),
                    units: "4",
                    beds: String(listing.bedrooms || 2),
                  });
                  router.push(`/analyze?${params}`);
                }}
              >
                Analyze →
              </button>
            </div>
          </div>
        ))}

      {!loading && !fallback && listings.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
          <a className="zl-btn" href={zillowUrl} target="_blank" rel="noreferrer">
            More on Zillow →
          </a>
          <a className="zl-btn" href={redfinUrl} target="_blank" rel="noreferrer">
            More on Redfin →
          </a>
        </div>
      )}
    </div>
  );
}
