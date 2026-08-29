import { useCallback, useState } from "react";
import { View, ScrollView, Pressable, Alert, TextInput, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/AppText";
import { Badge, Button, Card, EmptyState, Row, Stat } from "@/components/ui";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import {
  deleteDeal,
  getDeals,
  updateDeal,
  STATUS_OPTIONS,
  type DealStatus,
  type SavedDeal,
} from "@/lib/pipeline";

const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—");

const STATUS_TONE: Record<DealStatus, "neutral" | "accent" | "positive" | "negative"> = {
  Researching: "neutral",
  "Under Review": "accent",
  Active: "positive",
  Passed: "negative",
};

const verdictTone = (v: string) =>
  v.includes("BUY") ? "positive" : v.includes("CONDITIONAL") ? "warning" : "negative";

export default function SavedScreen() {
  const router = useRouter();
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      getDeals().then(setDeals);
    }, [])
  );

  async function cycleStatus(deal: SavedDeal) {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(deal.status) + 1) % STATUS_OPTIONS.length];
    setDeals((d) => d.map((x) => (x.id === deal.id ? { ...x, status: next } : x)));
    await updateDeal(deal.id, { status: next });
  }

  function confirmDelete(deal: SavedDeal) {
    Alert.alert("Delete analysis", `Remove ${deal.address}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDeal(deal.id);
          setDeals((d) => d.filter((x) => x.id !== deal.id));
        },
      },
    ]);
  }

  async function saveNote(deal: SavedDeal) {
    const value = notes[deal.id] ?? "";
    await updateDeal(deal.id, { notes: value });
    setDeals((d) => d.map((x) => (x.id === deal.id ? { ...x, notes: value } : x)));
    setNotes((n) => {
      const next = { ...n };
      delete next[deal.id];
      return next;
    });
  }

  const avgIrr = deals.length ? deals.reduce((s, d) => s + (d.irr || 0), 0) / deals.length : 0;
  const active = deals.filter((d) => d.status === "Active").length;

  return (
    <Screen>
      <ScreenHeader title="Saved" subtitle="Your analyses, stored on this device" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {deals.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            message="Run an analysis and save it here to compare properties side by side."
            action={<Button label="Analyze a property" onPress={() => router.push("/(tabs)/analyze")} />}
          />
        ) : (
          <>
            <Card style={styles.stats}>
              <Stat value={String(deals.length)} label="Saved" />
              <Stat value={`${avgIrr.toFixed(1)}%`} label="Avg IRR" />
              <Stat value={String(active)} label="Active" />
            </Card>

            <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
              {deals.map((deal) => {
                const open = expanded === deal.id;
                const solo = deal.results?.solo;
                return (
                  <Card key={deal.id} padded={false}>
                    <Pressable
                      onPress={() => setExpanded(open ? null : deal.id)}
                      style={styles.header}
                    >
                      <View style={{ flex: 1, gap: 6 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {deal.address}
                        </AppText>
                        <AppText variant="label" tone="secondary">
                          {money(deal.price)} · {deal.units} {deal.units === 1 ? "unit" : "units"} ·{" "}
                          {deal.irr.toFixed(1)}% IRR
                        </AppText>
                        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                          <Badge label={deal.verdict} tone={verdictTone(deal.verdict)} />
                          <Pressable onPress={() => cycleStatus(deal)} hitSlop={6}>
                            <Badge label={deal.status} tone={STATUS_TONE[deal.status]} />
                          </Pressable>
                        </View>
                      </View>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </Pressable>

                    {open && (
                      <View style={styles.body}>
                        {solo && (
                          <>
                            <Row label="NOI / yr" value={money(solo.noi)} />
                            <Row label="DSCR" value={`${solo.dscr.toFixed(2)}x`} />
                            <Row label="Cap rate" value={`${solo.capRate.toFixed(1)}%`} />
                            <Row label="Cash flow / yr" value={money(solo.perInvCF)} />
                            <Row label="Money multiple" value={`${solo.moic.toFixed(2)}x`} />
                          </>
                        )}

                        {deal.aiAnalysis ? (
                          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                            <AppText variant="caption" tone="muted">
                              AI ANALYSIS
                            </AppText>
                            <AppText variant="body" tone="secondary">
                              {deal.aiAnalysis}
                            </AppText>
                          </View>
                        ) : null}

                        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                          <AppText variant="caption" tone="muted">
                            NOTES
                          </AppText>
                          <TextInput
                            value={notes[deal.id] ?? deal.notes ?? ""}
                            onChangeText={(t) => setNotes((n) => ({ ...n, [deal.id]: t }))}
                            placeholder="Add a note…"
                            placeholderTextColor={Colors.textMuted}
                            multiline
                            style={styles.notes}
                          />
                          <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                            {notes[deal.id] !== undefined && (
                              <Button label="Save note" size="sm" onPress={() => saveNote(deal)} />
                            )}
                            <Button
                              label="Delete"
                              size="sm"
                              variant="danger"
                              onPress={() => confirmDelete(deal)}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", justifyContent: "space-between" },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.lg },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  notes: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSunken,
    padding: Spacing.md,
    minHeight: 64,
    textAlignVertical: "top",
    color: Colors.text,
    ...Type.body,
  },
});
