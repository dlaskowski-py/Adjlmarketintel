"use client";

import { useMemo, useState } from "react";
import { STATES, type State } from "@/lib/data/states";
import StateRow from "@/components/StateRow";
import DetailPanel from "@/components/DetailPanel";

type SortMode = "alpha" | "price_asc" | "price_desc" | "hot";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "alpha", label: "A–Z" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "hot", label: "Hottest" },
];

const HOT_RANK: Record<State["inv"], number> = { hot: 3, good: 2, mod: 1, cau: 0 };

function priceNum(p: string) {
  return parseInt(p.replace(/\D/g, ""), 10) || 0;
}

export default function StateExplorer() {
  const [selectedAbbr, setSelectedAbbr] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("alpha");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    let arr = STATES.filter((s) => {
      if (!q) return true;
      return `${s.name} ${s.abbr} ${s.driver}`.toLowerCase().includes(q);
    });
    arr = [...arr];
    if (sort === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "price_asc") arr.sort((a, b) => priceNum(a.price) - priceNum(b.price));
    else if (sort === "price_desc") arr.sort((a, b) => priceNum(b.price) - priceNum(a.price));
    else if (sort === "hot") arr.sort((a, b) => HOT_RANK[b.inv] - HOT_RANK[a.inv]);
    return arr;
  }, [sort, query]);

  const selected = STATES.find((s) => s.abbr === selectedAbbr) || null;

  return (
    <div>
      <div className="fbar">
        <span className="fl">Sort:</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            className={`fb${sort === s.key ? " active" : ""}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
        <input
          className="sb"
          type="text"
          placeholder="Search state…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="split">
        <div className="list-col">
          {list.map((s) => (
            <StateRow
              key={s.abbr}
              state={s}
              selected={selectedAbbr === s.abbr}
              onClick={() => setSelectedAbbr(s.abbr)}
            />
          ))}
        </div>

        <DetailPanel
          selection={selected ? { kind: "state", state: selected } : { kind: "empty" }}
          emptyTitle="Select a State"
          emptyText="Click any state for an AI-powered analysis of its real estate market, investment outlook, and key cities."
        />
      </div>
    </div>
  );
}
