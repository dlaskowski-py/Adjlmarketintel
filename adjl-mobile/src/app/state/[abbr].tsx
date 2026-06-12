import { View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { Tag, INV_COLORS, MetricBox, InfoSection, ActiveBadge } from "@/components/ui";
import { Colors } from "@/constants/adjl";
import { STATES } from "@/data/states";
import { buildStatePrompt } from "@/lib/prompts";

export default function StateDetailScreen() {
  const { abbr } = useLocalSearchParams<{ abbr: string }>();
  const s = STATES.find((x) => x.abbr === abbr);

  if (!s) {
    return (
      <DetailScaffold title="State">
        <AppText variant="body" style={{ color: Colors.muted }}>
          State not found.
        </AppText>
      </DetailScaffold>
    );
  }

  const prompt = buildStatePrompt({ name: s.name, price: s.price, rent: s.rent });

  return (
    <DetailScaffold title={s.abbr}>
      <View style={styles.hdr}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 6, flexWrap: "wrap" }}>
          <AppText variant="displayBold" style={styles.abbr}>
            {s.abbr}
          </AppText>
          <Tag label={`${s.invL} Market`} color={INV_COLORS[s.inv]} />
          {s.active && <ActiveBadge label="★ ADJL ACTIVE DEAL — ATLANTA" />}
        </View>
        <AppText variant="display" style={styles.name}>
          {s.name}
        </AppText>
        <AppText variant="body" style={styles.driver}>
          {s.driver}
        </AppText>
      </View>

      <View style={styles.metrics}>
        <MetricBox value={s.price} label="Median Home Price" />
        <MetricBox value={`${s.rent}/mo`} label="Avg Rent" badge={s.growth} badgeColor={Colors.greenBright} />
      </View>

      <AISynopsis cacheKey={`state-${s.abbr}`} prompt={prompt} label="AI Market Analysis" />

      <InfoSection title="Market Overview" text={s.note} />
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  hdr: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 14, marginBottom: 14 },
  abbr: { fontSize: 34, lineHeight: 36, color: Colors.gold },
  name: { fontSize: 28, color: Colors.cream, marginBottom: 3 },
  driver: { fontSize: 12, lineHeight: 18, color: Colors.goldL, opacity: 0.75 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 },
});
