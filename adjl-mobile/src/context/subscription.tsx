/**
 * Subscription state (RevenueCat).
 *
 * Degrades gracefully in three situations that all occur in normal development:
 *  - no RevenueCat key configured yet  → unconfigured mode, nothing crashes
 *  - running in Expo Go                → RevenueCat's Preview API Mode mocks natives
 *  - offline at launch                 → last-known entitlement is read from SecureStore,
 *                                        so a paying subscriber is never locked out by a blip
 *
 * The client-side gate is UX only. The server must independently verify
 * entitlement before spending money on an API call.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { StorageKeys } from "@/lib/storage";

const ENTITLEMENT_ID = "pro";
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";

interface CachedEntitlement {
  isPro: boolean;
  expiresAt: string | null;
  checkedAt: string;
}

interface SubscriptionValue {
  /** SDK finished initialising (or was skipped). Never blocks the UI for long. */
  ready: boolean;
  isPro: boolean;
  /** True when no RevenueCat key is configured — purchases are unavailable. */
  unconfigured: boolean;
  appUserId: string | null;
  offering: PurchasesOffering | null;
  expiresAt: string | null;
  purchase: (pkg: PurchasesPackage) => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
  restore: () => Promise<{ ok: boolean; error?: string }>;
  /** Dev-only escape hatch so the paid experience is demoable before IAP is live. */
  devOverride: boolean;
  setDevOverride: (on: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionValue | undefined>(undefined);

function readEntitlement(info: CustomerInfo): { isPro: boolean; expiresAt: string | null } {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  return { isPro: !!ent, expiresAt: ent?.expirationDate ?? null };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [devOverride, setDevOverride] = useState(false);

  const unconfigured = !IOS_KEY;

  const cache = useCallback(async (value: CachedEntitlement) => {
    try {
      await SecureStore.setItemAsync(StorageKeys.entitlement, JSON.stringify(value));
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Optimistically restore the last-known entitlement so an offline launch
      // doesn't present a paying user with a paywall.
      try {
        const raw = await SecureStore.getItemAsync(StorageKeys.entitlement);
        if (raw && !cancelled) {
          const cached = JSON.parse(raw) as CachedEntitlement;
          setIsPro(cached.isPro);
          setExpiresAt(cached.expiresAt);
        }
      } catch {
        // ignore
      }

      if (unconfigured) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: IOS_KEY });
        }

        const info = await Purchases.getCustomerInfo();
        if (cancelled) return;

        const next = readEntitlement(info);
        setIsPro(next.isPro);
        setExpiresAt(next.expiresAt);
        setAppUserId(info.originalAppUserId ?? null);
        void cache({ ...next, checkedAt: new Date().toISOString() });

        Purchases.addCustomerInfoUpdateListener((updated) => {
          const v = readEntitlement(updated);
          setIsPro(v.isPro);
          setExpiresAt(v.expiresAt);
          void cache({ ...v, checkedAt: new Date().toISOString() });
        });

        const offerings = await Purchases.getOfferings();
        if (!cancelled) setOffering(offerings.current ?? null);
      } catch {
        // Leave the cached entitlement in place rather than downgrading the user.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [unconfigured, cache]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const next = readEntitlement(customerInfo);
      setIsPro(next.isPro);
      setExpiresAt(next.expiresAt);
      void cache({ ...next, checkedAt: new Date().toISOString() });
      return { ok: next.isPro };
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err?.userCancelled) return { ok: false, cancelled: true };
      return { ok: false, error: err?.message ?? "Purchase failed." };
    }
  }, [cache]);

  const restore = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      const next = readEntitlement(info);
      setIsPro(next.isPro);
      setExpiresAt(next.expiresAt);
      void cache({ ...next, checkedAt: new Date().toISOString() });
      return { ok: next.isPro, error: next.isPro ? undefined : "No active subscription found." };
    } catch (e) {
      return { ok: false, error: (e as Error)?.message ?? "Could not restore purchases." };
    }
  }, [cache]);

  const value = useMemo<SubscriptionValue>(
    () => ({
      ready,
      isPro: isPro || (__DEV__ && devOverride),
      unconfigured,
      appUserId,
      offering,
      expiresAt,
      purchase,
      restore,
      devOverride,
      setDevOverride,
    }),
    [ready, isPro, devOverride, unconfigured, appUserId, offering, expiresAt, purchase, restore]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

/** Convenience for imperative checks before spending an API call. */
export function usePro() {
  return useSubscription().isPro;
}
