"use client";

import { useEffect, useState } from "react";
import type { Market } from "@/lib/data/markets";
import type { State } from "@/lib/data/states";
import AISynopsis from "@/components/AISynopsis";
import ListingCards from "@/components/ListingCards";

type Selection =
  | { kind: "market"; market: Market }
  | { kind: "state"; state: State }
  | { kind: "empty" };

interface DetailPanelProps {
  selection: Selection;
  emptyTitle?: string;
  emptyText?: string;
}

function ScoreBar({ score }: { score: number }) {
  const fill = Math.round((score / 10) * 100);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(0);
    const t = setTimeout(() => setWidth(fill), 100);
    return () => clearTimeout(t);
  }, [fill]);
  return (
    <div className="d-sbar">
      <div className="d-sfill" style={{ width: `${width}%` }} />
    </div>
  );
}

const STATE_INV_COLOR: Record<State["inv"], string> = {
  hot: "#4CAF7D",
  good: "var(--gold-l)",
  mod: "var(--muted)",
  cau: "#FF8080",
};
const STATE_INV_BG: Record<State["inv"], string> = {
  hot: "rgba(26,107,60,.12)",
  good: "rgba(201,168,76,.08)",
  mod: "rgba(27,43,75,.3)",
  cau: "rgba(139,26,26,.1)",
};

function MarketDetail({ m }: { m: Market }) {
  return (
    <div className="d-content" key={m.id}>
      {m.active && <div className="act-pill">★ ADJL Active Deal</div>}

      <div className="d-hdr">
        <div className="d-rrow">
          <span className="d-rank">{m.rank}</span>
          <span className={`rt ${m.tcls}`} style={{ border: "1px solid" }}>
            {m.tlbl}
          </span>
        </div>
        <div className="d-city">{m.city}</div>
        <div className="d-drv">{m.drv}</div>
        <div className="d-srow">
          <div>
            <span className="d-sbig">{m.score}</span>
            <div className="d-slbl">ADJL Score / 10</div>
          </div>
          <ScoreBar score={m.score} />
        </div>
      </div>

      <div className="d-metrics">
        <div className="d-mb">
          <span className="d-mv">{m.median}</span>
          <span className="d-ml">Median Home Price</span>
        </div>
        <div className="d-mb">
          <span className="d-mv">{m.rent}</span>
          <span className="d-ml">Avg Rent</span>
          <span className={`d-badge ${m.bc}`}>{m.growth}</span>
        </div>
        <div className="d-mb">
          <span className="d-mv">{m.vac}</span>
          <span className="d-ml">Vacancy</span>
        </div>
        <div className="d-mb">
          <span className="d-mv">{m.perRoom}</span>
          <span className="d-ml">Per-Room Rate</span>
        </div>
      </div>

      <AISynopsis
        cacheKey={m.id}
        promptType="market"
        promptData={{ city: m.city, driver: m.drv, median: m.median, rent: m.rent, growth: m.growth }}
      />

      <div className="d-sec">
        <div className="d-st">Why This Market</div>
        <p className="d-why">{m.why}</p>
      </div>
      <div className="d-sec">
        <div className="d-st">ADJL Strategy</div>
        <div className="d-strat">{m.strat}</div>
      </div>
      <div className="d-sec">
        <div className="d-st">Key Risk</div>
        <div className="d-risk">{m.risk}</div>
      </div>

      {(() => {
        const [cityName, stateAbbr] = m.city.split(",").map((s) => s.trim());
        return <ListingCards city={cityName} state={stateAbbr || ""} />;
      })()}
    </div>
  );
}

function StateDetail({ s }: { s: State }) {
  return (
    <div className="d-content" key={s.abbr}>
      <div className="d-hdr">
        <div className="d-rrow">
          <span className="d-state-abbr">{s.abbr}</span>
          <span
            className="d-inv-badge"
            style={{
              color: STATE_INV_COLOR[s.inv],
              background: STATE_INV_BG[s.inv],
              borderColor: `${STATE_INV_COLOR[s.inv]}30`,
            }}
          >
            {s.invL} Market
          </span>
          {s.active && <span className="act-pill-gold">★ ADJL ACTIVE DEAL — Atlanta</span>}
        </div>
        <div className="d-city">{s.name}</div>
        <div className="d-drv">{s.driver}</div>
      </div>

      <div className="d-metrics">
        <div className="d-mb">
          <span className="d-mv">{s.price}</span>
          <span className="d-ml">Median Home Price</span>
        </div>
        <div className="d-mb">
          <span className="d-mv">{s.rent}/mo</span>
          <span className="d-ml">Avg Rent</span>
          <span className="d-badge bu">{s.growth}</span>
        </div>
      </div>

      <AISynopsis
        cacheKey={s.abbr}
        promptType="state"
        promptData={{ name: s.name, price: s.price, rent: s.rent }}
      />

      <div className="d-sec">
        <div className="d-st">Market Overview</div>
        <p className="d-why">{s.note}</p>
      </div>
    </div>
  );
}

export default function DetailPanel({
  selection,
  emptyTitle = "Select a Market",
  emptyText = "Click any row for AI growth synopsis, pricing, and strategy.",
}: DetailPanelProps) {
  return (
    <div className="detail">
      {selection.kind === "empty" && (
        <div className="d-empty">
          <h3>{emptyTitle}</h3>
          <p>{emptyText}</p>
        </div>
      )}
      {selection.kind === "market" && <MarketDetail m={selection.market} />}
      {selection.kind === "state" && <StateDetail s={selection.state} />}
    </div>
  );
}
