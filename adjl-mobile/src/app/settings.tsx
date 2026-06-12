import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { GoldButton } from "@/components/ui";
import { Colors, Fonts, Spacing } from "@/constants/adjl";
import { useSettings } from "@/context/settings";
import { testAnthropicKey } from "@/lib/claude";

function mask(key: string) {
  if (!key) return "";
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

function KeyField({
  title,
  hint,
  value,
  saved,
  onChange,
  status,
}: {
  title: string;
  hint: string;
  value: string;
  saved: string;
  onChange: (v: string) => void;
  status?: "ok" | "bad" | null;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <AppText variant="bodyBold" style={styles.fieldTitle}>
          {title}
        </AppText>
        {status === "ok" && <Ionicons name="checkmark-circle" size={14} color={Colors.greenBright} />}
        {status === "bad" && <Ionicons name="close-circle" size={14} color={Colors.redBright} />}
      </View>
      <AppText variant="body" style={styles.fieldHint}>
        {hint}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={saved ? `Saved: ${mask(saved)}` : "Paste key…"}
        placeholderTextColor={saved ? "rgba(76,175,125,0.55)" : "rgba(248,245,239,0.25)"}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!focused && value.length > 0}
        style={[styles.input, focused && { borderColor: Colors.gold }]}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { anthropicKey, rentcastKey, setAnthropicKey, setRentcastKey } = useSettings();

  const [anthropicDraft, setAnthropicDraft] = useState("");
  const [rentcastDraft, setRentcastDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [anthropicStatus, setAnthropicStatus] = useState<"ok" | "bad" | null>(null);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    setAnthropicStatus(null);

    const newAnthropic = anthropicDraft.trim() || anthropicKey;
    const newRentcast = rentcastDraft.trim() || rentcastKey;

    if (anthropicDraft.trim()) {
      const ok = await testAnthropicKey(anthropicDraft.trim());
      setAnthropicStatus(ok ? "ok" : "bad");
      if (!ok) {
        setMessage("Anthropic key was rejected by the API — double-check and try again.");
        setSaving(false);
        return;
      }
    }

    await setAnthropicKey(newAnthropic);
    await setRentcastKey(newRentcast);
    setAnthropicDraft("");
    setRentcastDraft("");
    setMessage("Saved. Keys are stored in the device keychain.");
    setSaving(false);
  }

  async function clearAll() {
    await setAnthropicKey("");
    await setRentcastKey("");
    setAnthropicDraft("");
    setRentcastDraft("");
    setAnthropicStatus(null);
    setMessage("All keys removed from this device.");
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <AppText variant="display" style={styles.title}>
              Settings
            </AppText>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.goldDim} />
            </Pressable>
          </View>

          <AppText variant="body" style={styles.intro}>
            This app runs entirely on-device. Enter your own API keys below to enable AI market
            analysis and live listings — keys are stored securely in the iOS keychain and never
            leave this device except to call the APIs directly.
          </AppText>

          <KeyField
            title="Anthropic API Key"
            hint="Powers AI market synopses and investment analysis. Get one at console.anthropic.com → API Keys."
            value={anthropicDraft}
            saved={anthropicKey}
            onChange={(v) => {
              setAnthropicDraft(v);
              setAnthropicStatus(null);
            }}
            status={anthropicStatus}
          />

          <KeyField
            title="RentCast API Key"
            hint="Optional — live multi-family listings + rent estimates. Free Developer plan (50 calls/mo) at rentcast.io."
            value={rentcastDraft}
            saved={rentcastKey}
            onChange={setRentcastDraft}
          />

          {message ? (
            <AppText
              variant="body"
              style={[styles.message, message.includes("rejected") && { color: Colors.redBright }]}
            >
              {message}
            </AppText>
          ) : null}

          {saving ? (
            <View style={[styles.saveBtn, { alignItems: "center" }]}>
              <ActivityIndicator color={Colors.navy} />
            </View>
          ) : (
            <GoldButton label="Save Keys" onPress={save} />
          )}

          <View style={{ height: 10 }} />
          <GoldButton outline label="Remove All Keys" onPress={clearAll} />

          <AppText variant="body" style={styles.footnote}>
            AI: claude-sonnet-4 · Listings: RentCast · Data is cached for the session to minimize
            API usage. © 2026 ADJL Capital, LLC — Private & Confidential.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 60 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 28, color: Colors.cream },
  intro: { fontSize: 13, lineHeight: 20, color: Colors.muted, marginBottom: 24 },
  field: { marginBottom: 22 },
  fieldTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: Colors.gold },
  fieldHint: { fontSize: 12, lineHeight: 18, color: "rgba(248,245,239,0.4)", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.cream,
    fontFamily: Fonts.body,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  message: { fontSize: 12.5, color: Colors.greenBright, marginBottom: 14 },
  saveBtn: { backgroundColor: Colors.gold, paddingVertical: 13 },
  footnote: { fontSize: 10.5, lineHeight: 16, color: "rgba(248,245,239,0.25)", marginTop: 28, textAlign: "center" },
});
