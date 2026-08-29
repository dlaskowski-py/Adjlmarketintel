// AI prompt builders. Structure is deliberate — keep the paragraph contract
// intact if you edit the wording.

export interface MarketPromptData {
  city: string;
  driver: string;
  median: string;
  rent: string;
  growth: string;
}

export interface StatePromptData {
  name: string;
  price: string;
  rent: string;
}

export interface AnalyzePromptData {
  city: string;
  price: number;
  units: number;
  beds: number;
  strategy: "room" | "unit" | string;
  rent: number;
  yearBuilt?: number;
  rate: number;
  noi: number;
  dscr: number;
  capRate: number;
  onePct: number;
  irr: number; // full-ownership IRR
  soloIrr: number; // single-investor IRR
}

export function buildMarketPrompt(d: MarketPromptData): string {
  return `You are a real estate investment analyst. Write a sharp 3-paragraph growth synopsis for ${d.city} (${d.driver}).

Paragraph 1 — Why It's Booming: The specific economic catalysts, job growth, population trends making this market boom in 2026. Specific companies, numbers, and recent developments.

Paragraph 2 — Home Price Analysis: Current median price of ${d.median}. How it compares to national average ($355,000). Recent price trend (${d.growth}). Average rent of ${d.rent}. What an investor can realistically acquire at this price point for a multifamily investment.

Paragraph 3 — 3–5 Year Outlook: Forward-looking assessment of rent growth, appreciation potential, and why this market fits an investment strategy of multifamily acquisition with per-room student leasing or military/defense workforce housing.

Keep it sharp, data-informed, written for sophisticated investors. Around 200 words. Plain text only, no bullets.`;
}

export function buildStatePrompt(d: StatePromptData): string {
  return `You are a real estate investment analyst. Write a sharp 3-paragraph investment analysis for ${d.name} as a state-level real estate market.

Paragraph 1 — Why It's Worth Watching: Key economic drivers, job growth, population trends, and what's making this state interesting or challenging for investors in 2026. Specific data points.

Paragraph 2 — Home Price & Rental Analysis: Current median home price of ${d.price}, how it compares to the national average of $355,000, recent price trends, and average rent of ${d.rent}/mo. What cap rates look like. Which cities within the state offer the best opportunities.

Paragraph 3 — Investment Outlook: Whether this state fits a strategy (multifamily, per-room student leasing near colleges, or defense/military workforce housing), what type of properties to target, and the main risks to watch.

Keep it sharp, specific, and data-informed. Around 200 words. Plain text, no bullets, no markdown.`;
}

export function buildAnalyzePrompt(d: AnalyzePromptData): string {
  const rentLine =
    d.strategy === "room"
      ? `$${d.rent}/bedroom (per-room strategy)`
      : `$${d.rent}/unit (whole unit)`;
  return `You are a real estate investment analyst. Analyze this property:

Location: ${d.city}
Price: $${d.price.toLocaleString()}
Units: ${d.units} units, ${d.beds} beds each
Rent: ${rentLine}
Year Built: ${d.yearBuilt || "Unknown"}
Mortgage Rate: ${d.rate}%

Key metrics:
- NOI: $${Math.round(d.noi).toLocaleString()}/yr
- DSCR: ${d.dscr.toFixed(2)}x
- Cap Rate: ${d.capRate.toFixed(1)}%
- 1% Rule: ${d.onePct.toFixed(2)}%
- IRR (full ownership): ${d.irr.toFixed(1)}%
- IRR (single investor): ${d.soloIrr.toFixed(1)}%

Write 2–3 sharp paragraphs: (1) whether this is a good investment and why, (2) the biggest risk, (3) one specific recommendation to improve the deal. Be direct and honest — if it's a bad deal, say so clearly. Plain text, no bullets. Max 180 words.`;
}
