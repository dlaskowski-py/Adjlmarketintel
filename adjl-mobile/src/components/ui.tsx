import { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/adjl";
import type { Market } from "@/data/markets";
import type { State } from "@/data/states";

// ── Color helpers (from the HTML design system) ─────────────
export const TAG_COLORS: Record<string, string> = {
  tc: Colors.greenBright, // college
  tm: Colors.blue, // military
  tt: Colors.purple, // tech
  td: Colors.redBright, // defense
  tl: Colors.goldL, // logistics
  ts: "#AAD4FF",
};

export function growthColor(bc: Market["bc"]) {
  return bc === "bu" ? Colors.greenBright : bc === "bd" ? Colors.redBright : Colors.gold;
}

export const INV_COLORS: Record<State["inv"], string> = {
  hot: Colors.greenBright,
  good: Colors.goldL,
  mod: "rgba(248,245,239,0.5)",
  cau: Colors.redBright,
};

// ── Hero ────────────────────────────────────────────────────
export function Hero({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
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

// ── Active deal badge ───────────────────────────────────────
export function ActiveBadge({ label = "ACTIVE" }: { label?: string }) {
  return (
    <View style={styles.activeBadge}>
      <AppText variant="bodyBold" style={styles.activeBadgeText}>
        {label}
      </AppText>
    </View>
  );
}

// ── Market row ──────────────────────────────────────────────
export function MarketRow({ market: m, onPress }: { market: Market; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.goldEdge} />
      <View style={styles.rankCol}>
        <AppText variant="displayBold" style={styles.rankNum}>
          {m.rank.split("-")[1]}
        </AppText>
      </View>
      <View style={styles.rowMain}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="display" style={styles.city}>
            {m.city}
          </AppText>
          {m.active && <ActiveBadge />}
        </View>
        <AppText variant="body" style={styles.driver} numberOfLines={1}>
          {m.drv}
        </AppText>
        <View style={styles.metrics}>
          <AppText variant="body" style={styles.metric}>
            <AppText variant="bodySemibold" style={styles.metricStrong}>
              {m.median}
            </AppText>{" "}
            median
          </AppText>
          <AppText variant="body" style={styles.midDot}>
            ·
          </AppText>
          <AppText variant="bodySemibold" style={styles.metricStrong}>
            {m.rent}
          </AppText>
          <AppText variant="body" style={styles.midDot}>
            ·
          </AppText>
          <AppText variant="bodySemibold" style={{ color: growthColor(m.bc), fontSize: 12 }}>
            {m.growth}
          </AppText>
        </View>
      </View>
      <View style={styles.rightCol}>
        <AppText variant="display" style={styles.score}>
          {m.score}
        </AppText>
        <Tag label={m.tlbl} color={TAG_COLORS[m.tcls] ?? Colors.goldL} />
      </View>
    </Pressable>
  );
}

// ── State row ───────────────────────────────────────────────
export function StateRow({ state: s, onPress }: { state: State; onPress: () => void }) {
  const color = INV_COLORS[s.inv];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.srow, pressed && styles.rowPressed]}>
      <AppText variant="displayBold" style={styles.sAbbr}>
        {s.abbr}
      </AppText>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="bodySemibold" style={styles.sName}>
            {s.name}
          </AppText>
          {s.active && <ActiveBadge label="ACTIVE DEAL" />}
        </View>
        <AppText variant="body" style={styles.sRent}>
          {s.rent}/mo avg rent
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText variant="condensed" style={styles.sPrice}>
          {s.price}
        </AppText>
        <Tag label={s.invL} color={color} />
      </View>
    </Pressable>
  );
}

// ── Animated score bar ──────────────────────────────────────
export function ScoreBar({ score }: { score: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: 550, useNativeDriver: false }).start();
    }, 100);
    return () => clearTimeout(t);
  }, [score, anim]);
  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${Math.round((score / 10) * 100)}%`],
  });
  return (
    <View style={styles.sbarTrack}>
      <Animated.View style={[styles.sbarFill, { width }]} />
    </View>
  );
}

// ── Metric box ──────────────────────────────────────────────
export function MetricBox({
  value,
  label,
  badge,
  badgeColor,
}: {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <View style={styles.mb}>
      <AppText variant="condensed" style={styles.mbValue}>
        {value}
      </AppText>
      <AppText variant="bodySemibold" style={styles.mbLabel}>
        {label}
      </AppText>
      {badge ? (
        <AppText variant="bodyBold" style={[styles.mbBadge, { color: badgeColor ?? Colors.gold }]}>
          {badge}
        </AppText>
      ) : null}
    </View>
  );
}

// ── Info sections (why / strategy / risk) ───────────────────
export function InfoSection({
  title,
  text,
  kind = "plain",
}: {
  title: string;
  text: string;
  kind?: "plain" | "strategy" | "risk";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.secHdrSmall}>
        <AppText variant="bodyBold" style={styles.infoTitle}>
          {title}
        </AppText>
        <View style={styles.secLineDim} />
      </View>
      <View
        style={[
          kind === "strategy" && styles.stratBox,
          kind === "risk" && styles.riskBox,
        ]}
      >
        <AppText variant="body" style={[styles.infoText, kind === "risk" && { color: "rgba(248,245,239,0.5)" }]}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

// ── Gold action button ──────────────────────────────────────
export function GoldButton({
  label,
  onPress,
  disabled,
  outline,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        outline ? styles.btnOutline : styles.btn,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <AppText variant="bodyBold" style={outline ? styles.btnOutlineText : styles.btnText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  heroTitle: { fontSize: 34, lineHeight: 38, color: Colors.cream },
  heroAccent: { fontSize: 34, lineHeight: 40, color: Colors.goldL, marginBottom: 10 },
  heroSub: { fontSize: 13, lineHeight: 20, color: Colors.muted, maxWidth: 330 },

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
  statLabel: { fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: Colors.goldDim, marginTop: 3 },

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
  secLineDim: { flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.12)" },
  secCount: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: Colors.goldDim },
  secHdrSmall: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  infoTitle: { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: Colors.gold },
  infoText: { fontSize: 13, lineHeight: 21, color: "rgba(248,245,239,0.62)" },
  stratBox: {
    backgroundColor: "rgba(201,168,76,0.05)",
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  riskBox: {
    backgroundColor: "rgba(139,26,26,0.07)",
    borderLeftWidth: 2,
    borderLeftColor: "rgba(139,26,26,0.32)",
    paddingVertical: 10,
    paddingHorizontal: 13,
  },

  tag: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase" },

  activeBadge: {
    backgroundColor: "rgba(26,107,60,0.2)",
    borderWidth: 1,
    borderColor: "rgba(76,175,77,0.28)",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  activeBadgeText: { fontSize: 7.5, letterSpacing: 0.8, color: Colors.greenBright },

  row: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  rowPressed: { backgroundColor: "rgba(27,43,75,0.88)", borderColor: Colors.borderStrong },
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
  rowMain: { flex: 1, paddingVertical: 11, paddingHorizontal: 13 },
  city: { fontSize: 16.5, color: Colors.cream },
  driver: { fontSize: 11, color: "rgba(201,168,76,0.58)", marginTop: 2 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7, flexWrap: "wrap" },
  metric: { fontSize: 12, color: Colors.muted },
  metricStrong: { color: Colors.cream, fontSize: 12 },
  midDot: { color: "rgba(201,168,76,0.28)", fontSize: 12 },
  rightCol: { alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 11, gap: 5 },
  score: { fontSize: 21, color: Colors.gold },

  srow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Spacing.xl,
    marginBottom: 7,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.08)",
    backgroundColor: "rgba(15,26,46,0.5)",
  },
  sAbbr: { fontSize: 19, color: Colors.gold, width: 36, textAlign: "center" },
  sName: { fontSize: 14, color: Colors.cream },
  sRent: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  sPrice: { fontSize: 15, color: Colors.cream },

  sbarTrack: { flex: 1, height: 3, backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 2, overflow: "hidden" },
  sbarFill: { height: 3, backgroundColor: Colors.gold, borderRadius: 2 },

  mb: {
    width: "48.6%",
    backgroundColor: "rgba(27,43,75,0.5)",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  mbValue: { fontSize: 18, color: Colors.cream },
  mbLabel: { fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(201,168,76,0.38)", marginTop: 3 },
  mbBadge: { fontSize: 10, marginTop: 4 },

  btn: { backgroundColor: Colors.gold, paddingVertical: 13, alignItems: "center" },
  btnText: { color: Colors.navy, letterSpacing: 1.5, fontSize: 13, textTransform: "uppercase" },
  btnOutline: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    paddingVertical: 10,
    alignItems: "center",
  },
  btnOutlineText: { color: "rgba(201,168,76,0.75)", letterSpacing: 1.2, fontSize: 11, textTransform: "uppercase" },
});
