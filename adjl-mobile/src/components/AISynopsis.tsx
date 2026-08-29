import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { Button, Card } from "@/components/ui";
import { Colors, Spacing } from "@/constants/theme";
import { useSettings } from "@/context/settings";
import { runClaude } from "@/lib/claude";

/** Session cache — reopening the same market is instant and costs nothing. */
const cache = new Map<string, string>();

export function AISynopsis({
  cacheKey,
  prompt,
  onText,
}: {
  cacheKey: string;
  prompt: string;
  onText?: (text: string) => void;
}) {
  const router = useRouter();
  const { anthropicKey } = useSettings();
  const [text, setText] = useState<string | null>(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"no-key" | "failed" | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    let cancelled = false;

    const hit = cache.get(cacheKey);
    if (hit) {
      setText(hit);
      setError(null);
      onTextRef.current?.(hit);
      return;
    }
    if (!prompt) return;
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
        cache.set(cacheKey, out);
        setText(out);
        onTextRef.current?.(out);
      })
      .catch(() => !cancelled && setError("failed"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [cacheKey, prompt, anthropicKey]);

  if (error === "no-key") {
    return (
      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="body" tone="secondary">
          AI reviews need a data connection. Add one in Account to turn this on.
        </AppText>
        <Button
          label="Open Account"
          size="sm"
          variant="secondary"
          onPress={() => router.push("/account")}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
        <ActivityIndicator color={Colors.textSecondary} />
        <AppText variant="label" tone="muted">
          Writing analysis…
        </AppText>
      </Card>
    );
  }

  if (error === "failed") {
    return (
      <Card>
        <AppText variant="body" tone="secondary">
          Couldn't generate the analysis right now. Check your connection and try again.
        </AppText>
      </Card>
    );
  }

  if (!text) return null;

  return (
    <Card>
      <View style={{ gap: Spacing.md }}>
        {text
          .split("\n\n")
          .map((p) => p.replace(/\n/g, " ").trim())
          .filter(Boolean)
          .map((p, i) => (
            <AppText key={i} variant="body" tone="secondary">
              {p}
            </AppText>
          ))}
      </View>
    </Card>
  );
}
