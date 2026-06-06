import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from "@expo-google-fonts/barlow";
import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
} from "@expo-google-fonts/barlow-condensed";

import { Colors } from "@/constants/adjl";
import { AuthProvider, useAuth } from "@/context/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator fontsLoaded={fontsLoaded} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const ready = fontsLoaded && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [ready, user, segments, router]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.navy },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
