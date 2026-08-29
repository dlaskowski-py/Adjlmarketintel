import { Tabs } from "expo-router";
import { type ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Type } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { ...Type.caption, letterSpacing: 0.2, textTransform: "none" },
      }}
    >
      {/* Markets is first and entirely free — a cold-start user should never
          land on a permission prompt or a paywall. */}
      <Tabs.Screen name="index" options={{ title: "Markets", tabBarIcon: icon("compass-outline") }} />
      <Tabs.Screen name="nearby" options={{ title: "Nearby", tabBarIcon: icon("location-outline") }} />
      <Tabs.Screen name="analyze" options={{ title: "Analyze", tabBarIcon: icon("calculator-outline") }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: icon("bookmark-outline") }} />
    </Tabs>
  );
}
