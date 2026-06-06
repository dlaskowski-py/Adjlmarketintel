"use client";

import { Fragment, useEffect, useState } from "react";
import VerdictBadge, { verdictKindFromLabel } from "@/components/VerdictBadge";

interface ScenarioLike {
  dscr: number;
  irr: number;
  capRate: number;
  noi: number;
  perInvCF: number;
  monthlyPmt: number;
  down: number;
  moic: number;
  label: string;
}

interface DealRow {
  id: string;
  address: string;
  city: string;
  price: number;
  units: number;
  bedsPerUnit: number;
  rentPerUnit: number;
  strategy: string;
  yearBuilt: number | null;
  sqft: number | null;
  mortgageRate: number;
  results: { adjl?: ScenarioLike; deal5?: ScenarioLike; solo?: ScenarioLike } | null;
  aiAnalysis: string | null;
  verdict: string;
  irr: number;
  status: string;
  notes: string | null;
  savedBy: string;
  savedAt: string;
}

const STATUS_OPTIONS = [
  { v: "researching", l: "Researching" },
  { v: "under_review", l: "Under Review" },
  { v: "active", l: "Active" },
  { v: "passed", l: "Passed" },
];

function money(n: number) {
  return isFinite(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—";
}

export default function PipelineTable() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/deals");
        if (!res.ok) throw new Error("Failed to load deals");
        const json = await res.json();
        setDeals(json.deals || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load deals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function updateStatus(id: string, status: string) {
    setDeals((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function saveNote(id: string) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteDraft }),
    });
    setDeals((d) => d.map((x) => (x.id === id ? { ...x, notes: noteDraft } : x)));
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal from the pipeline?")) return;
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    setDeals((d) => d.filter((x) => x.id !== id));
  }

  // ── Summary stats ──
  const total = deals.length;
  const avgIrr = total ? deals.reduce((s, d) => s + (d.irr || 0), 0) / total : 0;
  const activeCount = deals.filter((d) => d.status === "active").length;
  const reviewCount = deals.filter((d) => d.status === "under_review").length;

  if (loading) return <p style={{ color: "var(--muted)", padding: "1rem 0" }}>Loading pipeline…</p>;
  if (error) return <p style={{ color: "#FF8080", padding: "1rem 0" }}>{error}</p>;

  return (
    <div>
      <div className="pipe-stats">
        <div className="pipe-stat">
          <div className="pipe-stat-v">{total}</div>
          <div className="pipe-stat-l">Total Deals</div>
        </div>
        <div className="pipe-stat">
          <div className="pipe-stat-v">{total ? avgIrr.toFixed(1) + "%" : "—"}</div>
          <div className="pipe-stat-l">Average IRR</div>
        </div>
        <div className="pipe-stat">
          <div className="pipe-stat-v">{activeCount}</div>
          <div className="pipe-stat-l">Active</div>
        </div>
        <div className="pipe-stat">
          <div className="pipe-stat-v">{reviewCount}</div>
          <div className="pipe-stat-l">Under Review</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: ".8rem" }}>
        <a className="zl-btn" href="/api/deals/export" download>
          Export CSV →
        </a>
      </div>

      {total === 0 ? (
        <div className="d-empty" style={{ opacity: 0.55, padding: "3rem 0" }}>
          <h3 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "1.3rem", color: "var(--cream)" }}>
            No deals saved yet
          </h3>
          <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>
            Analyze a property to get started.
          </p>
        </div>
      ) : (
        <table className="ctbl">
          <thead>
            <tr>
              <th>Address</th>
              <th>City</th>
              <th>Price</th>
              <th>Verdict</th>
              <th>IRR</th>
              <th>DSCR</th>
              <th>Status</th>
              <th>Saved By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const dscr = d.results?.adjl?.dscr;
              return (
                <Fragment key={d.id}>
                  <tr onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                    <td className="cc">{d.address}</td>
                    <td>{d.city}</td>
                    <td className="pc">{money(d.price)}</td>
                    <td>
                      <VerdictBadge verdict={verdictKindFromLabel(d.verdict)} />
                    </td>
                    <td className="pc">{isFinite(d.irr) ? d.irr.toFixed(1) + "%" : "—"}</td>
                    <td className="pc">{typeof dscr === "number" ? dscr.toFixed(2) + "x" : "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="pipe-status-sel"
                        value={d.status}
                        onChange={(e) => updateStatus(d.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{d.savedBy}</td>
                    <td>{new Date(d.savedAt).toLocaleDateString()}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: ".35rem" }}>
                        <button
                          className="pipe-action"
                          onClick={() => {
                            setEditing(editing === d.id ? null : d.id);
                            setNoteDraft(d.notes || "");
                          }}
                        >
                          Notes
                        </button>
                        <button className="pipe-action danger" onClick={() => remove(d.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editing === d.id && (
                    <tr>
                      <td colSpan={10} style={{ background: "rgba(15,26,46,.5)" }} onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Add notes about this deal…"
                          style={{
                            width: "100%",
                            minHeight: 70,
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(201,168,76,.2)",
                            color: "var(--cream)",
                            fontFamily: "var(--font-barlow), sans-serif",
                            fontSize: ".82rem",
                            padding: ".6rem",
                            outline: "none",
                          }}
                        />
                        <div style={{ marginTop: ".5rem", display: "flex", gap: ".5rem" }}>
                          <button className="pipe-action" onClick={() => saveNote(d.id)}>
                            Save Notes
                          </button>
                          <button className="pipe-action" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {expanded === d.id && (
                    <tr>
                      <td colSpan={10} style={{ background: "rgba(15,26,46,.4)" }}>
                        <ExpandedDeal deal={d} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ScenarioMini({ s }: { s?: ScenarioLike }) {
  if (!s) return null;
  return (
    <div className="az-col">
      <div className="az-col-hdr">
        <div className="az-col-name">{s.label}</div>
      </div>
      <div className="az-col-body">
        <Row k="NOI / yr" v={money(s.noi)} />
        <Row k="DSCR" v={s.dscr.toFixed(2) + "x"} />
        <Row k="Cap Rate" v={s.capRate.toFixed(1) + "%"} />
        <Row k="Net CF" v={money(s.perInvCF)} />
        <Row k="True IRR" v={s.irr.toFixed(1) + "%"} />
        <Row k="Money Multiple" v={s.moic.toFixed(2) + "x"} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="az-metric">
      <span className="az-m-label">{k}</span>
      <span className="az-m-val">{v}</span>
    </div>
  );
}

function ExpandedDeal({ deal }: { deal: DealRow }) {
  return (
    <div style={{ padding: ".6rem .2rem" }}>
      <div className="az-cols" style={{ marginBottom: deal.aiAnalysis ? "1rem" : 0 }}>
        <ScenarioMini s={deal.results?.adjl} />
        <ScenarioMini s={deal.results?.deal5} />
        <ScenarioMini s={deal.results?.solo} />
      </div>
      {deal.aiAnalysis && (
        <div className="az-ai-box">
          <div className="az-ai-label">
            <span className="ai-dot loaded" />
            Claude AI Investment Analysis
          </div>
          <div className="az-ai-text">
            {deal.aiAnalysis
              .split("\n\n")
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </div>
      )}
      {deal.notes && (
        <p style={{ marginTop: ".8rem", fontSize: ".8rem", color: "var(--muted)" }}>
          <strong style={{ color: "var(--gold)" }}>Notes:</strong> {deal.notes}
        </p>
      )}
    </div>
  );
}
