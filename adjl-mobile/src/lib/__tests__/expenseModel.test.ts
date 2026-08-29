import {
  DEFAULT_MANAGEMENT_RATE_PERCENT,
  DEFAULT_VACANCY_RATE,
  capexReserve,
  estimateInsurance,
  estimateUtilities,
  maintenanceReserve,
  propertyManagement,
  stateFromZip,
  vacancyAllowance,
} from "../expenseModel";

describe("stateFromZip", () => {
  it("maps zips to states across the range table", () => {
    expect(stateFromZip("78701")).toBe("TX"); // Austin
    expect(stateFromZip("33139")).toBe("FL"); // Miami Beach
    expect(stateFromZip("10013")).toBe("NY"); // Manhattan
    expect(stateFromZip("94103")).toBe("CA"); // San Francisco
    expect(stateFromZip("99501")).toBe("AK"); // Anchorage
  });

  it("returns null for gaps and malformed input", () => {
    expect(stateFromZip("69999")).toBeNull(); // unassigned gap
    expect(stateFromZip("abcde")).toBeNull();
    expect(stateFromZip("")).toBeNull();
    expect(stateFromZip(null)).toBeNull();
  });
});

describe("estimateInsurance", () => {
  const base = { zip: "78701", sqft: 2000, yearBuilt: 2005, valueEstimate: 400_000 };

  it("is always modeled, never actual", () => {
    expect(estimateInsurance(base).confidence).toBe("modeled");
  });

  it("charges more in catastrophe-exposed zips than inland ones", () => {
    const miami = estimateInsurance({ ...base, zip: "33139" });
    const austin = estimateInsurance({ ...base, zip: "78701" });
    expect(miami.annual).toBeGreaterThan(austin.annual);
  });

  it("charges more for older structures", () => {
    const old = estimateInsurance({ ...base, yearBuilt: 1930 });
    const modern = estimateInsurance({ ...base, yearBuilt: 2015 });
    expect(old.annual).toBeGreaterThan(modern.annual);
  });

  it("applies the age brackets at their boundaries", () => {
    const at1949 = estimateInsurance({ ...base, yearBuilt: 1949 }).annual;
    const at1950 = estimateInsurance({ ...base, yearBuilt: 1950 }).annual;
    const at1979 = estimateInsurance({ ...base, yearBuilt: 1979 }).annual;
    const at1980 = estimateInsurance({ ...base, yearBuilt: 1980 }).annual;
    const at1999 = estimateInsurance({ ...base, yearBuilt: 1999 }).annual;
    const at2000 = estimateInsurance({ ...base, yearBuilt: 2000 }).annual;

    expect(at1949).toBeGreaterThan(at1950);
    expect(at1950).toEqual(at1979);
    expect(at1979).toBeGreaterThan(at1980);
    expect(at1980).toEqual(at1999);
    expect(at1999).toBeGreaterThan(at2000);
  });

  it("falls back to square footage when no value estimate exists", () => {
    const result = estimateInsurance({ ...base, valueEstimate: null });
    expect(result.annual).toBeGreaterThan(0);
    expect(result.confidence).toBe("modeled");
  });

  it("returns zero with an explanatory basis when value and sqft are both missing", () => {
    const result = estimateInsurance({ zip: "78701", sqft: null, yearBuilt: 2005, valueEstimate: null });
    expect(result.annual).toBe(0);
    expect(result.basis).toMatch(/insufficient data/i);
  });

  it("enforces a minimum premium on very low values", () => {
    expect(estimateInsurance({ ...base, valueEstimate: 1000 }).annual).toBe(500);
  });

  it("falls back to the national rate for an unknown zip", () => {
    const result = estimateInsurance({ ...base, zip: "00000" });
    expect(result.annual).toBeGreaterThan(0);
    expect(result.basis).toMatch(/national average/i);
  });

  it("keeps monthly consistent with annual", () => {
    const result = estimateInsurance(base);
    expect(result.monthly).toBeCloseTo(result.annual / 12, 2);
  });
});

describe("estimateUtilities", () => {
  it("is modeled and scales with square footage", () => {
    const small = estimateUtilities({ zip: "78701", sqft: 900 });
    const large = estimateUtilities({ zip: "78701", sqft: 3600 });
    expect(small.confidence).toBe("modeled");
    expect(large.annual).toBeGreaterThan(small.annual);
  });

  it("clamps the size scale at both ends", () => {
    const tiny = estimateUtilities({ zip: "78701", sqft: 100 }); // would be 0.06×
    const huge = estimateUtilities({ zip: "78701", sqft: 50_000 }); // would be 27×
    expect(tiny.basis).toContain("×0.6");
    expect(huge.basis).toContain("×1.8");
  });

  it("prefers an explicit state over the zip lookup", () => {
    const viaState = estimateUtilities({ zip: "78701", sqft: 1800, state: "HI" });
    const viaZip = estimateUtilities({ zip: "78701", sqft: 1800 });
    expect(viaState.annual).toBeGreaterThan(viaZip.annual);
    expect(viaState.basis).toContain("HI");
  });

  it("uses the national average when location is unknown", () => {
    const result = estimateUtilities({ zip: null, sqft: 1800 });
    expect(result.annual).toBe(420 * 12);
    expect(result.basis).toMatch(/national average/i);
  });

  it("does not scale when sqft is missing", () => {
    const result = estimateUtilities({ zip: "78701", sqft: null });
    expect(result.basis).toMatch(/unscaled/i);
  });
});

describe("maintenanceReserve / capexReserve", () => {
  const value = 400_000;

  it("are assumptions, not modeled values", () => {
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 2005 }).confidence).toBe("assumed");
    expect(capexReserve({ valueEstimate: value, yearBuilt: 2005 }).confidence).toBe("assumed");
  });

  it("reserve more for older stock", () => {
    const old = maintenanceReserve({ valueEstimate: value, yearBuilt: 1920 });
    const modern = maintenanceReserve({ valueEstimate: value, yearBuilt: 2020 });
    expect(old.annual).toBeGreaterThan(modern.annual);
  });

  it("apply the documented percentages at tier boundaries", () => {
    // Values are rounded to the cent by the model, so compare with tolerance.
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 1949 }).annual).toBeCloseTo(value * 0.015, 2);
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 1950 }).annual).toBeCloseTo(value * 0.0125, 2);
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 1999 }).annual).toBeCloseTo(value * 0.01, 2);
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 2000 }).annual).toBeCloseTo(value * 0.0085, 2);
    expect(maintenanceReserve({ valueEstimate: value, yearBuilt: 2015 }).annual).toBeCloseTo(value * 0.007, 2);

    expect(capexReserve({ valueEstimate: value, yearBuilt: 1949 }).annual).toBeCloseTo(value * 0.012, 2);
    expect(capexReserve({ valueEstimate: value, yearBuilt: 2015 }).annual).toBeCloseTo(value * 0.0045, 2);
  });

  it("treat unknown vintage as older stock and say so", () => {
    const unknown = maintenanceReserve({ valueEstimate: value, yearBuilt: null });
    expect(unknown.annual).toBeCloseTo(value * 0.0125, 2);
    expect(unknown.basis).toMatch(/unknown/i);
  });

  it("return zero when there is no value to work from", () => {
    expect(maintenanceReserve({ valueEstimate: null, yearBuilt: 2005 }).annual).toBe(0);
    expect(capexReserve({ valueEstimate: 0, yearBuilt: 2005 }).annual).toBe(0);
  });

  it("capex is always lighter than maintenance for the same vintage", () => {
    for (const yearBuilt of [1900, 1965, 1990, 2008, 2022]) {
      expect(capexReserve({ valueEstimate: value, yearBuilt }).annual).toBeLessThan(
        maintenanceReserve({ valueEstimate: value, yearBuilt }).annual
      );
    }
  });
});

describe("vacancyAllowance", () => {
  it("defaults to 5% of gross rent", () => {
    const result = vacancyAllowance({ rentEstimate: 2000 });
    expect(result.annual).toBe(2000 * 12 * DEFAULT_VACANCY_RATE);
    expect(result.confidence).toBe("assumed");
    expect(result.basis).toContain("default");
  });

  it("uses a supplied market rate", () => {
    const result = vacancyAllowance({ rentEstimate: 2000, marketVacancyRate: 0.09 });
    expect(result.annual).toBeCloseTo(2000 * 12 * 0.09, 2);
    expect(result.basis).toContain("market rate");
  });

  it("honours a genuine zero vacancy rate rather than falling back to the default", () => {
    expect(vacancyAllowance({ rentEstimate: 2000, marketVacancyRate: 0 }).annual).toBe(0);
  });

  it("clamps absurd rates to 50%", () => {
    expect(vacancyAllowance({ rentEstimate: 2000, marketVacancyRate: 5 }).annual).toBe(2000 * 12 * 0.5);
    expect(vacancyAllowance({ rentEstimate: 2000, marketVacancyRate: -1 }).annual).toBe(0);
  });

  it("returns zero for missing or invalid rent", () => {
    expect(vacancyAllowance({ rentEstimate: null }).annual).toBe(0);
    expect(vacancyAllowance({ rentEstimate: NaN }).annual).toBe(0);
    expect(vacancyAllowance({ rentEstimate: -500 }).annual).toBe(0);
  });
});

describe("propertyManagement", () => {
  it("defaults to 8% of gross rent", () => {
    const result = propertyManagement({ rentEstimate: 2000 });
    expect(result.annual).toBe(2000 * 12 * (DEFAULT_MANAGEMENT_RATE_PERCENT / 100));
    expect(result.confidence).toBe("assumed");
    expect(result.basis).toContain("default");
  });

  it("accepts a user override", () => {
    const result = propertyManagement({ rentEstimate: 2000, ratePercent: 10 });
    expect(result.annual).toBeCloseTo(2000 * 12 * 0.1, 2);
    expect(result.basis).toContain("user-set");
  });

  it("supports self-management at 0%", () => {
    expect(propertyManagement({ rentEstimate: 2000, ratePercent: 0 }).annual).toBe(0);
  });

  it("clamps out-of-range percentages", () => {
    expect(propertyManagement({ rentEstimate: 2000, ratePercent: 250 }).annual).toBe(2000 * 12);
    expect(propertyManagement({ rentEstimate: 2000, ratePercent: -5 }).annual).toBe(0);
  });
});

describe("confidence flags stay distinct across the model", () => {
  it("never collapses modeled and assumed into one bucket", () => {
    const modeled = [
      estimateInsurance({ zip: "78701", sqft: 2000, yearBuilt: 2005, valueEstimate: 400_000 }),
      estimateUtilities({ zip: "78701", sqft: 2000 }),
    ];
    const assumed = [
      maintenanceReserve({ valueEstimate: 400_000, yearBuilt: 2005 }),
      capexReserve({ valueEstimate: 400_000, yearBuilt: 2005 }),
      vacancyAllowance({ rentEstimate: 2500 }),
      propertyManagement({ rentEstimate: 2500 }),
    ];

    expect(modeled.every((e) => e.confidence === "modeled")).toBe(true);
    expect(assumed.every((e) => e.confidence === "assumed")).toBe(true);
    expect([...modeled, ...assumed].every((e) => e.basis.length > 0)).toBe(true);
  });
});
