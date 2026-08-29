// ── CORE ANALYSIS ENGINE ──────────────────────────────────
// Ported VERBATIM from the HTML MVP. DO NOT modify the calculations.

export type Strategy = "unit" | "room";

export interface ScenarioResult {
  down: number;
  annualDebt: number;
  noi: number;
  dscr: number;
  capRate: number;
  onePctRule: number;
  netCF: number;
  perInvCF: number;
  exitPrice: number;
  perInvExit: number;
  totalBack: number;
  invested: number;
  irr: number;
  moic: number;
  monthlyPmt: number;
  grossAnnual: number;
  effectiveRent: number;
  mgmtFee: number;
  numInvestors: number;
  label: string;
}

export interface Verdict {
  cls: "verdict-buy" | "verdict-maybe" | "verdict-pass";
  label: "STRONG BUY" | "CONDITIONAL" | "PASS";
  emoji: "✓" | "~" | "✗";
}

export interface AnalyzerInputs {
  price: number;
  units: number;
  bedsPerUnit: number;
  rentPerUnit: number;
  strategy: Strategy;
  rate: number;
}

export interface AnalysisResult {
  partnership: ScenarioResult;
  deal5: ScenarioResult;
  solo: ScenarioResult;
  verdicts: {
    partnership: Verdict;
    deal5: Verdict;
    solo: Verdict;
  };
}

// COPY THIS EXACTLY — do not modify the calculations
export function calcScenario(
  price: number,
  units: number,
  bedsPerUnit: number,
  rentPerUnit: number,
  strategy: Strategy | string,
  rate: number,
  label: string,
  downPct: number,
  numInvestors: number
): ScenarioResult {
  const down = price * downPct;
  const mortgage = price - down;
  const rm = rate / 100 / 12;
  const n = 25 * 12;
  const monthlyPmt = (mortgage * (rm * Math.pow(1 + rm, n))) / (Math.pow(1 + rm, n) - 1);
  const annualDebt = monthlyPmt * 12;
  const effectiveRent =
    strategy === "room" ? rentPerUnit * bedsPerUnit * units : rentPerUnit * units;
  const grossAnnual = effectiveRent * 12;
  const egi = grossAnnual * 0.92; // 8% vacancy
  const opex = egi * 0.52;
  const noi = egi - opex;
  const dscr = annualDebt > 0 ? noi / annualDebt : 999;
  const capRate = (noi / price) * 100;
  const onePctRule = (effectiveRent / price) * 100;
  const mgmtFee = numInvestors > 1 ? down * 0.015 : 0;
  const netCF = noi - annualDebt - mgmtFee;
  const perInvCF = numInvestors > 0 ? netCF / numInvestors : netCF;
  // Exit yr 4
  const exitPrice = price * 1.12;
  let remBal = mortgage;
  for (let i = 0; i < 48; i++) {
    const int = remBal * rm;
    remBal -= monthlyPmt - int;
  }
  const netExit = exitPrice - remBal;
  const profitPool = netExit - down;
  const carry = numInvestors > 1 ? profitPool * 0.16 : 0;
  const invPool = profitPool - carry;
  const perInvExit = numInvestors > 0 ? invPool / numInvestors : invPool;
  const totalBack = perInvCF * 4 + (down / numInvestors || down) + perInvExit;
  const invested = numInvestors > 1 ? (down / numInvestors) * 1.03 : down;
  // IRR
  const cfs = [
    -invested,
    perInvCF,
    perInvCF,
    perInvCF,
    perInvCF + (down / numInvestors || down) + perInvExit,
  ];
  let irr = 0.15;
  for (let i = 0; i < 2000; i++) {
    const f = cfs.reduce((s, c, j) => s + c / Math.pow(1 + irr, j), 0);
    const df = cfs.reduce((s, c, j) => s - (j * c) / Math.pow(1 + irr, j + 1), 0);
    if (Math.abs(df) < 1e-10) break;
    irr = Math.max(irr - f / df, -0.99);
  }
  const moic = totalBack / invested;
  return {
    down,
    annualDebt,
    noi,
    dscr,
    capRate,
    onePctRule,
    netCF,
    perInvCF,
    exitPrice,
    perInvExit,
    totalBack,
    invested,
    irr: irr * 100,
    moic,
    monthlyPmt,
    grossAnnual,
    effectiveRent,
    mgmtFee,
    numInvestors,
    label,
  };
}

export function verdict(irr: number, dscr: number, onePct: number): Verdict {
  if (irr >= 18 && dscr >= 1.25 && onePct >= 1.0)
    return { cls: "verdict-buy", label: "STRONG BUY", emoji: "✓" };
  if (irr >= 12 && dscr >= 1.1) return { cls: "verdict-maybe", label: "CONDITIONAL", emoji: "~" };
  return { cls: "verdict-pass", label: "PASS", emoji: "✗" };
}

// Color-class helper for metric values (good / warn / bad)
export function metricClass(val: number, good: number, warn: number): "good" | "warn" | "bad" {
  return val >= good ? "good" : val >= warn ? "warn" : "bad";
}

// Runs all three ownership scenarios at 20% down.
export function runAnalysis(inputs: AnalyzerInputs): AnalysisResult {
  const { price, units, bedsPerUnit, rentPerUnit, strategy, rate } = inputs;
  const partnership = calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, rate, "Full Ownership", 0.2, 3);
  const deal5 = calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, rate, "Investor Deal", 0.2, 5);
  const solo = calcScenario(price, units, bedsPerUnit, rentPerUnit, strategy, rate, "Single Investor", 0.2, 1);
  return {
    partnership,
    deal5,
    solo,
    verdicts: {
      partnership: verdict(partnership.irr, partnership.dscr, partnership.onePctRule),
      deal5: verdict(deal5.irr, deal5.dscr, deal5.onePctRule),
      solo: verdict(solo.irr, solo.dscr, solo.onePctRule),
    },
  };
}
