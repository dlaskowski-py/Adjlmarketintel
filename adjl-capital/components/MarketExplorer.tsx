"use client";

import { useMemo, useState } from "react";
import type { Market } from "@/lib/data/markets";
import MarketRow from "@/components/MarketRow";
import DetailPanel from "@/components/DetailPanel";

interface MarketExplorerProps {
  markets: Market[];
  withFilter?: boolean; // category filter bar (Top 20 only)
  grouped?: boolean; // split into College / Defense & Tech sections
  initialSelectedId?: string; // pre-select a row (e.g. from the Compare table)
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "college", label: "College" },
  { key: "military", label: "Military" },
  { key: "tech", label: "Tech" },
  { key: "defense", label: "Defense" },
];

export default function MarketExplorer({
  markets,
  withFilter = false,
  grouped = false,
  initialSelectedId,
}: MarketExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [filterCat, setFilterCat] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return markets.filter((m) => {
      if (withFilter && filterCat !== "all" && !m.cat.includes(filterCat)) return false;
      if (q) {
        const text = `${m.city} ${m.drv} ${m.cat}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [markets, withFilter, filterCat, query]);

  const college = filtered.filter((m) => m.cat.includes("college"));
  const defense = filtered.filter((m) => !m.cat.includes("college"));

  const selected = markets.find((m) => m.id === selectedId) || null;

  return (
    <div>
      <div className="fbar">
        {withFilter && (
          <>
            <span className="fl">Filter:</span>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`fb${filterCat === f.key ? " active" : ""}`}
                onClick={() => setFilterCat(f.key)}
              >
                {f.label}
              </button>
            ))}
          </>
        )}
        <input
          className="sb"
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="split">
        <div className="list-col">
          {grouped ? (
            <>
              <div className="sec-hdr">
                <span className="sh-title">
                  <em>College Town</em> Markets
                </span>
                <div className="sh-line" />
                <span className="sh-ct">{college.length} Markets</span>
              </div>
              {college.map((m) => (
                <MarketRow
                  key={m.id}
                  market={m}
                  selected={selectedId === m.id}
                  onClick={() => setSelectedId(m.id)}
                />
              ))}

              <div className="sec-hdr" style={{ marginTop: "1.2rem" }}>
                <span className="sh-title">
                  <em>Defense &amp; Tech</em> Boom Markets
                </span>
                <div className="sh-line" />
                <span className="sh-ct">{defense.length} Markets</span>
              </div>
              {defense.map((m) => (
                <MarketRow
                  key={m.id}
                  market={m}
                  selected={selectedId === m.id}
                  onClick={() => setSelectedId(m.id)}
                />
              ))}
            </>
          ) : (
            filtered.map((m) => (
              <MarketRow
                key={m.id}
                market={m}
                selected={selectedId === m.id}
                onClick={() => setSelectedId(m.id)}
              />
            ))
          )}
        </div>

        <DetailPanel
          selection={selected ? { kind: "market", market: selected } : { kind: "empty" }}
        />
      </div>
    </div>
  );
}
