import { distanceMiles, nearestMarket, snapToGrid, RADIUS_OPTIONS } from "../geo";
import { TOP20 } from "@/data/markets";

const AUSTIN = { latitude: 30.2672, longitude: -97.7431 };
const COLLEGE_STATION = { latitude: 30.628, longitude: -96.3344 };
const SAN_ANTONIO = { latitude: 29.4241, longitude: -98.4936 };

describe("distanceMiles", () => {
  it("is zero for the same point", () => {
    expect(distanceMiles(AUSTIN, AUSTIN)).toBeCloseTo(0, 5);
  });

  it("matches known city distances within a reasonable tolerance", () => {
    // Austin → San Antonio is ~74 miles as the crow flies.
    expect(distanceMiles(AUSTIN, SAN_ANTONIO)).toBeGreaterThan(65);
    expect(distanceMiles(AUSTIN, SAN_ANTONIO)).toBeLessThan(85);
  });

  it("is symmetric", () => {
    expect(distanceMiles(AUSTIN, COLLEGE_STATION)).toBeCloseTo(
      distanceMiles(COLLEGE_STATION, AUSTIN),
      6
    );
  });
});

describe("nearestMarket", () => {
  it("every curated market has coordinates", () => {
    expect(TOP20.every((m) => typeof m.lat === "number" && typeof m.lng === "number")).toBe(true);
  });

  it("finds College Station from just outside it", () => {
    const found = nearestMarket({ latitude: 30.63, longitude: -96.33 });
    expect(found?.market.city).toContain("College Station");
    expect(found?.miles).toBeLessThan(5);
  });

  it("finds San Antonio from San Antonio", () => {
    expect(nearestMarket(SAN_ANTONIO)?.market.city).toContain("San Antonio");
  });

  it("still returns the closest market from far away", () => {
    const found = nearestMarket({ latitude: 61.2181, longitude: -149.9003 }); // Anchorage
    expect(found).not.toBeNull();
    expect(found!.miles).toBeGreaterThan(1000);
  });
});

describe("snapToGrid", () => {
  it("collapses small GPS jitter onto one cache key", () => {
    const a = snapToGrid({ latitude: 30.26721, longitude: -97.74314 });
    const b = snapToGrid({ latitude: 30.26789, longitude: -97.74298 });
    expect(a).toEqual(b);
  });

  it("keeps genuinely different locations apart", () => {
    expect(snapToGrid(AUSTIN)).not.toEqual(snapToGrid(SAN_ANTONIO));
  });
});

describe("RADIUS_OPTIONS", () => {
  it("stays within RentCast's 100 mile ceiling and is ascending", () => {
    expect(Math.max(...RADIUS_OPTIONS)).toBeLessThanOrEqual(100);
    expect([...RADIUS_OPTIONS].sort((a, b) => a - b)).toEqual([...RADIUS_OPTIONS]);
  });
});
