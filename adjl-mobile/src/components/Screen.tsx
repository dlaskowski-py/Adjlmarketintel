import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/theme";

/** Plain light background + top safe area. The tab bar owns the bottom inset. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
});
