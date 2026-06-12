import { useMemo, useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { AppText } from "@/components/AppText";
import { Hero, StateRow } from "@/components/ui";
import { Colors, Fonts, Spacing } from "@/constants/adjl";
import { STATES, type State } from "@/data/states";

type SortMode = "alpha" | "price_asc" | "price_desc" | "hot";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "alpha", label: "A–Z" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "hot", label: "Hottest" },
];

const HOT_RANK: Record<State["inv"], number> = { hot: 3, good: 2, mod: 1, cau: 0 };
const priceNum = (p: string) => parseInt(p.replace(/\D/g, ""), 10) || 0;

export default function StatesScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>("alpha");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    const arr = STATES.filter(
      (s) => !q || `${s.name} ${s.abbr} ${s.driver}`.toLowerCase().includes(q)
    );
    const sorted = [...arr];
    if (sort === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "price_asc") sorted.sort((a, b) => priceNum(a.price) - priceNum(b.price));
    else if (sort === "price_desc") sorted.sort((a, b) => priceNum(b.price) - priceNum(a.price));
    else sorted.sort((a, b) => HOT_RANK[b.inv] - HOT_RANK[a.inv]);
    return sorted;
  }, [sort, query]);

  return (
    <TabScaffold>
      <Hero
        title="All 50 States."
        accent="Ranked & analyzed."
        subtitle="Median home price, average rent, growth, and an ADJL investment rating for every state. Tap any state for full AI analysis."
      />

      <View style={styles.fbar}>
        {SORTS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setSort(s.key)}
            style={[styles.chip, sort === s.key && styles.chipActive]}
          >
            <AppText
              variant="bodySemibold"
              style={[styles.chipText, sort === s.key && { color: Colors.gold }]}
            >
              {s.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search state…"
        placeholderTextColor="rgba(248,245,239,0.25)"
        style={styles.search}
      />
      <View style={{ height: 14 }} />

      {list.map((s) => (
        <StateRow key={s.abbr} state={s} onPress={() => router.push(`/state/${s.abbr}`)} />
      ))}
    </TabScaffold>
  );
}

const styles = StyleSheet.create({
  fbar: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginHorizontal: Spacing.xl },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: "rgba(201,168,76,0.07)" },
  chipText: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: Colors.muted },
  search: {
    marginHorizontal: Spacing.xl,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.cream,
    fontFamily: Fonts.body,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
});
