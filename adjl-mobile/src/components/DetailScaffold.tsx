import { type ReactNode } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/adjl";

// Pushed-screen wrapper: back chevron + screen title, scrollable body.
export function DetailScaffold({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={Colors.gold} />
          <AppText variant="bodySemibold" style={styles.backText}>
            Back
          </AppText>
        </Pressable>
        <AppText variant="bodyBold" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <View style={{ width: 64 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { flexDirection: "row", alignItems: "center", width: 64 },
  backText: { fontSize: 12, color: Colors.gold },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.goldDim,
  },
});
