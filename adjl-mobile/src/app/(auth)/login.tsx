import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/components/AppText";
import { Colors, Fonts, Spacing } from "@/constants/adjl";
import { useAuth } from "@/context/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  async function handleSignIn() {
    setError("");
    setLoading(true);
    const res = await signIn(email, password);
    if (!res.ok) {
      setError(res.error || "Sign in failed.");
      setLoading(false);
    }
    // On success, the root navigator redirects into the tabs.
  }

  const hasError = !!error;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.accent} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <View style={styles.card}>
          <AppText variant="displayBold" style={styles.logo}>
            ADJL <AppText variant="displayBold" style={styles.logoGold}>Capital</AppText>
          </AppText>
          <AppText variant="bodyMedium" style={styles.subtitle}>
            Market Intelligence Platform
          </AppText>

          <View style={styles.field}>
            <AppText variant="bodySemibold" style={styles.label}>
              Email
            </AppText>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="you@adjlcapital.com"
              placeholderTextColor="rgba(248,245,239,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                focused === "email" && styles.inputFocused,
                hasError && styles.inputError,
              ]}
            />
          </View>

          <View style={styles.field}>
            <AppText variant="bodySemibold" style={styles.label}>
              Password
            </AppText>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError("");
              }}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              placeholderTextColor="rgba(248,245,239,0.25)"
              secureTextEntry
              style={[
                styles.input,
                focused === "password" && styles.inputFocused,
                hasError && styles.inputError,
              ]}
            />
          </View>

          {hasError && (
            <AppText variant="body" style={styles.error}>
              {error}
            </AppText>
          )}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <AppText variant="bodyBold" style={styles.buttonText}>
                SIGN IN
              </AppText>
            )}
          </Pressable>

          <AppText variant="body" style={styles.hint}>
            Partners: daniel@ · andrew@ · james@adjlcapital.com
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navy },
  accent: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 340,
    backgroundColor: "rgba(201,168,76,0.05)",
  },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: Spacing.xl },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  logo: { fontSize: 34, textAlign: "center", letterSpacing: 4, color: Colors.cream },
  logoGold: { color: Colors.gold },
  subtitle: {
    textAlign: "center",
    color: Colors.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 11,
    marginTop: 6,
    marginBottom: 28,
  },
  field: { marginBottom: Spacing.lg },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: Colors.goldDim,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.cream,
    fontFamily: Fonts.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: { borderColor: Colors.gold },
  inputError: { borderColor: Colors.redBright },
  error: { color: Colors.redBright, fontSize: 13, textAlign: "center", marginBottom: 10 },
  button: {
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: Colors.navy, letterSpacing: 1.5, fontSize: 14 },
  hint: {
    color: Colors.faint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 18,
  },
});
