import { View, Linking, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { Paywalled } from "@/components/Paywalled";
import { Badge, Button, Card, EmptyState, Row, Section } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { TOP20 } from "@/data/markets";
import { buildMarketPrompt } from "@/lib/prompts";

const zillowUrl = (city: string) =>
  `https://www.zillow.com/homes/for_sale/${encodeURIComponent(city)}_rb/?price=0-500000&beds=2-&homeTypes=multi-family`;

export default function MarketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const market = TOP20.find((m) => m.id === id);

  if (!market) {
    return (
      <DetailScaffold title="Market">
        <EmptyState title="Not found" message="That market is no longer available." />
      </DetailScaffold>
    );
  }

  const growthTone = market.bc === "bu" ? "positive" : market.bc === "bd" ? "negative" : "neutral";

  return (
    <DetailScaffold title={market.city}>
      <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
        <AppText variant="display">{market.city}</AppText>
        <AppText variant="body" tone="secondary">
          {market.drv}
        </AppText>
        <View style={styles.badges}>
          <Badge label={market.tlbl} tone="accent" />
          <Badge label={`Score ${market.score.toFixed(1)}`} tone="neutral" />
          <Badge label={market.growth} tone={growthTone} />
        </View>
      </View>

      <Section title="Fundamentals">
        <Card padded={false} style={{ paddingHorizontal: Spacing.lg }}>
          <Row label="Median price" value={market.median} />
          <Row label="Average rent" value={market.rent} />
          <Row label="Vacancy" value={market.vac} />
          <Row label="Per-room rate" value={market.perRoom} />
        </Card>
      </Section>

      <Section title="Why this market">
        <Card>
          <AppText variant="body" tone="secondary">
            {market.why}
          </AppText>
        </Card>
      </Section>

      <Section title="Strategy">
        <Card>
          <AppText variant="body" tone="secondary">
            {market.strat}
          </AppText>
        </Card>
      </Section>

      <Section title="Key risk">
        <Card>
          <AppText variant="body" tone="secondary">
            {market.risk}
          </AppText>
        </Card>
      </Section>

      <Section title="AI outlook">
        <Paywalled
          title="AI market outlook"
          message="A written read on what's driving this market and where it goes over 3–5 years."
        >
          <AISynopsis
            cacheKey={`market-${market.id}`}
            prompt={buildMarketPrompt({
              city: market.city,
              driver: market.drv,
              median: market.median,
              rent: market.rent,
              growth: market.growth,
            })}
          />
        </Paywalled>
      </Section>

      <View style={{ gap: Spacing.md }}>
        <Button
          label="Analyze a property here"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/analyze",
              params: { city: market.city, price: market.median.replace(/[^0-9]/g, "") },
            })
          }
        />
        <Button
          label="Browse listings on Zillow"
          variant="secondary"
          onPress={() => Linking.openURL(zillowUrl(market.city))}
        />
      </View>
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.sm },
});
