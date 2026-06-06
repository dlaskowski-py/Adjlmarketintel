"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildMarketPrompt,
  buildStatePrompt,
  buildAnalyzePrompt,
  type MarketPromptData,
  type StatePromptData,
  type AnalyzePromptData,
} from "@/lib/prompts";

type PromptType = "market" | "state" | "analyze";

interface AISynopsisProps {
  cacheKey: string; // market id or state abbr — used for session cache
  promptData: MarketPromptData | StatePromptData | AnalyzePromptData;
  promptType: PromptType;
  variant?: "syn" | "analyze";
  onText?: (text: string) => void;
}

// Session-lifetime cache (persists across client navigation, not to the DB).
const synCache = new Map<string, string>();

const LABELS: Record<PromptType, string> = {
  market: "AI Growth Synopsis",
  state: "AI Market Analysis",
  analyze: "Claude AI Investment Analysis",
};

const LOADING: Record<PromptType, string> = {
  market: "Analyzing market…",
  state: "Analyzing market…",
  analyze: "Analyzing property…",
};

function buildPrompt(type: PromptType, data: AISynopsisProps["promptData"]): string {
  if (type === "market") return buildMarketPrompt(data as MarketPromptData);
  if (type === "state") return buildStatePrompt(data as StatePromptData);
  return buildAnalyzePrompt(data as AnalyzePromptData);
}

export default function AISynopsis({
  cacheKey,
  promptData,
  promptType,
  variant = "syn",
  onText,
}: AISynopsisProps) {
  const key = `${promptType}:${cacheKey}`;
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const [text, setText] = useState<string>(() => synCache.get(key) ?? "");
  const [loading, setLoading] = useState<boolean>(() => !synCache.has(key));
  const [failed, setFailed] = useState(false);
  const dataJson = JSON.stringify(promptData);

  useEffect(() => {
    let cancelled = false;

    const cached = synCache.get(key);
    if (cached) {
      setText(cached);
      setLoading(false);
      setFailed(false);
      onTextRef.current?.(cached);
      return;
    }

    setLoading(true);
    setFailed(false);
    setText("");

    (async () => {
      try {
        const prompt = buildPrompt(promptType, JSON.parse(dataJson));
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error("claude request failed");
        const json = await res.json();
        const out: string = json?.text || "";
        if (!out) throw new Error("empty response");
        if (cancelled) return;
        synCache.set(key, out);
        setText(out);
        setLoading(false);
        onTextRef.current?.(out);
      } catch {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dataJson]);

  const paragraphs = text
    .split("\n\n")
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const dotLoaded = !loading && !failed;
  const boxClass = variant === "analyze" ? "az-ai-box" : "syn-box";
  const textClass = variant === "analyze" ? "az-ai-text" : "syn-text";

  const header =
    variant === "analyze" ? (
      <div className="az-ai-label">
        <span className={`ai-dot${dotLoaded ? " loaded" : ""}`} />
        {LABELS[promptType]}
      </div>
    ) : (
      <div className="syn-hdr">
        <span className="syn-lbl">{LABELS[promptType]}</span>
        <span className="ai-pill">
          <span className={`ai-dot${dotLoaded ? " loaded" : ""}`} />
          Claude AI
        </span>
      </div>
    );

  return (
    <div className="d-sec">
      {header}
      <div className={boxClass}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".3rem 0" }}>
            <div className="ldots">
              <span />
              <span />
              <span />
            </div>
            <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{LOADING[promptType]}</span>
          </div>
        )}
        {failed && (
          <p className={textClass} style={{ opacity: 0.55, fontStyle: "italic" }}>
            AI analysis unavailable — API connection required.
          </p>
        )}
        {!loading &&
          !failed &&
          paragraphs.map((p, i) => (
            <p key={i} className={textClass}>
              {p}
            </p>
          ))}
      </div>
    </div>
  );
}
