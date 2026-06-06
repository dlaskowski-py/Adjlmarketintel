import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/adjl";

// ── Hero ────────────────────────────────────────────────────
export function Hero({
  title,
  accent,
  subtitle,
}: {
  title: string;
  accent: string;
  subtitle: string;
}) {
  return (
    <View style={styles.hero}>
      <AppText variant="displayLight" style={styles.heroTitle}>
        {title}
      </AppText>
      <AppText variant="displayItalic" style={styles.heroAccent}>
        {accent}
      </AppText>
      <AppText variant="body" style={styles.heroSub}>
        {subtitle}
      </AppText>
    </View>
  );
}

// ── Stat bar ────────────────────────────────────────────────
export function StatBar({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <View style={styles.statBar}>
      {stats.map((s, i) => (
        <View key={i} style={styles.stat}>
          <AppText variant="display" style={styles.statValue}>
            {s.value}
          </AppText>
          <AppText variant="bodySemibold" style={styles.statLabel}>
            {s.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ── Section header ──────────────────────────────────────────
export function SectionHeader({ title, count }: { title: string; count?: string }) {
  return (
    <View style={styles.secHdr}>
      <AppText variant="displayItalic" style={styles.secTitle}>
        {title}
      </AppText>
      <View style={styles.secLine} />
      {count ? (
        <AppText variant="bodySemibold" style={styles.secCount}>
          {count}
        </AppText>
      ) : null}
    </View>
  );
}

// ── Type tag pill ───────────────────────────────────────────
export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <AppText variant="bodyBold" style={[styles.tagText, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

// ── Market row card ─────────────────────────────────────────
export interface MarketCard {
  rank: string;
  city: string;
  driver: string;
  median: string;
  rent: string;
  growth: string;
  growthColor: string;
  score: number;
  tag: string;
  tagColor: string;
}

export function MarketRowCard({ m }: { m: MarketCard }) {
  return (
    <View style={styles.row}>
      <View style={styles.goldEdge} />
      <View style={styles.rankCol}>
        <AppText variant="displayBold" style={styles.rankNum}>
          {m.rank}
        </AppText>
      </View>
      <View style={styles.rowMain}>
        <AppText variant="display" style={styles.city}>
          {m.city}
        </AppText>
        <AppText variant="body" style={styles.driver} numberOfLines={1}>
          {m.driver}
        </AppText>
        <View style={styles.metrics}>
          <AppText variant="body" style={styles.metric}>
            <AppText variant="bodySemibold" style={styles.metricStrong}>
              {m.median}
            </AppText>{" "}
            median
          </AppText>
          <AppText variant="body" style={styles.dot}>
            ·
          </AppText>
          <AppText variant="bodySemibold" style={styles.metricStrong}>
            {m.rent}
          </AppText>
          <AppText variant="body" style={styles.dot}>
            ·
          </AppText>
          <AppText variant="bodySemibold" style={{ color: m.growthColor, fontSize: 12 }}>
            {m.growth}
          </AppText>
        </View>
      </View>
      <View style={styles.rightCol}>
        <AppText variant="display" style={styles.score}>
          {m.score}
        </AppText>
        <Tag label={m.tag} color={m.tagColor} />
      </View>
    </View>
  );
}

// ── Preview note (for screens not yet wired to data) ────────
export function PreviewNote({ text }: { text: string }) {
  return (
    <View style={styles.note}>
      <AppText variant="bodySemibold" style={styles.noteTitle}>
        Design preview
      </AppText>
      <AppText variant="body" style={styles.noteText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  heroTitle: { fontSize: 34, lineHeight: 38, color: Colors.cream },
  heroAccent: { fontSize: 34, lineHeight: 40, color: Colors.goldL, marginBottom: 10 },
  heroSub: { fontSize: 13, lineHeight: 20, color: Colors.muted, maxWidth: 320 },

  statBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(27,43,75,0.5)",
  },
  stat: {
    width: "33.333%",
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 22, color: Colors.goldL },
  statLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.goldDim,
    marginTop: 3,
  },

  secHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  secTitle: { fontSize: 18, color: Colors.gold },
  secLine: { flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.3)" },
  secCount: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.goldDim,
  },

  tag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  tagText: { fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase" },

  row: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  goldEdge: { width: 3, backgroundColor: Colors.gold },
  rankCol: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,168,76,0.06)",
    borderRightWidth: 1,
    borderRightColor: "rgba(201,168,76,0.1)",
  },
  rankNum: { fontSize: 20, color: Colors.gold },
  rowMain: { flex: 1, paddingVertical: 11, paddingHorizontal: 14 },
  city: { fontSize: 17, color: Colors.cream },
  driver: { fontSize: 11, color: "rgba(201,168,76,0.58)", marginTop: 2 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7, flexWrap: "wrap" },
  metric: { fontSize: 12, color: Colors.muted },
  metricStrong: { color: Colors.cream, fontSize: 12 },
  dot: { color: "rgba(201,168,76,0.28)", fontSize: 12 },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 5,
  },
  score: { fontSize: 22, color: Colors.gold },

  note: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    backgroundColor: "rgba(27,43,75,0.4)",
  },
  noteTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: Colors.gold,
    marginBottom: 6,
  },
  noteText: { fontSize: 13, lineHeight: 20, color: "rgba(248,245,239,0.7)" },
});
