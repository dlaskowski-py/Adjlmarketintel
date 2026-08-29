/**
 * Assembles the itemized operating-expense list shown in the analyzer.
 *
 * Pure and UI-free so it can be unit-tested. Each line keeps its own confidence
 * level — they are never summed into a single undifferentiated number.
 */

import {
  capexReserve,
  estimateInsurance,
  estimateUtilities,
  maintenanceReserve,
  propertyManagement,
  vacancyAllowance,
  type Confidence,
  type ExpenseEstimate,
} from "@/lib/expenseModel";

export interface ExpenseInputs {
  zip?: string | null;
  state?: string | null;
  sqft?: number | null;
  yearBuilt?: number | null;
  valueEstimate?: number | null;
  /** Monthly. */
  rentEstimate?: number | null;
  /** From the county record when available — the only line that can be 'actual'. */
  annualPropertyTax?: number | null;
}

export interface ExpenseLine {
  label: string;
  estimate: ExpenseEstimate;
}

export function buildExpenseLines(input: ExpenseInputs): ExpenseLine[] {
  const { zip, state, sqft, yearBuilt, valueEstimate, rentEstimate, annualPropertyTax } = input;
  const lines: ExpenseLine[] = [];

  if (typeof annualPropertyTax === "number" && annualPropertyTax > 0) {
    lines.push({
      label: "Property tax",
      estimate: {
        annual: annualPropertyTax,
        monthly: Math.round((annualPropertyTax / 12) * 100) / 100,
        confidence: "actual",
        basis: "County tax record",
      },
    });
  }

  lines.push(
    { label: "Insurance", estimate: estimateInsurance({ zip, sqft, yearBuilt, valueEstimate }) },
    { label: "Utilities", estimate: estimateUtilities({ zip, sqft, state }) },
    { label: "Maintenance", estimate: maintenanceReserve({ valueEstimate, yearBuilt }) },
    { label: "CapEx reserve", estimate: capexReserve({ valueEstimate, yearBuilt }) },
    { label: "Vacancy", estimate: vacancyAllowance({ rentEstimate }) },
    { label: "Management", estimate: propertyManagement({ rentEstimate }) }
  );

  return lines.filter((l) => l.estimate.annual > 0);
}

export function totalAnnual(lines: ExpenseLine[]): number {
  return lines.reduce((sum, l) => sum + l.estimate.annual, 0);
}

export function countByConfidence(lines: ExpenseLine[]): Record<Confidence, number> {
  return lines.reduce<Record<Confidence, number>>(
    (acc, l) => ({ ...acc, [l.estimate.confidence]: acc[l.estimate.confidence] + 1 }),
    { actual: 0, modeled: 0, assumed: 0 }
  );
}
