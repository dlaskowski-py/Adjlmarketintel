import { View, Linking, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { ListingCards, zillowUrl, redfinUrl } from "@/components/ListingCards";
import {
  Tag,
  TAG_COLORS,
  growthColor,
  ScoreBar,
  MetricBox,
  InfoSection,
  GoldButton,
  ActiveBadge,
} from "@/components/ui";
import { Colors } from "@/constants/adjl";
import { TOP20 } from "@/data/markets";
import { buildMarketPrompt } from "@/lib/prompts";

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const m = TOP20.find((x) => x.id === id);

  if (!m) {
    return (
      <DetailScaffold title="Market">
        <AppText variant="body" style={{ color: Colors.muted }}>
          Market not found.
        </AppText>
      </DetailScaffold>
    );
  }

  const [cityName, stateAbbr] = m.city.split(",").map((s) => s.trim());
  const prompt = buildMarketPrompt({
    city: m.city,
    driver: m.drv,
    median: m.median,
    rent: m.rent,
    growth: m.growth,
  });

  return (
    <DetailScaffold title={m.rank}>
      {m.active && (
        <View style={{ alignSelf: "flex-start", marginBottom: 10 }}>
          <ActiveBadge label="★ ADJL ACTIVE DEAL" />
        </View>
      )}

      {/* Header */}
      <View style={styles.hdr}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <AppText variant="display" style={styles.rank}>
            {m.rank}
          </AppText>
          <Tag label={m.tlbl} color={TAG_COLORS[m.tcls] ?? Colors.goldL} />
        </View>
        <AppText variant="display" style={styles.city}>
          {m.city}
        </AppText>
        <AppText variant="body" style={styles.drv}>
          {m.drv}
        </AppText>
        <View style={styles.scoreRow}>
          <View>
            <AppText variant="displayBold" style={styles.scoreBig}>
              {m.score}
            </AppText>
            <AppText variant="bodySemibold" style={styles.scoreLbl}>
              ADJL Score / 10
            </AppText>
          </View>
          <ScoreBar score={m.score} />
        </View>
      </View>

      {/* Metrics 2×2 */}
      <View style={styles.metrics}>
        <MetricBox value={m.median} label="Median Home Price" />
        <MetricBox value={m.rent} label="Avg Rent" badge={m.growth} badgeColor={growthColor(m.bc)} />
        <MetricBox value={m.vac} label="Vacancy" />
        <MetricBox value={m.perRoom} label="Per-Room Rate" />
      </View>

      <AISynopsis cacheKey={`market-${m.id}`} prompt={prompt} label="AI Growth Synopsis" />

      <InfoSection title="Why This Market" text={m.why} />
      <InfoSection title="ADJL Strategy" text={m.strat} kind="strategy" />
      <InfoSection title="Key Risk" text={m.risk} kind="risk" />

      <ListingCards city={cityName} state={stateAbbr || ""} />

      {/* Actions */}
      <View style={{ gap: 9, marginTop: 4 }}>
        <GoldButton
          label="⚡ Analyze a Property Here"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/analyze",
              params: { city: m.city, price: m.median.replace(/[^0-9]/g, "") },
            })
          }
        />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}>
            <GoldButton outline label="Zillow →" onPress={() => Linking.openURL(zillowUrl(m.city))} />
          </View>
          <View style={{ flex: 1 }}>
            <GoldButton outline label="Redfin →" onPress={() => Linking.openURL(redfinUrl(cityName))} />
          </View>
        </View>
      </View>
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  hdr: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 14, marginBottom: 14 },
  rank: { fontSize: 15, color: Colors.gold, opacity: 0.55 },
  city: { fontSize: 28, color: Colors.cream, marginBottom: 3 },
  drv: { fontSize: 12, color: Colors.goldL, opacity: 0.75, marginBottom: 12 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreBig: { fontSize: 38, lineHeight: 40, color: Colors.gold },
  scoreLbl: { fontSize: 8.5, letterSpacing: 1.4, textTransform: "uppercase", color: Colors.goldDim },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 },
});
