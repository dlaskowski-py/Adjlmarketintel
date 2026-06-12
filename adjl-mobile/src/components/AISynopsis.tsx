import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { Colors } from "@/constants/adjl";
import { useSettings } from "@/context/settings";
import { runClaude } from "@/lib/claude";

// Session-level cache — re-opening the same market is instant.
const synopsisCache = new Map<string, string>();

interface AISynopsisProps {
  cacheKey: string;
  prompt: string;
  label?: string;
  onText?: (text: string) => void;
}

function LoadingDots() {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0.2))).current;
  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.2, duration: 400, easing: Easing.ease, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {anims.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

export function AISynopsis({ cacheKey, prompt, label = "AI Growth Synopsis", onText }: AISynopsisProps) {
  const router = useRouter();
  const { anthropicKey } = useSettings();
  const [text, setText] = useState<string | null>(() => synopsisCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"no-key" | "failed" | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    let cancelled = false;

    const cached = synopsisCache.get(cacheKey);
    if (cached) {
      setText(cached);
      setError(null);
      onTextRef.current?.(cached);
      return;
    }

    if (!anthropicKey) {
      setText(null);
      setError("no-key");
      return;
    }

    setLoading(true);
    setError(null);
    setText(null);

    runClaude(anthropicKey, prompt)
      .then((out) => {
        if (cancelled) return;
        synopsisCache.set(cacheKey, out);
        setText(out);
        onTextRef.current?.(out);
      })
      .catch(() => !cancelled && setError("failed"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [cacheKey, prompt, anthropicKey]);

  const ready = !!text && !loading;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="bodyBold" style={styles.label}>
          {label}
        </AppText>
        <View style={styles.pill}>
          <View style={[styles.dot, ready && styles.dotReady]} />
          <AppText variant="bodySemibold" style={styles.pillText}>
            Claude AI
          </AppText>
        </View>
      </View>

      <View style={styles.box}>
        {loading && (
          <View style={styles.loadingRow}>
            <LoadingDots />
            <AppText variant="body" style={styles.loadingText}>
              Analyzing market…
            </AppText>
          </View>
        )}

        {error === "no-key" && (
          <Pressable onPress={() => router.push("/settings")}>
            <AppText variant="body" style={styles.errorText}>
              Add your Anthropic API key in{" "}
              <AppText variant="bodySemibold" style={{ color: Colors.gold }}>
                Settings
              </AppText>{" "}
              to enable AI analysis.
            </AppText>
          </Pressable>
        )}

        {error === "failed" && (
          <AppText variant="body" style={styles.errorText}>
            AI analysis unavailable — check your API key and connection.
          </AppText>
        )}

        {text &&
          text
            .split("\n\n")
            .filter(Boolean)
            .map((para, i) => (
              <AppText key={i} variant="body" style={styles.para}>
                {para.replace(/\n/g, " ")}
              </AppText>
            ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: Colors.gold,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(201,168,76,0.07)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
  },
  pillText: {
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(201,168,76,0.55)",
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.gold },
  dotReady: { backgroundColor: Colors.greenBright },
  box: {
    backgroundColor: "rgba(27,43,75,0.4)",
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12, color: Colors.muted },
  errorText: { fontSize: 13, lineHeight: 19, color: "rgba(248,245,239,0.45)", fontStyle: "italic" },
  para: { fontSize: 13, lineHeight: 22, color: "rgba(248,245,239,0.8)", marginBottom: 8 },
});
