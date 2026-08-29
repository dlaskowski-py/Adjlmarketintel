import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/theme";

/**
 * Screen title bar. Account/settings lives here rather than eating a tab slot.
 */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <View style={{ flex: 1 }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="label" tone="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Pressable
        onPress={() => router.push("/account")}
        hitSlop={10}
        accessibilityLabel="Account and settings"
        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
      >
        <Ionicons name="person-circle-outline" size={26} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconBtn: { padding: 2 },
});
