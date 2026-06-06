import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/adjl";

// Navy background + top safe-area wrapper. Bottom inset is handled by the tab bar.
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Subtle gold radial-ish accents echoing the web .bg layer */}
      <View pointerEvents="none" style={styles.accentTop} />
      <View pointerEvents="none" style={styles.accentBottom} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navy },
  safe: { flex: 1 },
  accentTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "rgba(201,168,76,0.05)",
  },
  accentBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: "rgba(201,168,76,0.035)",
  },
});
