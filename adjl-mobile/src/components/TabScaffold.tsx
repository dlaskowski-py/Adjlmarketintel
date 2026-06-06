import { type ReactNode } from "react";
import { ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";

export function TabScaffold({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
