import { type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Spacing } from "@/constants/theme";

/**
 * Standard tab layout: title bar + scrolling body.
 * Pass `scroll={false}` when the screen renders its own FlatList.
 */
export function TabScaffold({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <Screen>
      <ScreenHeader title={title} subtitle={subtitle} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </Screen>
  );
}
