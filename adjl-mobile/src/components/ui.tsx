/**
 * Generic UI primitives. Nothing here knows about markets, deals, or the brand
 * — screens compose these instead of carrying their own StyleSheets.
 */

import { type ReactNode, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextInputProps,
  type StyleProp,
} from "react-native";
import { AppText } from "@/components/AppText";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";

// ── Button ──────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  size = "md",
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btnBase,
        size === "sm" && styles.btnSm,
        isPrimary && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        isDanger && styles.btnDanger,
        pressed && !disabled && { opacity: 0.75 },
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.textInverse : Colors.text} size="small" />
      ) : (
        <AppText
          variant={size === "sm" ? "label" : "bodyStrong"}
          tone={isPrimary ? "inverse" : isDanger ? "negative" : "default"}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

// ── Card ────────────────────────────────────────────────────

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const content = (
    <View style={[styles.card, padded && { padding: Spacing.lg }, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.65 }}>
      {content}
    </Pressable>
  );
}

// ── Section header ──────────────────────────────────────────

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: Spacing.xl }}>
      <View style={styles.sectionHead}>
        <AppText variant="caption" tone="muted" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </AppText>
        {action}
      </View>
      {children}
    </View>
  );
}

// ── Badge ───────────────────────────────────────────────────

type BadgeTone = "neutral" | "positive" | "warning" | "negative" | "accent";

const BADGE: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: Colors.bgSubtle, fg: Colors.textSecondary },
  positive: { bg: Colors.positiveSubtle, fg: Colors.positive },
  warning: { bg: Colors.warningSubtle, fg: Colors.warning },
  negative: { bg: Colors.negativeSubtle, fg: Colors.negative },
  accent: { bg: Colors.accentSubtle, fg: Colors.accent },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  const c = BADGE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant="caption" style={{ color: c.fg }}>
        {label}
      </AppText>
    </View>
  );
}

// ── Stat ────────────────────────────────────────────────────

export function Stat({
  value,
  label,
  tone,
  large,
}: {
  value: string;
  label: string;
  tone?: "positive" | "warning" | "negative";
  large?: boolean;
}) {
  const color = tone === "positive" ? Colors.positive : tone === "warning" ? Colors.warning : tone === "negative" ? Colors.negative : Colors.text;
  return (
    <View style={{ gap: 2 }}>
      <AppText variant={large ? "numericLarge" : "numeric"} style={{ color }}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

/** Label/value row used inside metric lists. */
export function Row({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "negative";
  hint?: ReactNode;
}) {
  const color = tone === "positive" ? Colors.positive : tone === "warning" ? Colors.warning : tone === "negative" ? Colors.negative : Colors.text;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
        <AppText variant="body" tone="secondary">
          {label}
        </AppText>
        {hint}
      </View>
      <AppText variant="numeric" style={{ color }}>
        {value}
      </AppText>
    </View>
  );
}

// ── Input ───────────────────────────────────────────────────

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && { borderColor: Colors.accent }, props.style]}
      />
      {hint ? (
        <AppText variant="caption" tone="muted" style={{ letterSpacing: 0 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// ── Segmented control ───────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <AppText variant="label" tone={active ? "default" : "muted"}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Empty / message state ───────────────────────────────────

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  btnBase: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
  },
  btnSm: { minHeight: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.borderStrong },
  btnGhost: { backgroundColor: "transparent" },
  btnDanger: { backgroundColor: Colors.negativeSubtle },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: { letterSpacing: 0.8 },

  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSunken,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    ...Type.body,
  },

  segmented: {
    flexDirection: "row",
    backgroundColor: Colors.bgSubtle,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.sm,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});
