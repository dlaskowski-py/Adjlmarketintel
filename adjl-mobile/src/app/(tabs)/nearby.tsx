import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/AppText";
import { Paywalled } from "@/components/Paywalled";
import { Badge, Button, Card, EmptyState, Field, Section } from "@/components/ui";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useSettings } from "@/context/settings";
import { useSubscription } from "@/context/subscription";
import { nearestMarket, RADIUS_OPTIONS, type Coords, type RadiusOption } from "@/lib/geo";
import { stateFromZip } from "@/lib/expenseModel";
import { getNearbyListings, type RentCastListing } from "@/lib/rentcast";
import { STATES } from "@/data/states";

type PermState = "checking" | "undetermined" | "granted" | "denied" | "disabled";

interface Place {
  coords: Coords;
  city: string | null;
  region: string | null;
  zip: string | null;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function NearbyScreen() {
  const router = useRouter();
  const { rentcastKey } = useSettings();
  const { isPro } = useSubscription();

  const [perm, setPerm] = useState<PermState>("checking");
  const [place, setPlace] = useState<Place | null>(null);
  const [radius, setRadius] = useState<RadiusOption>(10);
  const [zipInput, setZipInput] = useState("");
  const [locating, setLocating] = useState(false);

  const [listings, setListings] = useState<RentCastListing[] | null>(null);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingError, setListingError] = useState("");

  // Check permission WITHOUT prompting. iOS grants exactly one prompt, so it has
  // to be spent on a deliberate tap, never on mount.
  useEffect(() => {
    (async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) return setPerm("disabled");
        const { status } = await Location.getForegroundPermissionsAsync();
        setPerm(
          status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined"
        );
      } catch {
        setPerm("undetermined");
      }
    })();
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    setListingError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPerm("denied");
        return;
      }
      setPerm("granted");
      // Balanced accuracy (~100m) is ample for a radius search and far cheaper
      // on battery than High.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

      let city: string | null = null;
      let region: string | null = null;
      let zip: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync(coords);
        city = geo?.city ?? geo?.subregion ?? null;
        zip = geo?.postalCode ?? null;
        // `region` is inconsistent across iOS versions (sometimes a full state
        // name). Fall back to deriving the abbreviation from the zip.
        region = geo?.region && geo.region.length === 2 ? geo.region : stateFromZip(zip);
      } catch {
        // Coordinates alone are still useful.
      }
      setPlace({ coords, city, region, zip });
    } catch {
      setListingError("Couldn't determine your location. Try entering a ZIP code instead.");
    } finally {
      setLocating(false);
    }
  }, []);

  const useZip = useCallback(() => {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) {
      setListingError("Enter a 5-digit ZIP code.");
      return;
    }
    setListingError("");
    // No coordinates from a ZIP alone — state context still works, and the
    // listings call is skipped rather than sending a bad radius query.
    setPlace({ coords: { latitude: 0, longitude: 0 }, city: null, region: stateFromZip(zip), zip });
  }, [zipInput]);

  // Listings are the paid part; skip the call entirely when not subscribed.
  useEffect(() => {
    if (!place || !isPro) return;
    const { latitude, longitude } = place.coords;
    if (!latitude && !longitude) return; // ZIP-only, no radius search possible
    if (!rentcastKey) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setLoadingListings(true);
    getNearbyListings(rentcastKey, latitude, longitude, radius)
      .then((l) => !cancelled && setListings(l))
      .finally(() => !cancelled && setLoadingListings(false));
    return () => {
      cancelled = true;
    };
  }, [place, radius, isPro, rentcastKey]);

  const near = place && place.coords.latitude ? nearestMarket(place.coords) : null;
  const stateRecord = place?.region ? STATES.find((s) => s.abbr === place.region) : undefined;

  const locationLabel = place
    ? [place.city, place.region].filter(Boolean).join(", ") || place.zip || "Your location"
    : null;

  return (
    <Screen>
      <ScreenHeader title="Nearby" subtitle="What's for sale around you" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Location setup ── */}
        {!place && (
          <Card style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
              <Ionicons name="location-outline" size={18} color={Colors.text} />
              <AppText variant="heading">Find homes around you</AppText>
            </View>

            {perm === "disabled" ? (
              <AppText variant="body" tone="secondary">
                Location Services are turned off for this device. Turn them on in iOS Settings, or
                enter a ZIP code below.
              </AppText>
            ) : perm === "denied" ? (
              <>
                <AppText variant="body" tone="secondary">
                  Location access is off for {" "}
                  <AppText variant="bodyStrong">this app</AppText>. You can enable it in Settings,
                  or just enter a ZIP code.
                </AppText>
                <Button
                  label="Open Settings"
                  variant="secondary"
                  size="sm"
                  onPress={() => Linking.openSettings()}
                />
              </>
            ) : (
              <>
                <AppText variant="body" tone="secondary">
                  We'll use your location once to search for active listings nearby. Nothing is
                  tracked in the background and nothing leaves your device except the search area.
                </AppText>
                <Button
                  label={locating ? "Locating…" : "Use my location"}
                  onPress={locate}
                  loading={locating}
                  disabled={perm === "checking"}
                />
              </>
            )}

            <View style={styles.orRow}>
              <View style={styles.hr} />
              <AppText variant="caption" tone="muted">
                OR
              </AppText>
              <View style={styles.hr} />
            </View>

            <Field
              label="ZIP code"
              value={zipInput}
              onChangeText={setZipInput}
              placeholder="78701"
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="done"
              onSubmitEditing={useZip}
            />
            <Button label="Use this ZIP" variant="secondary" onPress={useZip} />
            {listingError ? (
              <AppText variant="label" tone="negative">
                {listingError}
              </AppText>
            ) : null}
          </Card>
        )}

        {/* ── Located ── */}
        {place && (
          <>
            <Card style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <Ionicons name="location" size={16} color={Colors.accent} />
                <AppText variant="heading" style={{ flex: 1 }}>
                  {locationLabel}
                </AppText>
                <Pressable
                  onPress={() => {
                    setPlace(null);
                    setListings(null);
                  }}
                  hitSlop={8}
                >
                  <AppText variant="label" tone="accent">
                    Change
                  </AppText>
                </Pressable>
              </View>

              {!!place.coords.latitude && (
                <View style={styles.radiusRow}>
                  {RADIUS_OPTIONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRadius(r)}
                      style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
                    >
                      <AppText variant="label" tone={radius === r ? "inverse" : "secondary"}>
                        {r} mi
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>

            {/* ── Live listings (paid) ── */}
            <Section title="Active listings">
              <Paywalled
                title="Homes near you"
                message="See active multi-family listings within your radius, with one-tap underwriting."
              >
                {!place.coords.latitude ? (
                  <Card>
                    <AppText variant="body" tone="secondary">
                      A ZIP code gives market context. Use “Use my location” for a radius search of
                      live listings.
                    </AppText>
                  </Card>
                ) : loadingListings ? (
                  <Card style={{ alignItems: "center", gap: Spacing.md }}>
                    <ActivityIndicator color={Colors.textSecondary} />
                    <AppText variant="label" tone="muted">
                      Searching {radius} miles around you
                    </AppText>
                  </Card>
                ) : !rentcastKey ? (
                  <Card style={{ gap: Spacing.sm }}>
                    <AppText variant="body" tone="secondary">
                      Listings need a property-data connection. Add one in Account to enable live
                      search.
                    </AppText>
                    <Button
                      label="Open Account"
                      size="sm"
                      variant="secondary"
                      onPress={() => router.push("/account")}
                    />
                  </Card>
                ) : listings && listings.length > 0 ? (
                  <View style={{ gap: Spacing.md }}>
                    {listings.map((l) => (
                      <Card key={l.id || l.formattedAddress} style={{ gap: Spacing.sm }}>
                        <AppText variant="bodyStrong">{l.formattedAddress}</AppText>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                          <AppText variant="numeric">{money(l.price)}</AppText>
                          <AppText variant="label" tone="secondary">
                            {l.bedrooms ?? "?"} bd · {l.bathrooms ?? "?"} ba
                            {l.squareFootage ? ` · ${l.squareFootage.toLocaleString()} sqft` : ""}
                          </AppText>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                          {typeof l.daysOnMarket === "number" && (
                            <Badge
                              label={`${l.daysOnMarket}d on market`}
                              tone={l.daysOnMarket > 60 ? "negative" : l.daysOnMarket > 30 ? "warning" : "positive"}
                            />
                          )}
                          <View style={{ flex: 1 }} />
                          <Button
                            label="Analyze"
                            size="sm"
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/analyze",
                                params: {
                                  address: l.formattedAddress,
                                  city: [l.city, l.state].filter(Boolean).join(", "),
                                  price: String(l.price ?? ""),
                                  beds: String(l.bedrooms ?? ""),
                                  sqft: String(l.squareFootage ?? ""),
                                  year: String(l.yearBuilt ?? ""),
                                },
                              })
                            }
                          />
                        </View>
                      </Card>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="No active listings"
                    message={`Nothing for sale within ${radius} miles right now. Try a wider radius.`}
                    action={
                      radius < 25 ? (
                        <Button
                          label="Widen to 25 miles"
                          variant="secondary"
                          size="sm"
                          onPress={() => setRadius(25)}
                        />
                      ) : undefined
                    }
                  />
                )}
              </Paywalled>
            </Section>

            {/* ── Free market context ── */}
            {near && (
              <Section title="Closest researched market">
                <Card onPress={() => router.push(`/market/${near.market.id}`)} style={{ gap: 6 }}>
                  <AppText variant="heading">{near.market.city}</AppText>
                  <AppText variant="label" tone="secondary">
                    {near.miles < 1 ? "Less than a mile" : `${Math.round(near.miles)} miles`} away ·
                    score {near.market.score.toFixed(1)}
                  </AppText>
                </Card>
              </Section>
            )}

            {stateRecord && (
              <Section title={`${stateRecord.name} at a glance`}>
                <Card onPress={() => router.push(`/state/${stateRecord.abbr}`)} style={{ gap: 6 }}>
                  <AppText variant="bodyStrong">
                    {stateRecord.price} median · {stateRecord.rent}/mo
                  </AppText>
                  <AppText variant="body" tone="secondary">
                    {stateRecord.note}
                  </AppText>
                </Card>
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  orRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  hr: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  radiusRow: { flexDirection: "row", gap: Spacing.sm },
  radiusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bgSubtle,
  },
  radiusChipActive: { backgroundColor: Colors.primary },
});
