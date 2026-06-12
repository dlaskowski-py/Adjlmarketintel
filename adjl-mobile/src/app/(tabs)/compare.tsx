import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { AppText } from "@/components/AppText";
import { Hero, Tag, TAG_COLORS, INV_COLORS, growthColor } from "@/components/ui";
import { Colors, Spacing } from "@/constants/adjl";
import { TOP20 } from "@/data/markets";
import { STATES } from "@/data/states";

export default function CompareScreen() {
  const router = useRouter();

  return (
    <TabScaffold>
      <Hero
        title="All 70 Markets."
        accent="Side by side."
        subtitle="The 20 curated markets and all 50 states in one comparable list — price, rent, growth, score. Tap any row to open it."
      />

      {TOP20.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => router.push(`/market/${m.id}`)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <AppText variant="displayBold" style={styles.id}>
            {m.rank}
          </AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySemibold" style={styles.name} numberOfLines={1}>
              {m.city}
            </AppText>
            <AppText variant="body" style={styles.sub}>
              {m.median} · {m.rent} ·{" "}
              <AppText variant="bodySemibold" style={{ fontSize: 11, color: growthColor(m.bc) }}>
                {m.growth}
              </AppText>
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <AppText variant="display" style={styles.score}>
              {m.score}
            </AppText>
            <Tag label={m.tlbl} color={TAG_COLORS[m.tcls] ?? Colors.goldL} />
          </View>
        </Pressable>
      ))}

      <View style={styles.divider}>
        <AppText variant="bodyBold" style={styles.dividerText}>
          — ALL 50 STATES —
        </AppText>
      </View>

      {STATES.map((s) => (
        <Pressable
          key={s.abbr}
          onPress={() => router.push(`/state/${s.abbr}`)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <AppText variant="displayBold" style={styles.id}>
            {s.abbr}
          </AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySemibold" style={styles.name} numberOfLines={1}>
              {s.name}
            </AppText>
            <AppText variant="body" style={styles.sub}>
              {s.price} · {s.rent}/mo ·{" "}
              <AppText variant="bodySemibold" style={{ fontSize: 11, color: Colors.greenBright }}>
                {s.growth}
              </AppText>
            </AppText>
          </View>
          <Tag label={s.invL} color={INV_COLORS[s.inv]} />
        </Pressable>
      ))}
    </TabScaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Spacing.xl,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.08)",
    backgroundColor: "rgba(15,26,46,0.5)",
  },
  pressed: { backgroundColor: "rgba(27,43,75,0.7)", borderColor: "rgba(201,168,76,0.3)" },
  id: { fontSize: 14, color: Colors.gold, width: 44 },
  name: { fontSize: 14, color: Colors.cream },
  sub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  score: { fontSize: 18, color: Colors.gold },
  divider: {
    marginHorizontal: Spacing.xl,
    marginVertical: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(201,168,76,0.05)",
    alignItems: "center",
  },
  dividerText: { fontSize: 10, letterSpacing: 2, color: Colors.gold },
});
