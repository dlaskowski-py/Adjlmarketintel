import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/ui";
import { Colors, Radius, Spacing } from "@/constants/theme";
import type { Confidence } from "@/lib/expenseModel";
import {
  buildExpenseLines,
  countByConfidence,
  totalAnnual,
  type ExpenseInputs,
} from "@/lib/expenseLines";

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  actual: "Actual",
  modeled: "Modeled",
  assumed: "Assumed",
};

/**
 * 'assumed' is deliberately neutral, not a warning. These are normal, defensible
 * rules of thumb — colouring them red would train users to ignore the flag.
 */
const CONFIDENCE_STYLE: Record<Confidence, { bg: string; fg: string }> = {
  actual: { bg: Colors.positiveSubtle, fg: Colors.positive },
  modeled: { bg: Colors.accentSubtle, fg: Colors.accent },
  assumed: { bg: Colors.bgSubtle, fg: Colors.textSecondary },
};

function ConfidenceChip({ level }: { level: Confidence }) {
  const s = CONFIDENCE_STYLE[level];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <AppText variant="caption" style={{ color: s.fg }}>
        {CONFIDENCE_LABEL[level].toUpperCase()}
      </AppText>
    </View>
  );
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/**
 * Itemized operating expenses, each tagged with how much we actually know.
 *
 * Presented as a reality check rather than as scenario inputs: the underwriting
 * engine applies a flat 52% expense ratio, and silently substituting these
 * numbers would make the two halves of the screen disagree.
 */
export function ExpenseBreakdown(props: ExpenseInputs) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const lines = buildExpenseLines(props);

  if (lines.length === 0) {
    return (
      <Card>
        <AppText variant="body" tone="secondary">
          Add a purchase price and rent to see an itemized expense estimate.
        </AppText>
      </Card>
    );
  }

  const total = totalAnnual(lines);
  const counts = countByConfidence(lines);

  return (
    <Card padded={false}>
      {lines.map((line, i) => {
        const open = openRow === line.label;
        return (
          <Pressable
            key={line.label}
            onPress={() => setOpenRow(open ? null : line.label)}
            style={[styles.row, i > 0 && styles.rowBorder]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.rowTop}>
                <AppText variant="body">{line.label}</AppText>
                <ConfidenceChip level={line.estimate.confidence} />
              </View>
              {open && (
                <AppText variant="label" tone="muted">
                  {line.estimate.basis}
                </AppText>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="numeric">{money(line.estimate.monthly)}</AppText>
              <AppText variant="caption" tone="muted">
                /MO
              </AppText>
            </View>
          </Pressable>
        );
      })}

      <View style={[styles.row, styles.rowBorder, styles.totalRow]}>
        <AppText variant="bodyStrong">Total operating</AppText>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="numeric">{money(total / 12)}</AppText>
          <AppText variant="caption" tone="muted">
            {money(total)}/YR
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <AppText variant="label" tone="secondary">
          {counts.actual} from records · {counts.modeled} modeled · {counts.assumed} assumed
        </AppText>
        <AppText variant="label" tone="muted" style={{ marginTop: 4 }}>
          Tap any line to see how it was calculated. Scenario returns above use a flat 52% expense
          ratio, so these figures are a cross-check rather than an input.
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  totalRow: { backgroundColor: Colors.surfaceSunken },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
