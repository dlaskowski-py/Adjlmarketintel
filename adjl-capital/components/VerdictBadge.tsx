"use client";

type VerdictKind = "buy" | "conditional" | "pass";

const STYLES: Record<VerdictKind, { bg: string; border: string; color: string; label: string }> = {
  buy: { bg: "rgba(26,107,60,.2)", border: "rgba(76,175,77,.4)", color: "#4CAF7D", label: "STRONG BUY" },
  conditional: { bg: "rgba(201,168,76,.15)", border: "rgba(201,168,76,.4)", color: "var(--gold-l)", label: "CONDITIONAL" },
  pass: { bg: "rgba(139,26,26,.18)", border: "rgba(255,128,128,.4)", color: "#FF8080", label: "PASS" },
};

export function verdictKindFromLabel(label: string): VerdictKind {
  const l = label.toUpperCase();
  if (l.includes("BUY")) return "buy";
  if (l.includes("CONDITIONAL")) return "conditional";
  return "pass";
}

export default function VerdictBadge({ verdict }: { verdict: VerdictKind }) {
  const s = STYLES[verdict];
  return (
    <span
      style={{
        display: "inline-block",
        padding: ".12rem .45rem",
        fontSize: ".58rem",
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
