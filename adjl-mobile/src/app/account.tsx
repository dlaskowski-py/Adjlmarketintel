import { useState } from "react";
import { View, Linking, Switch, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { Badge, Button, Card, Field, Section } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { Spacing } from "@/constants/theme";
import { useSettings } from "@/context/settings";
import { useSubscription } from "@/context/subscription";

const MANAGE_URL = "itms-apps://apps.apple.com/account/subscriptions";

export default function AccountScreen() {
  const router = useRouter();
  const { isPro, expiresAt, restore, devOverride, setDevOverride, unconfigured } = useSubscription();
  const { anthropicKey, rentcastKey, setAnthropicKey, setRentcastKey } = useSettings();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [anthropicDraft, setAnthropicDraft] = useState("");
  const [rentcastDraft, setRentcastDraft] = useState("");
  const [note, setNote] = useState("");

  async function saveKeys() {
    if (anthropicDraft.trim()) await setAnthropicKey(anthropicDraft.trim());
    if (rentcastDraft.trim()) await setRentcastKey(rentcastDraft.trim());
    setAnthropicDraft("");
    setRentcastDraft("");
    setNote("Saved to this device's keychain.");
  }

  return (
    <DetailScaffold title="Account" onClose={() => router.back()}>
      <Section title="Subscription">
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.statusRow}>
            <AppText variant="heading">{isPro ? "Subscribed" : "Free"}</AppText>
            <Badge label={isPro ? "Active" : "Limited"} tone={isPro ? "positive" : "neutral"} />
          </View>
          <AppText variant="body" tone="secondary">
            {isPro
              ? expiresAt
                ? `Renews ${new Date(expiresAt).toLocaleDateString()}.`
                : "Your subscription is active."
              : "Browsing market research is free. Subscribe to unlock nearby listings, underwriting and AI reviews."}
          </AppText>

          {isPro ? (
            <Button
              label="Manage subscription"
              variant="secondary"
              onPress={() => Linking.openURL(MANAGE_URL)}
            />
          ) : (
            <Button label="See plans" onPress={() => router.push("/paywall")} />
          )}
          <Button label="Restore purchases" variant="ghost" size="sm" onPress={() => restore()} />
        </Card>
      </Section>

      {__DEV__ && (
        <Section title="Developer">
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.statusRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">Simulate subscription</AppText>
                <AppText variant="label" tone="muted">
                  {unconfigured
                    ? "Billing isn't configured — use this to preview paid features."
                    : "Preview paid features without purchasing."}
                </AppText>
              </View>
              <Switch value={devOverride} onValueChange={setDevOverride} />
            </View>
          </Card>
        </Section>
      )}

      <Section
        title="Data connections"
        action={
          <AppText
            variant="label"
            tone="accent"
            onPress={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide" : "Show"}
          </AppText>
        }
      >
        {showAdvanced ? (
          <Card style={{ gap: Spacing.lg }}>
            <AppText variant="body" tone="secondary">
              Live listings and AI reviews are served through {Brand.name}. These optional keys let
              this build talk to the data providers directly instead.
            </AppText>
            <Field
              label="AI key"
              value={anthropicDraft}
              onChangeText={setAnthropicDraft}
              placeholder={anthropicKey ? "Saved" : "Not set"}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Field
              label="Property data key"
              value={rentcastDraft}
              onChangeText={setRentcastDraft}
              placeholder={rentcastKey ? "Saved" : "Not set"}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Button label="Save" variant="secondary" onPress={saveKeys} />
            {note ? (
              <AppText variant="label" tone="secondary">
                {note}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </Section>

      <Section title="About">
        <Card style={{ gap: Spacing.sm }}>
          <AppText variant="body" tone="secondary">
            {Brand.researchCredit}. Market and state figures are research estimates as of 2026 and
            are not a substitute for your own diligence.
          </AppText>
          <View style={{ flexDirection: "row", gap: Spacing.lg, marginTop: Spacing.sm }}>
            <AppText variant="label" tone="accent" onPress={() => Linking.openURL(Brand.termsUrl)}>
              Terms
            </AppText>
            <AppText variant="label" tone="accent" onPress={() => Linking.openURL(Brand.privacyUrl)}>
              Privacy
            </AppText>
            <AppText
              variant="label"
              tone="accent"
              onPress={() => Linking.openURL(`mailto:${Brand.supportEmail}`)}
            >
              Support
            </AppText>
          </View>
          <AppText variant="label" tone="muted" style={{ marginTop: Spacing.sm }}>
            {Brand.legal} · v{Constants.expoConfig?.version ?? "1.0.0"}
          </AppText>
        </Card>
      </Section>
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
});
