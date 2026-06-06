import { Tabs } from "expo-router";
import { type ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts } from "@/constants/adjl";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.navBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodySemibold,
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Top 20", tabBarIcon: tabIcon("trophy-outline") }}
      />
      <Tabs.Screen
        name="states"
        options={{ title: "States", tabBarIcon: tabIcon("map-outline") }}
      />
      <Tabs.Screen
        name="college"
        options={{ title: "College", tabBarIcon: tabIcon("school-outline") }}
      />
      <Tabs.Screen
        name="defense"
        options={{ title: "Defense", tabBarIcon: tabIcon("shield-outline") }}
      />
      <Tabs.Screen
        name="compare"
        options={{ title: "Compare", tabBarIcon: tabIcon("git-compare-outline") }}
      />
      <Tabs.Screen
        name="analyze"
        options={{ title: "Analyze", tabBarIcon: tabIcon("flash-outline") }}
      />
    </Tabs>
  );
}
