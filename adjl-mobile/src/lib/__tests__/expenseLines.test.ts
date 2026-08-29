import { buildExpenseLines, countByConfidence, totalAnnual } from "../expenseLines";

const BASE = {
  zip: "78701",
  state: "TX",
  sqft: 2000,
  yearBuilt: 2005,
  valueEstimate: 450_000,
  rentEstimate: 2800,
};

describe("buildExpenseLines", () => {
  it("produces the six modeled/assumed lines without a tax record", () => {
    const lines = buildExpenseLines(BASE);
    expect(lines.map((l) => l.label)).toEqual([
      "Insurance",
      "Utilities",
      "Maintenance",
      "CapEx reserve",
      "Vacancy",
      "Management",
    ]);
  });

  it("adds property tax as the only 'actual' line when a record exists", () => {
    const lines = buildExpenseLines({ ...BASE, annualPropertyTax: 9600 });
    const tax = lines.find((l) => l.label === "Property tax");
    expect(tax?.estimate.confidence).toBe("actual");
    expect(tax?.estimate.annual).toBe(9600);
    expect(tax?.estimate.monthly).toBe(800);
    expect(lines.filter((l) => l.estimate.confidence === "actual")).toHaveLength(1);
  });

  it("ignores a zero or missing tax record rather than showing $0", () => {
    expect(buildExpenseLines({ ...BASE, annualPropertyTax: 0 }).some((l) => l.label === "Property tax")).toBe(false);
    expect(buildExpenseLines(BASE).some((l) => l.label === "Property tax")).toBe(false);
  });

  it("never collapses confidence levels — every line keeps its own", () => {
    const lines = buildExpenseLines({ ...BASE, annualPropertyTax: 9600 });
    const counts = countByConfidence(lines);
    expect(counts.actual).toBe(1);
    expect(counts.modeled).toBe(2); // insurance + utilities
    expect(counts.assumed).toBe(4); // maintenance, capex, vacancy, management
    expect(counts.actual + counts.modeled + counts.assumed).toBe(lines.length);
  });

  it("gives every line a non-empty basis so the UI can show its work", () => {
    for (const line of buildExpenseLines({ ...BASE, annualPropertyTax: 9600 })) {
      expect(line.estimate.basis.length).toBeGreaterThan(0);
    }
  });

  it("drops lines that cannot be computed instead of emitting zeros", () => {
    // No value estimate and no rent → reserves and rent-based lines are unknowable.
    const lines = buildExpenseLines({ zip: "78701", sqft: null, yearBuilt: null, valueEstimate: null, rentEstimate: null });
    expect(lines.every((l) => l.estimate.annual > 0)).toBe(true);
    expect(lines.some((l) => l.label === "Maintenance")).toBe(false);
    expect(lines.some((l) => l.label === "Vacancy")).toBe(false);
  });

  it("totals to the sum of its parts", () => {
    const lines = buildExpenseLines({ ...BASE, annualPropertyTax: 9600 });
    const manual = lines.reduce((s, l) => s + l.estimate.annual, 0);
    expect(totalAnnual(lines)).toBeCloseTo(manual, 2);
  });

  it("costs more to hold an older, larger house in a catastrophe-exposed zip", () => {
    const austin = totalAnnual(buildExpenseLines(BASE));
    const miami = totalAnnual(
      buildExpenseLines({ ...BASE, zip: "33139", state: "FL", yearBuilt: 1935, sqft: 3200 })
    );
    expect(miami).toBeGreaterThan(austin);
  });
});
