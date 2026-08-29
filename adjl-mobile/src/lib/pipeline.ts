import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult } from "@/lib/analyzer";
import { StorageKeys } from "@/lib/storage";

// Deals are stored locally on-device. The payload is versioned so the shape can
// evolve without stranding anyone's saved work.
const STORE_KEY = StorageKeys.deals;
const PAYLOAD_VERSION = 1;

interface DealsPayload {
  v: number;
  deals: SavedDeal[];
}

export const STATUS_OPTIONS = ["Researching", "Under Review", "Active", "Passed"] as const;
export type DealStatus = (typeof STATUS_OPTIONS)[number];

export interface SavedDeal {
  id: string;
  address: string;
  city: string;
  price: number;
  units: number;
  bedsPerUnit: number;
  rentPerUnit: number;
  strategy: string;
  yearBuilt?: number;
  sqft?: number;
  mortgageRate: number;
  results: AnalysisResult;
  aiAnalysis?: string;
  verdict: string;
  irr: number;
  status: DealStatus;
  notes?: string;
  savedAt: string; // ISO date
}

export async function getDeals(): Promise<SavedDeal[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DealsPayload | SavedDeal[];
    // Tolerate the legacy bare-array shape written before versioning.
    const deals = Array.isArray(parsed) ? parsed : (parsed.deals ?? []);
    return [...deals].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

async function persist(deals: SavedDeal[]) {
  const payload: DealsPayload = { v: PAYLOAD_VERSION, deals };
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(payload));
}

export async function saveDeal(deal: Omit<SavedDeal, "id" | "savedAt" | "status">): Promise<SavedDeal> {
  const full: SavedDeal = {
    ...deal,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "Researching",
    savedAt: new Date().toISOString(),
  };
  const deals = await getDeals();
  await persist([full, ...deals]);
  return full;
}

export async function updateDeal(
  id: string,
  patch: Partial<Pick<SavedDeal, "status" | "notes">>
): Promise<void> {
  const deals = await getDeals();
  await persist(deals.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export async function deleteDeal(id: string): Promise<void> {
  const deals = await getDeals();
  await persist(deals.filter((d) => d.id !== id));
}
