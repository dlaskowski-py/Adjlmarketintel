"use client";

import { useRouter } from "next/navigation";
import { TOP20 } from "@/lib/data/markets";
import { STATES, type State } from "@/lib/data/states";

const STATE_TYPE_CLASS: Record<State["inv"], string> = {
  hot: "tc",
  good: "tl",
  mod: "ts",
  cau: "td",
};

export default function CompareTable() {
  const router = useRouter();

  return (
    <div className="view-wrap">
      <h2
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: "1.7rem",
          fontWeight: 300,
          color: "var(--cream)",
          marginBottom: "1.2rem",
        }}
      >
        All 70 Markets — <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Side by Side</em>
      </h2>

      <table className="ctbl">
        <thead>
          <tr>
            <th>ID</th>
            <th>Market / State</th>
            <th>Type</th>
            <th>Median Price</th>
            <th>Avg Rent</th>
            <th>Growth</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {TOP20.map((m) => (
            <tr key={m.id} onClick={() => router.push(`/?sel=${m.id}`)}>
              <td>{m.rank}</td>
              <td className="cc">{m.city}</td>
              <td>
                <span className={`rt ${m.tcls}`} style={{ border: "1px solid" }}>
                  {m.tlbl}
                </span>
              </td>
              <td className="pc">{m.median}</td>
              <td>{m.rent}</td>
              <td style={{ color: m.bc === "bu" ? "#4CAF7D" : "var(--gold)" }}>{m.growth}</td>
              <td className="sc2">{m.score}</td>
            </tr>
          ))}

          <tr>
            <td
              colSpan={7}
              style={{
                padding: ".5rem",
                background: "rgba(201,168,76,.05)",
                color: "var(--gold)",
                fontSize: ".65rem",
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                textAlign: "center",
                cursor: "default",
              }}
            >
              — ALL 50 STATES —
            </td>
          </tr>

          {STATES.map((s) => (
            <tr key={s.abbr} onClick={() => router.push(`/states?sel=${s.abbr}`)}>
              <td>{s.abbr}</td>
              <td className="cc">{s.name}</td>
              <td>
                <span className={`rt ${STATE_TYPE_CLASS[s.inv]}`} style={{ border: "1px solid" }}>
                  {s.invL}
                </span>
              </td>
              <td className="pc">{s.price}</td>
              <td>{s.rent}/mo</td>
              <td style={{ color: "#4CAF7D" }}>{s.growth}</td>
              <td className="sc2">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
