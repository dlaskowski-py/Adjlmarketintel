"use client";

import Link from "next/link";
import type { Market } from "@/lib/data/markets";

interface MarketRowProps {
  market: Market;
  selected: boolean;
  onClick: () => void;
}

function growthColor(bc: Market["bc"]) {
  return bc === "bu" ? "#4CAF7D" : bc === "bd" ? "#FF8080" : "var(--gold)";
}

export function zillowUrl(city: string) {
  return `https://www.zillow.com/homes/for_sale/${encodeURIComponent(city)}_rb/?price=0-500000&beds=2-&homeTypes=multi-family`;
}

export function redfinUrl(city: string) {
  const slug = city
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.redfin.com/city/search/${slug}`;
}

function priceDigits(median: string) {
  return median.replace(/[^0-9]/g, "");
}

export default function MarketRow({ market: m, selected, onClick }: MarketRowProps) {
  const analyzeHref = `/analyze?city=${encodeURIComponent(m.city)}&price=${priceDigits(m.median)}`;

  return (
    <div className={`mrow${selected ? " sel" : ""}`} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
        <div className="mr-rank">
          <span className="rn">{m.rank.split("-")[1]}</span>
        </div>
        <div className="mr-main">
          <div className="rc">
            {m.city}
            {m.active && <span className="active-badge">ACTIVE</span>}
          </div>
          <div className="rd">{m.drv}</div>
          <div className="rm">
            <span className="ri">
              <strong>{m.median}</strong> median
            </span>
            <span className="ri" style={{ color: "rgba(201,168,76,.28)" }}>
              ·
            </span>
            <span className="ri">
              <strong>{m.rent}</strong>
            </span>
            <span className="ri" style={{ color: "rgba(201,168,76,.28)" }}>
              ·
            </span>
            <span className="ri" style={{ color: growthColor(m.bc) }}>
              {m.growth}
            </span>
          </div>
        </div>
        <div className="mr-right">
          <span className="rs">{m.score}</span>
          <span className={`rt ${m.tcls}`}>{m.tlbl}</span>
        </div>
      </div>
      <div className="mrow-footer" onClick={(e) => e.stopPropagation()}>
        <a className="zl-btn" href={zillowUrl(m.city)} target="_blank" rel="noopener noreferrer">
          Search Zillow →
        </a>
        <a className="zl-btn" href={redfinUrl(m.city)} target="_blank" rel="noopener noreferrer">
          Search Redfin →
        </a>
        <Link className="zl-btn" href={analyzeHref}>
          Analyze Property
        </Link>
      </div>
    </div>
  );
}
