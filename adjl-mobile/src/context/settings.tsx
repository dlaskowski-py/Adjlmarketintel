import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { StorageKeys } from "@/lib/storage";

// API keys are entered manually in the in-app Settings screen and stored in
// the iOS keychain (SecureStore). Nothing is hardcoded or shipped in the binary.
const STORE_KEYS = {
  anthropic: StorageKeys.keyAnthropic,
  rentcast: StorageKeys.keyRentcast,
} as const;

interface SettingsContextValue {
  loaded: boolean;
  anthropicKey: string;
  rentcastKey: string;
  setAnthropicKey: (key: string) => Promise<void>;
  setRentcastKey: (key: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [anthropicKey, setAnthropic] = useState("");
  const [rentcastKey, setRentcast] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [a, r] = await Promise.all([
          SecureStore.getItemAsync(STORE_KEYS.anthropic),
          SecureStore.getItemAsync(STORE_KEYS.rentcast),
        ]);
        if (a) setAnthropic(a);
        if (r) setRentcast(r);
      } catch {
        // keychain unavailable — keys just won't persist
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function setAnthropicKey(key: string) {
    const trimmed = key.trim();
    setAnthropic(trimmed);
    try {
      if (trimmed) await SecureStore.setItemAsync(STORE_KEYS.anthropic, trimmed);
      else await SecureStore.deleteItemAsync(STORE_KEYS.anthropic);
    } catch {}
  }

  async function setRentcastKey(key: string) {
    const trimmed = key.trim();
    setRentcast(trimmed);
    try {
      if (trimmed) await SecureStore.setItemAsync(STORE_KEYS.rentcast, trimmed);
      else await SecureStore.deleteItemAsync(STORE_KEYS.rentcast);
    } catch {}
  }

  return (
    <SettingsContext.Provider
      value={{ loaded, anthropicKey, rentcastKey, setAnthropicKey, setRentcastKey }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
