"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zillowUrl, redfinUrl } from "@/components/MarketRow";

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

function money(n: number) {
  return isFinite(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—";
}

export default function ListingCards({ city }: { city: string }) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFallback(false);
    setListings(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/listings?city=${encodeURIComponent(city)}&maxPrice=500000`
        );
        const json = await res.json();
        if (cancelled) return;
        if (json?.fallback || !json?.listings?.length) {
          setFallback(true);
          setListings([]);
        } else {
          setListings(json.listings as Listing[]);
        }
        setLoading(false);
      } catch {
        if (cancelled) return;
        setFallback(true);
        setListings([]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city]);

  function analyze(l: Listing) {
    const params = new URLSearchParams({
      city,
      price: String(l.price || ""),
      beds: String(l.bedrooms || ""),
      sqft: String(l.squareFootage || ""),
      year: String(l.yearBuilt || ""),
    });
    router.push(`/analyze?${params.toString()}`);
  }

  return (
    <div className="d-sec">
      <div className="d-st">Live Listings</div>

      {loading && (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} className="listing-card">
              <div className="listing-photo skeleton" style={{ height: 70 }} />
              <div className="listing-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton" style={{ height: 12, width: "70%" }} />
                <div className="skeleton" style={{ height: 12, width: "40%" }} />
                <div className="skeleton" style={{ height: 12, width: "55%" }} />
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && listings && listings.length > 0 && (
        <>
          {listings.map((l) => (
            <div key={l.id} className="listing-card">
              {l.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="listing-photo" src={l.photos[0]} alt={l.address} />
              ) : (
                <div className="listing-photo" style={{ minHeight: 70 }} />
              )}
              <div className="listing-body">
                <div className="listing-addr">{l.address}</div>
                <div className="listing-price">{money(l.price)}</div>
                <div className="listing-meta">
                  {l.bedrooms || "?"} bd · {l.bathrooms || "?"} ba
                  {l.squareFootage ? ` · ${l.squareFootage.toLocaleString()} sqft` : ""}
                  {typeof l.daysOnMarket === "number" ? ` · ${l.daysOnMarket}d on market` : ""}
                </div>
                <button
                  className="zl-btn"
                  style={{ marginTop: ".4rem" }}
                  onClick={() => analyze(l)}
                >
                  Analyze This Property
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && fallback && (
        <div className="mrow-footer" style={{ border: "none", paddingLeft: 0 }}>
          <a className="zl-btn" href={zillowUrl(city)} target="_blank" rel="noopener noreferrer">
            Search Zillow →
          </a>
          <a className="zl-btn" href={redfinUrl(city)} target="_blank" rel="noopener noreferrer">
            Search Redfin →
          </a>
        </div>
      )}
    </div>
  );
}
