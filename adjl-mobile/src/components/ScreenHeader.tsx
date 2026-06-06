import { View, Pressable, Alert, StyleSheet } from "react-native";
import { AppText } from "@/components/AppText";
import { Colors, Spacing } from "@/constants/adjl";
import { useAuth } from "@/context/auth";

function initials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Fixed top bar: "ADJL Capital" wordmark + partner avatar (tap to sign out).
export function ScreenHeader() {
  const { user, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert("Sign out", `Sign out ${user?.name ?? ""}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <View style={styles.bar}>
      <AppText variant="displayBold" style={styles.logo}>
        ADJL <AppText variant="displayBold" style={styles.logoGold}>Capital</AppText>
      </AppText>

      <Pressable onPress={confirmSignOut} hitSlop={8} style={styles.avatar}>
        <AppText variant="bodyBold" style={styles.avatarText}>
          {initials(user?.name)}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontSize: 20,
    letterSpacing: 3,
    color: Colors.cream,
  },
  logoGold: { color: Colors.gold },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,168,76,0.15)",
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  avatarText: { fontSize: 12, color: Colors.gold, letterSpacing: 0.5 },
});
