/**
 * Storage keys + one-shot migration off the legacy `adjl_*` namespace.
 *
 * Renaming keys without migrating would silently orphan users' saved analyses,
 * so this runs once at launch before first paint.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const StorageKeys = {
  deals: "roofline.deals.v1",
  migrated: "roofline.migrated.v1",
  entitlement: "roofline.entitlement.v1",
  keyAnthropic: "roofline_key_anthropic",
  keyRentcast: "roofline_key_rentcast",
} as const;

const LEGACY = {
  deals: "adjl_pipeline_deals",
  session: "adjl_session",
  keyAnthropic: "adjl_key_anthropic",
  keyRentcast: "adjl_key_rentcast",
} as const;

/**
 * Idempotent and best-effort — a failed migration must never block launch.
 * Carries saved deals across, moves API keys to the new namespace, and drops
 * the dead login session.
 */
export async function migrateLegacyStorage(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(StorageKeys.migrated)) return;

    // Saved deals — real user data, must survive.
    const existing = await AsyncStorage.getItem(StorageKeys.deals);
    if (!existing) {
      const legacyDeals = await AsyncStorage.getItem(LEGACY.deals);
      if (legacyDeals) {
        await AsyncStorage.setItem(StorageKeys.deals, legacyDeals);
        await AsyncStorage.removeItem(LEGACY.deals);
      }
    }

    // API keys — move rather than orphan third-party credentials in the keychain.
    for (const [from, to] of [
      [LEGACY.keyAnthropic, StorageKeys.keyAnthropic],
      [LEGACY.keyRentcast, StorageKeys.keyRentcast],
    ] as const) {
      try {
        const value = await SecureStore.getItemAsync(from);
        if (value) {
          await SecureStore.setItemAsync(to, value);
          await SecureStore.deleteItemAsync(from);
        }
      } catch {
        // keychain unavailable — skip
      }
    }

    // Dead login session from the removed auth gate.
    try {
      await SecureStore.deleteItemAsync(LEGACY.session);
    } catch {
      // ignore
    }

    await AsyncStorage.setItem(StorageKeys.migrated, "1");
  } catch {
    // Never block launch on a migration failure.
  }
}
