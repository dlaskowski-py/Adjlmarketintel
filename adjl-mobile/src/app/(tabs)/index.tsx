import { useMemo, useState } from "react";
import { View, FlatList, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/AppText";
import { Badge, Segmented, EmptyState } from "@/components/ui";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { TOP20, type Market } from "@/data/markets";
import { STATES, type State } from "@/data/states";

type Scope = "markets" | "states";

const CATEGORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "college", label: "College" },
  { key: "military", label: "Military" },
  { key: "tech", label: "Tech" },
  { key: "defense", label: "Defense" },
];

const INV_TONE: Record<State["inv"], "positive" | "accent" | "neutral" | "negative"> = {
  hot: "positive",
  good: "accent",
  mod: "neutral",
  cau: "negative",
};

const growthTone = (bc: Market["bc"]) =>
  bc === "bu" ? "positive" : bc === "bd" ? "negative" : "secondary";

function MarketCard({ market: m, onPress }: { market: Market; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{m.city}</AppText>
          <AppText variant="label" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {m.drv}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <AppText variant="numeric">{m.score.toFixed(1)}</AppText>
          <AppText variant="caption" tone="muted">
            SCORE
          </AppText>
        </View>
      </View>
      <View style={styles.cardMetrics}>
        <AppText variant="label" tone="secondary">
          {m.median} median
        </AppText>
        <AppText variant="label" tone="muted">
          ·
        </AppText>
        <AppText variant="label" tone="secondary">
          {m.rent}
        </AppText>
        <AppText variant="label" tone={growthTone(m.bc)}>
          {m.growth}
        </AppText>
      </View>
    </Pressable>
  );
}

function StateCard({ state: s, onPress }: { state: State; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={styles.abbr}>
          <AppText variant="label">{s.abbr}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{s.name}</AppText>
          <AppText variant="label" tone="secondary" style={{ marginTop: 2 }}>
            {s.price} median · {s.rent}/mo
          </AppText>
        </View>
        <Badge label={s.invL} tone={INV_TONE[s.inv]} />
      </View>
    </Pressable>
  );
}

export default function MarketsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("markets");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const markets = useMemo(() => {
    const q = query.toLowerCase().trim();
    return TOP20.filter((m) => {
      if (category !== "all" && !m.cat.includes(category)) return false;
      return !q || `${m.city} ${m.drv} ${m.cat}`.toLowerCase().includes(q);
    });
  }, [category, query]);

  const states = useMemo(() => {
    const q = query.toLowerCase().trim();
    return STATES.filter(
      (s) => !q || `${s.name} ${s.abbr} ${s.driver}`.toLowerCase().includes(q)
    );
  }, [query]);

  const showingMarkets = scope === "markets";
  const count = showingMarkets ? markets.length : states.length;

  return (
    <Screen>
      <ScreenHeader
        title="Markets"
        subtitle={`${TOP20.length} researched markets · all 50 states`}
      />

      <View style={styles.controls}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "markets", label: "Markets" },
            { value: "states", label: "States" },
          ]}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={showingMarkets ? "Search markets" : "Search states"}
          placeholderTextColor={Colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {showingMarkets && (
          <View style={styles.chips}>
            {CATEGORY_FILTERS.map((f) => {
              const active = category === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setCategory(f.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <AppText variant="label" tone={active ? "inverse" : "secondary"}>
                    {f.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {count === 0 ? (
        <EmptyState
          title="Nothing matches"
          message={`No ${showingMarkets ? "markets" : "states"} match “${query}”.`}
        />
      ) : showingMarkets ? (
        <FlatList
          data={markets}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MarketCard market={item} onPress={() => router.push(`/market/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <FlatList
          data={states}
          keyExtractor={(s) => s.abbr}
          renderItem={({ item }) => (
            <StateCard state={item} onPress={() => router.push(`/state/${item.abbr}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.md },
  search: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSunken,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    ...Type.body,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bgSubtle,
  },
  chipActive: { backgroundColor: Colors.primary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 120, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pressed: { opacity: 0.6 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  cardMetrics: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flexWrap: "wrap" },
  abbr: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
});
