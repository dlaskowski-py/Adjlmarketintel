"use client";

import { useState } from "react";
import AnalysisResults, { type AnalyzerValues } from "@/components/AnalysisResults";
import type { Strategy } from "@/lib/calc/analyzer";

export interface AnalyzerPrefill {
  city?: string;
  price?: string;
  units?: string;
  beds?: string;
  rent?: string;
  year?: string;
  sqft?: string;
  rate?: string;
}

function buildExtractionPrompt(url: string): string {
  return `You are a real estate data extractor. A user has provided this property listing URL: ${url}

Based on the URL and any information you can infer from it (address, city, state, property type), provide your best estimate of the following as a JSON object. If you cannot determine a value, use null.

Return ONLY valid JSON, no other text:
{
  "address": "full address",
  "city": "City, ST",
  "price": 445000,
  "units": 4,
  "beds_per_unit": 2,
  "baths_per_unit": 2,
  "sqft_total": 3600,
  "year_built": 1980,
  "est_rent_per_unit": 1300,
  "property_type": "fourplex",
  "notes": "any notable details from the URL"
}`;
}

export default function AnalyzerForm({ prefill }: { prefill?: AnalyzerPrefill }) {
  const [url, setUrl] = useState("");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [price, setPrice] = useState(prefill?.price ?? "");
  const [units, setUnits] = useState(prefill?.units ?? "");
  const [beds, setBeds] = useState(prefill?.beds ?? "");
  const [rent, setRent] = useState(prefill?.rent ?? "");
  const [strategy, setStrategy] = useState<Strategy>("unit");
  const [year, setYear] = useState(prefill?.year ?? "");
  const [sqft, setSqft] = useState(prefill?.sqft ?? "");
  const [rate, setRate] = useState(prefill?.rate ?? "");

  const [loading, setLoading] = useState(false);
  const [urlMessage, setUrlMessage] = useState("");

  const [submitted, setSubmitted] = useState<AnalyzerValues | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | undefined>();
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();

  function collect(): AnalyzerValues | null {
    const p = parseFloat(price) || 0;
    const r = parseFloat(rent) || 0;
    if (!p || !r) {
      alert("Please enter at least a purchase price and monthly rent.");
      return null;
    }
    return {
      city: city || "Unknown Market",
      price: p,
      units: parseInt(units, 10) || 1,
      beds: parseInt(beds, 10) || 2,
      rent: r,
      strategy,
      year: parseInt(year, 10) || 1990,
      sqft: parseInt(sqft, 10) || 0,
      rate: parseFloat(rate) || 6.0,
    };
  }

  function runManual() {
    const values = collect();
    if (!values) return;
    setSourceLabel(undefined);
    setSourceUrl(undefined);
    setSubmitted(values);
  }

  async function analyzeUrl() {
    const u = url.trim();
    if (!u) {
      alert("Please paste a Zillow or Redfin URL first.");
      return;
    }
    setLoading(true);
    setUrlMessage("");
    setSubmitted(null);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildExtractionPrompt(u) }),
      });
      if (!res.ok) throw new Error("extraction failed");
      const json = await res.json();
      const raw: string = json?.text || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const prop = JSON.parse(clean);

      const next: AnalyzerValues = {
        city: prop.city || city || "Unknown Market",
        price: Number(prop.price) || parseFloat(price) || 0,
        units: Number(prop.units) || parseInt(units, 10) || 1,
        beds: Number(prop.beds_per_unit) || parseInt(beds, 10) || 2,
        rent: Number(prop.est_rent_per_unit) || parseFloat(rent) || 0,
        strategy,
        year: Number(prop.year_built) || parseInt(year, 10) || 1990,
        sqft: Number(prop.sqft_total) || parseInt(sqft, 10) || 0,
        rate: parseFloat(rate) || 6.0,
      };

      // Reflect extracted values back into the form.
      setCity(String(next.city));
      setPrice(String(next.price || ""));
      setUnits(String(next.units || ""));
      setBeds(String(next.beds || ""));
      setRent(String(next.rent || ""));
      setYear(String(next.year || ""));
      setSqft(String(next.sqft || ""));

      if (!next.price || !next.rent) {
        setUrlMessage("Could not fully extract this listing. Enter details manually below.");
        setLoading(false);
        return;
      }

      setSourceLabel(prop.address || u);
      setSourceUrl(u);
      setSubmitted(next);
      setLoading(false);
    } catch {
      setUrlMessage("Could not parse URL automatically. Please enter details manually below.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* URL input */}
      <div className="az-input-row">
        <input
          className="az-url"
          type="text"
          placeholder="Paste Zillow or Redfin URL (e.g. zillow.com/homedetails/…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="az-btn" onClick={analyzeUrl} disabled={loading}>
          Analyze URL
        </button>
      </div>

      <div className="az-or">— or enter details manually —</div>

      {/* Manual input */}
      <div className="az-manual">
        <div className="az-manual-title">Property Details</div>
        <div className="az-fields">
          <Field label="City / Market">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. College Station, TX" />
          </Field>
          <Field label="Purchase Price ($)">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="445000" />
          </Field>
          <Field label="Number of Units">
            <input type="number" min={1} max={20} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="4" />
          </Field>
          <Field label="Beds per Unit">
            <input type="number" min={1} max={8} value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="2" />
          </Field>
          <Field label="Monthly Rent / Unit ($)">
            <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="1300" />
          </Field>
          <Field label="Strategy">
            <select
              className="az-sel"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
            >
              <option value="unit">Per Unit (whole unit)</option>
              <option value="room">Per Room (per bedroom)</option>
            </select>
          </Field>
          <Field label="Year Built">
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1990" />
          </Field>
          <Field label="Sq Ft (total)">
            <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="3600" />
          </Field>
          <Field label="Mortgage Rate (%)">
            <input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="6.0" />
          </Field>
        </div>
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button className="az-btn" onClick={runManual}>
            Run Analysis
          </button>
        </div>
      </div>

      {urlMessage && (
        <div className="az-warn-box" style={{ marginBottom: "1rem" }}>
          {urlMessage}
        </div>
      )}

      {loading && (
        <div className="az-loading">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".8rem", marginBottom: ".6rem" }}>
            <div className="ldots">
              <span />
              <span />
              <span />
            </div>
            <span style={{ fontSize: ".85rem", color: "var(--muted)" }}>Analyzing property…</span>
          </div>
          <p style={{ fontSize: ".75rem", color: "rgba(248,245,239,.3)" }}>
            Extracting listing details and running DSCR, IRR, and cap rate calculations
          </p>
        </div>
      )}

      {submitted && (
        <AnalysisResults
          key={`${submitted.city}-${submitted.price}-${submitted.rent}-${submitted.strategy}`}
          values={submitted}
          sourceLabel={sourceLabel}
          sourceUrl={sourceUrl}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="az-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
