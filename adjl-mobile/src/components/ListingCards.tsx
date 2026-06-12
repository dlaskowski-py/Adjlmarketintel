import { useEffect, useState } from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { Colors } from "@/constants/adjl";
import { useSettings } from "@/context/settings";
import { getSaleListings, type RentCastListing } from "@/lib/rentcast";

export function zillowUrl(city: string, maxPrice = 500000) {
  return `https://www.zillow.com/homes/for_sale/${encodeURIComponent(city)}_rb/?price=0-${maxPrice}&beds=2-&homeTypes=multi-family`;
}
export function redfinUrl(city: string) {
  return `https://www.redfin.com/city/search/${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function domColor(days: number) {
  return days > 60 ? Colors.redBright : days > 30 ? Colors.gold : Colors.greenBright;
}

export function ListingCards({ city, state }: { city: string; state: string }) {
  const router = useRouter();
  const { rentcastKey } = useSettings();
  const [listings, setListings] = useState<RentCastListing[]>([]);
  const [loading, setLoading] = useState(!!rentcastKey);

  useEffect(() => {
    if (!rentcastKey) return;
    let cancelled = false;
    setLoading(true);
    getSaleListings(rentcastKey, city, state)
      .then((l) => !cancelled && setListings(l))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rentcastKey, city, state]);

  const fallback = !rentcastKey || (!loading && listings.length === 0);

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.hdr}>
        <AppText variant="bodyBold" style={styles.hdrTitle}>
          Live Listings
        </AppText>
        <View style={styles.hdrLine} />
        <AppText variant="body" style={styles.hdrNote}>
          via RentCast · under $500K
        </AppText>
      </View>

      {loading && (
        <View style={{ gap: 7 }}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      )}

      {!loading &&
        listings.map((l) => (
          <View key={l.id || l.formattedAddress} style={styles.card}>
            <AppText variant="bodySemibold" style={styles.addr}>
              {l.formattedAddress}
            </AppText>
            <View style={styles.meta}>
              <AppText variant="condensed" style={styles.price}>
                ${l.price.toLocaleString()}
              </AppText>
              <AppText variant="body" style={styles.metaText}>
                {l.bedrooms}bd / {l.bathrooms}ba
                {l.squareFootage ? ` · ${l.squareFootage.toLocaleString()} sqft` : ""}
                {l.yearBuilt ? ` · Built ${l.yearBuilt}` : ""}
              </AppText>
            </View>
            <View style={styles.footer}>
              <AppText variant="body" style={{ fontSize: 11, color: domColor(l.daysOnMarket) }}>
                {l.daysOnMarket} days on market
              </AppText>
              <Pressable
                style={styles.analyzeBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/analyze",
                    params: {
                      address: l.formattedAddress,
                      city: `${l.city}, ${l.state}`,
                      price: String(l.price),
                      units: "4",
                      beds: String(l.bedrooms || 2),
                    },
                  })
                }
              >
                <AppText variant="bodyBold" style={styles.analyzeText}>
                  ANALYZE →
                </AppText>
              </Pressable>
            </View>
          </View>
        ))}

      {fallback && !loading && (
        <View style={styles.fallback}>
          <AppText variant="body" style={styles.fallbackText}>
            {rentcastKey
              ? "No active multi-family listings found via API. Search directly:"
              : "Add a RentCast API key in Settings for live listings, or search directly:"}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(zillowUrl(city))}>
              <AppText variant="bodySemibold" style={styles.linkText}>
                Search Zillow →
              </AppText>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(redfinUrl(city))}>
              <AppText variant="bodySemibold" style={styles.linkText}>
                Search Redfin →
              </AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  hdrTitle: { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: Colors.gold },
  hdrLine: { flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.12)" },
  hdrNote: { fontSize: 9, color: "rgba(201,168,76,0.4)" },
  skeleton: {
    height: 78,
    backgroundColor: "rgba(27,43,75,0.3)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.08)",
  },
  card: {
    backgroundColor: "rgba(27,43,75,0.4)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.1)",
    padding: 12,
    marginBottom: 7,
  },
  addr: { fontSize: 13, color: Colors.cream, marginBottom: 5 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" },
  price: { fontSize: 16, color: Colors.gold },
  metaText: { fontSize: 11, color: "rgba(248,245,239,0.55)" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  analyzeBtn: {
    backgroundColor: "rgba(201,168,76,0.1)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  analyzeText: { fontSize: 9, letterSpacing: 0.8, color: Colors.gold },
  fallback: {
    padding: 12,
    backgroundColor: "rgba(27,43,75,0.3)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.1)",
  },
  fallbackText: { fontSize: 12, lineHeight: 18, color: "rgba(248,245,239,0.45)", marginBottom: 9 },
  linkBtn: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  linkText: { fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(201,168,76,0.65)" },
});
