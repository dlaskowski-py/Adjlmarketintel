import { useState } from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { Button, Card } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/subscription";

const BENEFITS = [
  { icon: "location", text: "Homes for sale near you, ranked by distance" },
  { icon: "calculator", text: "Full underwriting — IRR, DSCR, cap rate, cash flow" },
  { icon: "layers", text: "Itemized expenses labelled actual, modeled or assumed" },
  { icon: "sparkles", text: "AI market and property reviews" },
  { icon: "bookmark", text: "Unlimited saved analyses" },
] as const;

export default function PaywallScreen() {
  const router = useRouter();
  const { offering, purchase, restore, isPro, unconfigured } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const packages = offering?.availablePackages ?? [];

  async function buy(pkg: PurchasesPackage) {
    setBusy(true);
    setMessage("");
    const res = await purchase(pkg);
    setBusy(false);
    if (res.ok) return router.back();
    if (!res.cancelled && res.error) setMessage(res.error);
  }

  async function handleRestore() {
    setBusy(true);
    setMessage("");
    const res = await restore();
    setBusy(false);
    if (res.ok) return router.back();
    setMessage(res.error ?? "No active subscription found.");
  }

  return (
    <DetailScaffold onClose={() => router.back()}>
      <View style={{ gap: Spacing.xl }}>
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="display">{Brand.subscriptionPitch}</AppText>
          <AppText variant="body" tone="secondary">
            {Brand.name} turns any listing into a defensible underwrite in seconds.
          </AppText>
        </View>

        <Card style={{ gap: Spacing.lg }}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.icon}>
                <Ionicons name={b.icon} size={15} color={Colors.text} />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {b.text}
              </AppText>
            </View>
          ))}
        </Card>

        {isPro ? (
          <Card>
            <AppText variant="bodyStrong">You're subscribed</AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: 4 }}>
              Everything is unlocked. Thanks for supporting {Brand.name}.
            </AppText>
          </Card>
        ) : packages.length > 0 ? (
          <View style={{ gap: Spacing.md }}>
            {packages.map((pkg) => (
              <Button
                key={pkg.identifier}
                label={`Subscribe — ${pkg.product.priceString}`}
                onPress={() => buy(pkg)}
                loading={busy}
              />
            ))}
          </View>
        ) : (
          <Card style={{ gap: Spacing.sm }}>
            <AppText variant="bodyStrong">Plans aren't available yet</AppText>
            <AppText variant="body" tone="secondary">
              {unconfigured
                ? "Billing isn't configured in this build."
                : "Subscription products are still being set up. Please check back shortly."}
            </AppText>
          </Card>
        )}

        {message ? (
          <AppText variant="label" tone="negative">
            {message}
          </AppText>
        ) : null}

        <Button label="Restore purchases" variant="ghost" onPress={handleRestore} disabled={busy} />

        {/* Auto-renew disclosure and policy links are required for
            auto-renewable subscriptions — omitting either is a rejection. */}
        <View style={{ gap: Spacing.md }}>
          <AppText variant="label" tone="muted" style={{ lineHeight: 17 }}>
            Subscriptions renew automatically unless cancelled at least 24 hours before the end of
            the current period. Manage or cancel any time in your Apple ID settings.
          </AppText>
          <View style={styles.links}>
            <Pressable onPress={() => Linking.openURL(Brand.termsUrl)}>
              <AppText variant="label" tone="accent">
                Terms of Use
              </AppText>
            </Pressable>
            <AppText variant="label" tone="muted">
              ·
            </AppText>
            <Pressable onPress={() => Linking.openURL(Brand.privacyUrl)}>
              <AppText variant="label" tone="accent">
                Privacy Policy
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  benefit: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  icon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  links: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
});
