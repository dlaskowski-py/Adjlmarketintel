import { type ReactNode } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { Button, Card } from "@/components/ui";
import { Colors, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/subscription";

/**
 * Feature-level gate. Deliberately NOT a router redirect — replacing the route
 * fights the back stack and hides what the user would be buying. This keeps the
 * surrounding screen intact and shows an inline upsell in place of the feature.
 */
export function Paywalled({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  const { isPro } = useSubscription();
  const router = useRouter();

  if (isPro) return <>{children}</>;

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
        <Ionicons name="lock-closed" size={15} color={Colors.textSecondary} />
        <AppText variant="heading">{title}</AppText>
      </View>
      <AppText variant="body" tone="secondary">
        {message}
      </AppText>
      <Button label="See plans" onPress={() => router.push("/paywall")} size="sm" />
    </Card>
  );
}
