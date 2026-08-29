import { type ReactNode } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/theme";

/** Pushed-screen wrapper: back control + title, scrolling body. */
export function DetailScaffold({
  title,
  children,
  onClose,
}: {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable
          onPress={onClose ?? (() => router.back())}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Ionicons
            name={onClose ? "close" : "chevron-back"}
            size={24}
            color={Colors.text}
          />
        </Pressable>
        {title ? (
          <AppText variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </AppText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
});
