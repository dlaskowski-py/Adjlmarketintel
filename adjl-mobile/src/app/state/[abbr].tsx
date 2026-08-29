import { View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { Paywalled } from "@/components/Paywalled";
import { Badge, Card, EmptyState, Row, Section } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { STATES, type State } from "@/data/states";
import { buildStatePrompt } from "@/lib/prompts";

const INV_TONE: Record<State["inv"], "positive" | "accent" | "neutral" | "negative"> = {
  hot: "positive",
  good: "accent",
  mod: "neutral",
  cau: "negative",
};

export default function StateDetail() {
  const { abbr } = useLocalSearchParams<{ abbr: string }>();
  const state = STATES.find((s) => s.abbr === abbr);

  if (!state) {
    return (
      <DetailScaffold title="State">
        <EmptyState title="Not found" message="That state is no longer available." />
      </DetailScaffold>
    );
  }

  return (
    <DetailScaffold title={state.name}>
      <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
        <AppText variant="display">{state.name}</AppText>
        <AppText variant="body" tone="secondary">
          {state.driver}
        </AppText>
        <View style={styles.badges}>
          <Badge label={`${state.invL} market`} tone={INV_TONE[state.inv]} />
          <Badge label={state.growth} tone="positive" />
        </View>
      </View>

      <Section title="Fundamentals">
        <Card padded={false} style={{ paddingHorizontal: Spacing.lg }}>
          <Row label="Median price" value={state.price} />
          <Row label="Average rent" value={`${state.rent}/mo`} />
          <Row label="Rent growth" value={state.growth} />
        </Card>
      </Section>

      <Section title="Overview">
        <Card>
          <AppText variant="body" tone="secondary">
            {state.note}
          </AppText>
        </Card>
      </Section>

      <Section title="AI outlook">
        <Paywalled
          title="AI state analysis"
          message="Where this state's demand is coming from, which cities to target, and the main risks."
        >
          <AISynopsis
            cacheKey={`state-${state.abbr}`}
            prompt={buildStatePrompt({ name: state.name, price: state.price, rent: state.rent })}
          />
        </Paywalled>
      </Section>
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.sm },
});
