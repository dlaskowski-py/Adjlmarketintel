import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export interface Partner {
  email: string;
  name: string;
}

// The three ADJL Capital partners.
const PARTNERS: Partner[] = [
  { email: "daniel@adjlcapital.com", name: "Daniel Laskowski" },
  { email: "andrew@adjlcapital.com", name: "Andrew Jongeneel" },
  { email: "james@adjlcapital.com", name: "James Harvey" },
];

const SESSION_KEY = "adjl_session";

interface AuthContextValue {
  user: Partner | null;
  loading: boolean; // restoring persisted session
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a persisted session on launch.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw) as Partner);
      } catch {
        // ignore corrupt/missing session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    if (!password.trim()) {
      return { ok: false, error: "Enter your password." };
    }
    // Partners get their named accounts; anyone else (e.g. investors using
    // the demo) signs in as a guest. Auth is on-device only — there is no
    // backend and no sensitive data behind this gate.
    const partner = PARTNERS.find((p) => p.email === normalized);
    const local = normalized.split("@")[0];
    const guestName = local.charAt(0).toUpperCase() + local.slice(1);
    const account: Partner = partner ?? { email: normalized, name: `${guestName} (Guest)` };
    setUser(account);
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(account));
    } catch {
      // non-fatal: session just won't persist across launches
    }
    return { ok: true };
  }

  async function signOut() {
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { PARTNERS };
