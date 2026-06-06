import { Stack } from "expo-router";
import { Colors } from "@/constants/adjl";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.navy },
      }}
    />
  );
}
