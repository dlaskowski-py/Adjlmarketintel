/**
 * Small geo helpers. No network, no API keys.
 */

import { TOP20, type Market } from "@/data/markets";

export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in miles. */
export function distanceMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearestMarket {
  market: Market;
  miles: number;
}

/** Closest curated market to a point, ignoring records without coordinates. */
export function nearestMarket(point: Coords): NearestMarket | null {
  let best: NearestMarket | null = null;
  for (const market of TOP20) {
    if (typeof market.lat !== "number" || typeof market.lng !== "number") continue;
    const miles = distanceMiles(point, { latitude: market.lat, longitude: market.lng });
    if (!best || miles < best.miles) best = { market, miles };
  }
  return best;
}

/**
 * Snaps a point to a coarse grid so tiny GPS movements reuse the same cached
 * search instead of billing a fresh listings call. ~0.01° ≈ 1.1 km.
 */
export function snapToGrid(point: Coords, precision = 2): Coords {
  const factor = 10 ** precision;
  return {
    latitude: Math.round(point.latitude * factor) / factor,
    longitude: Math.round(point.longitude * factor) / factor,
  };
}

/** Radius ladder — keeps cache keys to a small fixed set. */
export const RADIUS_OPTIONS = [2, 5, 10, 25] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
