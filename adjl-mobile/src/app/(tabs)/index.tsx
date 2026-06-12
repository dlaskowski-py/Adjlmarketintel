import { useMemo, useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { AppText } from "@/components/AppText";
import { Hero, StatBar, SectionHeader, MarketRow } from "@/components/ui";
import { Colors, Fonts, Spacing } from "@/constants/adjl";
import { TOP20 } from "@/data/markets";

const STATS = [
  { value: "50", label: "States Covered" },
  { value: "20", label: "Curated Markets" },
  { value: "$175K", label: "Lowest Entry" },
  { value: "$835K", label: "Highest (HI)" },
  { value: "$355K", label: "National Avg" },
  { value: "2026", label: "Live Data" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "college", label: "College" },
  { key: "military", label: "Military" },
  { key: "tech", label: "Tech" },
  { key: "defense", label: "Defense" },
];

export default function Top20Screen() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return TOP20.filter((m) => {
      if (filter !== "all" && !m.cat.includes(filter)) return false;
      if (q && !`${m.city} ${m.drv} ${m.cat}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filter, query]);

  const college = filtered.filter((m) => m.cat.includes("college"));
  const defense = filtered.filter((m) => !m.cat.includes("college"));

  return (
    <TabScaffold>
      <Hero
        title="70 Markets."
        accent="Tap any to explore."
        subtitle="All 50 states + 20 curated markets. Tap any row for an AI growth synopsis, pricing, and ADJL strategy. June 2026."
      />
      <StatBar stats={STATS} />

      {/* Filter chips + search */}
      <View style={styles.fbar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <AppText
              variant="bodySemibold"
              style={[styles.chipText, filter === f.key && { color: Colors.gold }]}
            >
              {f.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search markets…"
        placeholderTextColor="rgba(248,245,239,0.25)"
        style={styles.search}
      />

      {college.length > 0 && (
        <>
          <SectionHeader title="College Town Markets" count={`${college.length} Markets`} />
          {college.map((m) => (
            <MarketRow key={m.id} market={m} onPress={() => router.push(`/market/${m.id}`)} />
          ))}
        </>
      )}

      {defense.length > 0 && (
        <>
          <SectionHeader title="Defense & Tech Boom Markets" count={`${defense.length} Markets`} />
          {defense.map((m) => (
            <MarketRow key={m.id} market={m} onPress={() => router.push(`/market/${m.id}`)} />
          ))}
        </>
      )}
    </TabScaffold>
  );
}

const styles = StyleSheet.create({
  fbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
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
