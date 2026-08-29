import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { SettingsProvider } from "@/context/settings";
import { SubscriptionProvider } from "@/context/subscription";
import { migrateLegacyStorage } from "@/lib/storage";

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);

  // One-shot move off the legacy storage namespace, before anything reads it.
  useEffect(() => {
    migrateLegacyStorage().finally(() => setMigrated(true));
  }, []);

  if (!migrated) return null;

  return (
    <SafeAreaProvider>
      <SubscriptionProvider>
        <SettingsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="market/[id]" />
            <Stack.Screen name="state/[abbr]" />
            <Stack.Screen name="account" options={{ presentation: "modal" }} />
            <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
          </Stack>
        </SettingsProvider>
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}
