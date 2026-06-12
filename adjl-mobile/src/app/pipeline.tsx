import { useCallback, useState } from "react";
import { View, Pressable, TextInput, Alert, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DetailScaffold } from "@/components/DetailScaffold";
import { AppText } from "@/components/AppText";
import { GoldButton } from "@/components/ui";
import { Colors, Fonts } from "@/constants/adjl";
import {
  getDeals,
  updateDeal,
  deleteDeal,
  STATUS_OPTIONS,
  type SavedDeal,
  type DealStatus,
} from "@/lib/pipeline";

const STATUS_COLORS: Record<DealStatus, string> = {
  Researching: Colors.gold,
  "Under Review": Colors.blue,
  Active: Colors.greenBright,
  Passed: Colors.redBright,
};

const VERDICT_COLORS: Record<string, string> = {
  "STRONG BUY": Colors.greenBright,
  CONDITIONAL: Colors.goldL,
  PASS: Colors.redBright,
};

const fmt = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—");

export default function PipelineScreen() {
  const router = useRouter();
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      getDeals().then(setDeals);
    }, [])
  );

  async function cycleStatus(deal: SavedDeal) {
    const idx = STATUS_OPTIONS.indexOf(deal.status);
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];
    await updateDeal(deal.id, { status: next });
    setDeals((d) => d.map((x) => (x.id === deal.id ? { ...x, status: next } : x)));
  }

  function confirmDelete(deal: SavedDeal) {
    Alert.alert("Delete deal", `Remove ${deal.address} from the pipeline?`, [
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
    const notes = noteDrafts[deal.id] ?? "";
    await updateDeal(deal.id, { notes });
    setDeals((d) => d.map((x) => (x.id === deal.id ? { ...x, notes } : x)));
    setNoteDrafts((prev) => {
      const n = { ...prev };
      delete n[deal.id];
      return n;
    });
  }

  const total = deals.length;
  const avgIrr = total ? deals.reduce((s, d) => s + (d.irr || 0), 0) / total : 0;
  const active = deals.filter((d) => d.status === "Active").length;
  const passed = deals.filter((d) => d.status === "Passed").length;

  return (
    <DetailScaffold title="Deal Pipeline">
      {total === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 60 }}>
          <AppText variant="displayLight" style={{ fontSize: 22, color: Colors.cream, marginBottom: 8 }}>
            No deals saved yet
          </AppText>
          <AppText variant="body" style={{ fontSize: 13, color: Colors.muted, marginBottom: 24 }}>
            Analyze a property to get started.
          </AppText>
          <View style={{ width: 220 }}>
            <GoldButton label="Go to Analyzer" onPress={() => router.push("/(tabs)/analyze")} />
          </View>
        </View>
      ) : (
        <>
          {/* Summary stats */}
          <View style={styles.stats}>
            {(
              [
                [String(total), "Total Deals"],
                [`${avgIrr.toFixed(1)}%`, "Avg IRR"],
                [String(active), "Active"],
                [String(passed), "Passed"],
              ] as [string, string][]
            ).map(([v, l]) => (
              <View key={l} style={styles.stat}>
                <AppText variant="display" style={styles.statV}>
                  {v}
                </AppText>
                <AppText variant="bodySemibold" style={styles.statL}>
                  {l}
                </AppText>
              </View>
            ))}
          </View>

          {deals.map((deal) => {
            const isOpen = expanded === deal.id;
            const adjl = deal.results?.adjl;
            return (
              <View key={deal.id} style={styles.card}>
                <Pressable onPress={() => setExpanded(isOpen ? null : deal.id)} style={styles.cardHdr}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySemibold" style={styles.addr} numberOfLines={1}>
                      {deal.address}
                    </AppText>
                    <AppText variant="body" style={styles.cardSub}>
                      {fmt(deal.price)} · {deal.units} units ·{" "}
                      <AppText
                        variant="bodyBold"
                        style={{ fontSize: 11, color: VERDICT_COLORS[deal.verdict] ?? Colors.goldL }}
                      >
                        {deal.verdict}
                      </AppText>{" "}
                      · IRR {deal.irr.toFixed(1)}%
                    </AppText>
                    <AppText variant="body" style={styles.cardMeta}>
                      {deal.savedBy.split(" ")[0]} · {new Date(deal.savedAt).toLocaleDateString()}
                    </AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 7 }}>
                    <Pressable
                      onPress={() => cycleStatus(deal)}
                      style={[styles.statusBtn, { borderColor: STATUS_COLORS[deal.status] }]}
                    >
                      <AppText
                        variant="bodyBold"
                        style={{ fontSize: 8.5, letterSpacing: 0.6, color: STATUS_COLORS[deal.status] }}
                      >
                        {deal.status.toUpperCase()}
                      </AppText>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(deal)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={15} color="rgba(255,128,128,0.6)" />
                    </Pressable>
                  </View>
                </Pressable>

                {isOpen && (
                  <View style={styles.expand}>
                    {adjl && (
                      <View style={styles.miniMetrics}>
                        {(
                          [
                            ["DSCR", `${adjl.dscr.toFixed(2)}x`],
                            ["Cap Rate", `${adjl.capRate.toFixed(1)}%`],
                            ["NOI/yr", fmt(adjl.noi)],
                            ["Cash Flow", fmt(adjl.perInvCF)],
                            ["IRR", `${adjl.irr.toFixed(1)}%`],
                            ["MOIC", `${adjl.moic.toFixed(2)}x`],
                          ] as [string, string][]
                        ).map(([l, v]) => (
                          <View key={l} style={styles.miniMetric}>
                            <AppText variant="condensed" style={{ fontSize: 14, color: Colors.cream }}>
                              {v}
                            </AppText>
                            <AppText variant="bodySemibold" style={styles.miniLabel}>
                              {l}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    )}

                    {deal.aiAnalysis && (
                      <View style={styles.aiBox}>
                        <AppText variant="bodyBold" style={styles.aiLabel}>
                          Claude AI Analysis
                        </AppText>
                        <AppText variant="body" style={styles.aiText}>
                          {deal.aiAnalysis}
                        </AppText>
                      </View>
                    )}

                    <AppText variant="bodySemibold" style={styles.notesLabel}>
                      Notes
                    </AppText>
                    <TextInput
                      value={noteDrafts[deal.id] ?? deal.notes ?? ""}
                      onChangeText={(t) => setNoteDrafts((prev) => ({ ...prev, [deal.id]: t }))}
                      placeholder="Add notes about this deal…"
                      placeholderTextColor="rgba(248,245,239,0.25)"
                      multiline
                      style={styles.notesInput}
                    />
                    {noteDrafts[deal.id] !== undefined && (
                      <Pressable onPress={() => saveNote(deal)} style={styles.saveNotes}>
                        <AppText variant="bodyBold" style={{ fontSize: 10, letterSpacing: 1, color: Colors.navy }}>
                          SAVE NOTES
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </DetailScaffold>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(27,43,75,0.5)",
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: 13, borderWidth: 0.5, borderColor: Colors.border },
  statV: { fontSize: 20, color: Colors.goldL },
  statL: { fontSize: 7.5, letterSpacing: 1, textTransform: "uppercase", color: Colors.goldDim, marginTop: 3 },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginBottom: 9,
  },
  cardHdr: { flexDirection: "row", gap: 10, padding: 13 },
  addr: { fontSize: 14, color: Colors.cream },
  cardSub: { fontSize: 11.5, color: Colors.muted, marginTop: 3 },
  cardMeta: { fontSize: 10, color: "rgba(248,245,239,0.35)", marginTop: 3 },
  statusBtn: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },

  expand: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 13 },
  miniMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  miniMetric: {
    width: "31%",
    backgroundColor: "rgba(15,26,46,0.6)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.1)",
    paddingVertical: 8,
    alignItems: "center",
  },
  miniLabel: { fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", color: Colors.goldDim, marginTop: 2 },

  aiBox: {
    backgroundColor: "rgba(27,43,75,0.4)",
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    padding: 11,
    marginBottom: 12,
  },
  aiLabel: { fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", color: Colors.gold, marginBottom: 6 },
  aiText: { fontSize: 12.5, lineHeight: 19, color: "rgba(248,245,239,0.72)" },

  notesLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: Colors.goldDim, marginBottom: 6 },
  notesInput: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.cream,
    fontFamily: Fonts.body,
    fontSize: 13,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveNotes: { backgroundColor: Colors.gold, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, marginTop: 8 },
});
