"use client";

import type { State } from "@/lib/data/states";

interface StateRowProps {
  state: State;
  selected: boolean;
  onClick: () => void;
}

const invClass: Record<State["inv"], string> = {
  hot: "inv-hot",
  good: "inv-good",
  mod: "inv-mod",
  cau: "inv-caution",
};

export default function StateRow({ state: s, selected, onClick }: StateRowProps) {
  return (
    <div className={`srow${selected ? " sel" : ""}`} onClick={onClick}>
      <span className="s-abbr">{s.abbr}</span>
      <span className="s-name">
        {s.name}
        {s.active && <span className="active-badge">ACTIVE DEAL</span>}
      </span>
      <span className="s-price">{s.price}</span>
      <span className="s-rent">{s.rent}/mo</span>
      <span className={`s-inv ${invClass[s.inv]}`}>{s.invL}</span>
    </div>
  );
}
