"use client";

import { useState } from "react";
import {
  runAnalysis,
  metricClass,
  type ScenarioResult,
  type Verdict,
  type Strategy,
} from "@/lib/calc/analyzer";
import AISynopsis from "@/components/AISynopsis";

export interface AnalyzerValues {
  city: string;
  price: number;
  units: number;
  beds: number;
  rent: number;
  strategy: Strategy;
  year: number;
  sqft: number;
  rate: number;
}

interface AnalysisResultsProps {
  values: AnalyzerValues;
  sourceLabel?: string;
  sourceUrl?: string;
}

function fmt(n: number, d = 0) {
  return isFinite(n)
    ? "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "N/A";
}
function fmtP(n: number, d = 1) {
  return isFinite(n) ? n.toFixed(d) + "%" : "N/A";
}

function MetricCol({ s }: { s: ScenarioResult }) {
  const isNeg = s.perInvCF < 0;
  const sub =
    s.numInvestors === 3
      ? "Daniel · Andrew · James"
      : s.numInvestors === 5
        ? "5 investors × " + fmt(s.down / 5) + " ea"
        : "100% ownership";
  return (
    <div className="az-col">
      <div className="az-col-hdr">
        <div className="az-col-name">{s.label}</div>
        <div className="az-col-sub">{sub}</div>
      </div>
      <div className="az-col-body">
        <Metric label="Down Payment" val={fmt(s.down)} />
        <Metric label="Mortgage / mo" val={fmt(s.monthlyPmt)} />
        <Metric label="Gross Revenue / yr" val={fmt(s.grossAnnual)} />
        <Metric label="NOI / yr" val={fmt(s.noi)} />
        <Metric label="DSCR" val={s.dscr.toFixed(2) + "x"} cls={metricClass(s.dscr, 1.25, 1.1)} />
        <Metric label="Cap Rate" val={fmtP(s.capRate)} cls={metricClass(s.capRate, 7, 5)} />
        <Metric label="1% Rule" val={fmtP(s.onePctRule)} cls={metricClass(s.onePctRule, 1.0, 0.8)} />
        <Metric
          label="Annual Net CF"
          val={(isNeg ? "-" : "") + fmt(Math.abs(s.perInvCF))}
          cls={isNeg ? "bad" : "good"}
        />
        <Metric label="Exit Profit (Yr 4)" val={fmt(s.perInvExit)} cls="good" />
        <Metric label="True IRR" val={fmtP(s.irr)} cls={metricClass(s.irr, 18, 12)} />
        <Metric label="Money Multiple" val={s.moic.toFixed(2) + "x"} cls={metricClass(s.moic, 1.8, 1.4)} />
      </div>
    </div>
  );
}

function Metric({ label, val, cls }: { label: string; val: string; cls?: string }) {
  return (
    <div className="az-metric">
      <span className="az-m-label">{label}</span>
      <span className={`az-m-val${cls ? " " + cls : ""}`}>{val}</span>
    </div>
  );
}

function VerdictCell({ title, v, s }: { title: string; v: Verdict; s: ScenarioResult }) {
  return (
    <div className="az-verdict-cell">
      <div className="az-v-title">{title}</div>
      <div className={`az-v-score ${v.cls}`}>{v.emoji}</div>
      <div className={`az-v-label ${v.cls}`}>{v.label}</div>
      <div className="az-v-sub">
        IRR {fmtP(s.irr)} · {s.dscr.toFixed(2)}x DSCR
      </div>
    </div>
  );
}

export default function AnalysisResults({ values, sourceLabel, sourceUrl }: AnalysisResultsProps) {
  const { city, price, units, beds, rent, strategy, year, rate } = values;
  const result = runAnalysis({
    price,
    units,
    bedsPerUnit: beds,
    rentPerUnit: rent,
    strategy,
    rate,
  });
  const { adjl, deal5, solo, verdicts } = result;

  const [aiText, setAiText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const stratLabel =
    strategy === "room"
      ? `${beds} beds × ${units} units × $${rent}/bed = ${fmt(adjl.effectiveRent)}/mo gross`
      : `${units} units × $${rent}/unit = ${fmt(adjl.effectiveRent)}/mo gross`;

  const cacheKey = `${city}-${price}-${units}-${beds}-${rent}-${strategy}-${rate}`;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: sourceLabel || city,
          sourceUrl: sourceUrl || undefined,
          city,
          price,
          units,
          bedsPerUnit: beds,
          rentPerUnit: rent,
          strategy,
          yearBuilt: year || undefined,
          sqft: values.sqft || undefined,
          mortgageRate: rate,
          results: result,
          aiAnalysis: aiText || undefined,
          verdict: verdicts.adjl.label,
          irr: adjl.irr,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="az-results">
      {/* Property summary */}
      <div
        style={{
          marginBottom: "1.2rem",
          padding: ".8rem 1rem",
          background: "rgba(27,43,75,.5)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 700,
            letterSpacing: ".13em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: ".3rem",
          }}
        >
          Property Summary
        </div>
        <div style={{ fontSize: ".88rem", color: "var(--cream)" }}>
          {(sourceLabel || city)} · {fmt(price)} · {units} units
        </div>
        <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: ".2rem" }}>
          {stratLabel}
        </div>
      </div>

      {/* Verdict row */}
      <div className="az-verdict-row">
        <VerdictCell title="ADJL Owned" v={verdicts.adjl} s={adjl} />
        <VerdictCell title={`Investor Deal (5×${fmt(deal5.down / 5)})`} v={verdicts.deal5} s={deal5} />
        <VerdictCell title="Single Investor" v={verdicts.solo} s={solo} />
      </div>

      {/* Metric comparison */}
      <div className="az-cols">
        <MetricCol s={adjl} />
        <MetricCol s={deal5} />
        <MetricCol s={solo} />
      </div>

      {/* AI analysis */}
      <AISynopsis
        cacheKey={cacheKey}
        promptType="analyze"
        variant="analyze"
        onText={setAiText}
        promptData={{
          city,
          price: fmt(price),
          units,
          beds,
          strategy,
          rent,
          yearBuilt: year,
          rate,
          noi: fmt(adjl.noi),
          dscr: adjl.dscr.toFixed(2),
          capRate: fmtP(adjl.capRate),
          onePct: fmtP(adjl.onePctRule),
          irr: fmtP(adjl.irr),
        }}
      />

      {/* Save + disclaimer */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.2rem" }}>
        <button className="az-btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save to Pipeline"}
        </button>
        {error && <span style={{ color: "#FF8080", fontSize: ".78rem" }}>{error}</span>}
      </div>

      <div className="az-warn-box">
        Conservative assumptions: 8% vacancy · 52% expense ratio · 20% down · 12% appreciation over 4
        years.
      </div>

      {saved && <div className="toast">✓ Saved to pipeline</div>}
    </div>
  );
}
