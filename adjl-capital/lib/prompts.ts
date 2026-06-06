// AI prompt builders — wording copied EXACTLY from the spec (§8).
// DO NOT change the prompt wording.

export interface MarketPromptData {
  city: string;
  driver: string;
  median: string;
  rent: string;
}

export interface StatePromptData {
  name: string;
  price: string;
  rent: string;
}

export interface AnalyzePromptData {
  city: string;
  price: string;
  units: number | string;
  beds: number | string;
  strategy: "room" | "unit" | string;
  rent: number | string;
  yearBuilt: number | string;
  rate: number | string;
  noi: string;
  dscr: string;
  capRate: string;
  onePct: string;
  irr: string;
}

export function buildMarketPrompt(d: MarketPromptData): string {
  return `You are a real estate investment analyst for ADJL Capital, a private equity firm.
Write a sharp 3-paragraph growth synopsis for ${d.city} (${d.driver}).

Paragraph 1 — Why It's Booming: Specific economic catalysts, job growth, population trends making this market boom in 2026. Specific companies and numbers.

Paragraph 2 — Home Price Analysis: Current median price of ${d.median}. How it compares to the national average of $355,000. Rent of ${d.rent}. What ADJL Capital can realistically acquire at this price point.

Paragraph 3 — 3–5 Year Outlook: Forward-looking assessment of rent growth, appreciation potential, and fit for ADJL Capital's multifamily + per-room leasing or defense/military workforce housing strategy.

Around 200 words. Plain text only, no bullets, no markdown.`;
}

export function buildStatePrompt(d: StatePromptData): string {
  return `You are a real estate investment analyst for ADJL Capital, a private equity firm.
Write a sharp 3-paragraph investment analysis for ${d.name} as a state-level real estate market.

Paragraph 1 — Why It's Worth Watching: Key economic drivers, job growth, population trends, and what makes this state interesting or challenging for investors in 2026.

Paragraph 2 — Home Price & Rental Analysis: Median home price of ${d.price} vs. national average of $355,000. Average rent of ${d.rent}/mo. Best cities within the state for multifamily investment.

Paragraph 3 — ADJL Investment Outlook: Whether this state fits ADJL Capital's strategy (multifamily near colleges or defense/military workforce housing), what to target, and main risks.

Around 200 words. Plain text, no bullets, no markdown.`;
}

export function buildAnalyzePrompt(d: AnalyzePromptData): string {
  const rentLine =
    d.strategy === "room" ? `$${d.rent}/bedroom (per-room)` : `$${d.rent}/unit`;
  return `You are a real estate investment analyst for ADJL Capital. Analyze this property:

Location: ${d.city}
Price: ${d.price}
Units: ${d.units} units, ${d.beds} beds each
Rent: ${rentLine}
Year Built: ${d.yearBuilt}
Mortgage Rate: ${d.rate}%

Key metrics (ADJL-owned scenario):
- NOI: ${d.noi}/yr
- DSCR: ${d.dscr}x
- Cap Rate: ${d.capRate}%
- 1% Rule: ${d.onePct}%
- IRR: ${d.irr}%

Write 2–3 sharp paragraphs: (1) whether this is a good investment and why, (2) the biggest risk, (3) one specific recommendation to improve the deal. Be direct — if it's a bad deal say so clearly. Plain text, no bullets. Max 180 words.`;
}
