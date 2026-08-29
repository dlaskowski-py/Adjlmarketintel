import { useEffect, useMemo, useState } from "react";
import { View, ScrollView, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { ExpenseBreakdown } from "@/components/ExpenseBreakdown";
import { Paywalled } from "@/components/Paywalled";
import { Badge, Button, Card, Field, Row, Section, Segmented } from "@/components/ui";
import { Colors, Spacing } from "@/constants/theme";
import { useSubscription } from "@/context/subscription";
import { addressFromUrl, detectSource, type ParsedAddress } from "@/lib/addressFromUrl";
import { stateFromZip } from "@/lib/expenseModel";
import { metricClass, runAnalysis, type Strategy } from "@/lib/analyzer";
import { buildAnalyzePrompt } from "@/lib/prompts";
import { saveDeal } from "@/lib/pipeline";

const money = (n: number) => (isFinite(n) ? "$" + Math.round(Math.abs(n)).toLocaleString("en-US") : "—");
const pct = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : "—");

/** The calc engine grades good/warn/bad; the UI speaks positive/warning/negative. */
const tone = (grade: "good" | "warn" | "bad") =>
  grade === "good" ? "positive" : grade === "warn" ? "warning" : "negative";

const SCENARIOS = [
  { key: "solo", label: "Solo" },
  { key: "partnership", label: "3-way" },
  { key: "deal5", label: "5-way" },
] as const;
type ScenarioKey = (typeof SCENARIOS)[number]["key"];

export default function AnalyzeScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const params = useLocalSearchParams<{
    address?: string;
    city?: string;
    price?: string;
    beds?: string;
    sqft?: string;
    year?: string;
  }>();

  const [url, setUrl] = useState("");
  const [urlNote, setUrlNote] = useState("");
  const [parsed, setParsed] = useState<ParsedAddress | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [units, setUnits] = useState("1");
  const [beds, setBeds] = useState("3");
  const [rent, setRent] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("unit");
  const [year, setYear] = useState("");
  const [sqft, setSqft] = useState("");
  const [rate, setRate] = useState("6.5");

  const [result, setResult] = useState<ReturnType<typeof runAnalysis> | null>(null);
  const [scenario, setScenario] = useState<ScenarioKey>("solo");
  const [aiText, setAiText] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill from a listing card or market detail.
  useEffect(() => {
    if (params.address) setAddress(String(params.address));
    if (params.city) setCity(String(params.city));
    if (params.price) setPrice(String(params.price));
    if (params.beds) setBeds(String(params.beds));
    if (params.sqft) setSqft(String(params.sqft));
    if (params.year) setYear(String(params.year));
  }, [params.address, params.city, params.price, params.beds, params.sqft, params.year]);

  /**
   * Deterministic, offline, free. The previous build sent the URL to Claude and
   * parsed whatever came back — including an invented purchase price that fed
   * straight into the IRR with no provenance.
   */
  function readUrl() {
    const value = url.trim();
    if (!value) return;
    const found = addressFromUrl(value);
    if (!found) {
      setUrlNote(
        detectSource(value)
          ? "That link's address couldn't be read. Enter the details below."
          : "Only Zillow, Redfin and Realtor.com links are supported. Enter the details below."
      );
      setParsed(null);
      return;
    }
    setParsed(found);
    setUrlNote("");
    setAddress(`${found.street}, ${found.city}, ${found.state} ${found.zip}`);
    setCity(`${found.city}, ${found.state}`);
  }

  function run() {
    const p = parseFloat(price) || 0;
    const r = parseFloat(rent) || 0;
    if (!p || !r) {
      Alert.alert("Missing numbers", "Enter at least a purchase price and monthly rent.");
      return;
    }
    setResult(
      runAnalysis({
        price: p,
        units: parseInt(units, 10) || 1,
        bedsPerUnit: parseInt(beds, 10) || 2,
        rentPerUnit: r,
        strategy,
        rate: parseFloat(rate) || 6.5,
      })
    );
    setAiText("");
  }

  const active = result ? result[scenario] : null;
  const verdict = result ? result.verdicts[scenario] : null;

  const zip = parsed?.zip ?? null;
  const stateAbbr = parsed?.state ?? stateFromZip(zip) ?? null;

  const aiPrompt = useMemo(() => {
    if (!result) return "";
    return buildAnalyzePrompt({
      city: city || "Unknown market",
      price: parseFloat(price) || 0,
      units: parseInt(units, 10) || 1,
      beds: parseInt(beds, 10) || 2,
      strategy,
      rent: parseFloat(rent) || 0,
      yearBuilt: parseInt(year, 10) || undefined,
      rate: parseFloat(rate) || 6.5,
      noi: result.solo.noi,
      dscr: result.solo.dscr,
      capRate: result.solo.capRate,
      onePct: result.solo.onePctRule,
      irr: result.solo.irr,
      soloIrr: result.solo.irr,
    });
  }, [result, city, price, units, beds, strategy, rent, year, rate]);

  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      await saveDeal({
        address: address || city || "Untitled property",
        city: city || "Unknown market",
        price: parseFloat(price) || 0,
        units: parseInt(units, 10) || 1,
        bedsPerUnit: parseInt(beds, 10) || 2,
        rentPerUnit: parseFloat(rent) || 0,
        strategy,
        yearBuilt: parseInt(year, 10) || undefined,
        sqft: parseInt(sqft, 10) || undefined,
        mortgageRate: parseFloat(rate) || 6.5,
        results: result,
        aiAnalysis: aiText || undefined,
        // Save the scenario the user is actually looking at.
        verdict: result.verdicts[scenario].label,
        irr: result[scenario].irr,
      });
      Alert.alert("Saved", "Added to your saved analyses.", [
        { text: "View", onPress: () => router.push("/(tabs)/saved") },
        { text: "OK" },
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Analyze" subtitle="Underwrite any property" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Start from a listing">
          <Card style={{ gap: Spacing.md }}>
            <Field
              label="Listing URL"
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a Zillow, Redfin or Realtor.com link"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={readUrl}
              returnKeyType="done"
            />
            <Button label="Read address" variant="secondary" onPress={readUrl} />
            {parsed && (
              <View style={styles.parsed}>
                <Badge label="Address found" tone="positive" />
                <AppText variant="label" tone="secondary">
                  {parsed.street}, {parsed.city}, {parsed.state} {parsed.zip}
                </AppText>
              </View>
            )}
            {urlNote ? (
              <AppText variant="label" tone="secondary">
                {urlNote}
              </AppText>
            ) : null}
          </Card>
        </Section>

        <Section title="Property">
          <Card style={{ gap: Spacing.lg }}>
            <Field label="City / market" value={city} onChangeText={setCity} placeholder="Austin, TX" />
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Purchase price"
                  value={price}
                  onChangeText={setPrice}
                  placeholder="450000"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Rent / month"
                  value={rent}
                  onChangeText={setRent}
                  placeholder="2400"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Units" value={units} onChangeText={setUnits} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Beds / unit" value={beds} onChangeText={setBeds} keyboardType="number-pad" />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <AppText variant="label" tone="secondary">
                Rent basis
              </AppText>
              <Segmented
                value={strategy}
                onChange={(v) => setStrategy(v as Strategy)}
                options={[
                  { value: "unit", label: "Per unit" },
                  { value: "room", label: "Per room" },
                ]}
              />
            </View>

            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Year built" value={year} onChangeText={setYear} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Sq ft" value={sqft} onChangeText={setSqft} keyboardType="number-pad" />
              </View>
            </View>
            <Field
              label="Mortgage rate (%)"
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
            />

            <Button label="Run analysis" onPress={run} />
          </Card>
        </Section>

        {result && active && verdict && (
          <>
            <Section title="Returns">
              <View style={{ gap: Spacing.md }}>
                <Segmented
                  value={scenario}
                  onChange={setScenario}
                  options={SCENARIOS.map((s) => ({ value: s.key, label: s.label }))}
                />
                <Card style={{ gap: Spacing.sm }}>
                  <View style={styles.verdictRow}>
                    <AppText variant="display">{pct(active.irr)}</AppText>
                    <Badge
                      label={verdict.label}
                      tone={
                        verdict.cls === "verdict-buy"
                          ? "positive"
                          : verdict.cls === "verdict-maybe"
                            ? "warning"
                            : "negative"
                      }
                    />
                  </View>
                  <AppText variant="label" tone="muted">
                    PROJECTED IRR OVER 4 YEARS
                  </AppText>

                  <View style={{ marginTop: Spacing.md }}>
                    <Row label="Down payment" value={money(active.down)} />
                    <Row label="Mortgage / mo" value={money(active.monthlyPmt)} />
                    <Row label="NOI / yr" value={money(active.noi)} />
                    <Row
                      label="DSCR"
                      value={`${active.dscr.toFixed(2)}x`}
                      tone={tone(metricClass(active.dscr, 1.25, 1.1))}
                    />
                    <Row
                      label="Cap rate"
                      value={pct(active.capRate)}
                      tone={tone(metricClass(active.capRate, 7, 5))}
                    />
                    <Row
                      label="1% rule"
                      value={pct(active.onePctRule)}
                      tone={tone(metricClass(active.onePctRule, 1, 0.8))}
                    />
                    <Row
                      label="Cash flow / yr"
                      value={`${active.perInvCF < 0 ? "-" : ""}${money(active.perInvCF)}`}
                      tone={active.perInvCF < 0 ? "negative" : "positive"}
                    />
                    <Row
                      label="Money multiple"
                      value={`${active.moic.toFixed(2)}x`}
                      tone={tone(metricClass(active.moic, 1.8, 1.4))}
                    />
                  </View>
                </Card>
              </View>
            </Section>

            <Section title="Operating expenses">
              <ExpenseBreakdown
                zip={zip}
                state={stateAbbr}
                sqft={parseInt(sqft, 10) || null}
                yearBuilt={parseInt(year, 10) || null}
                valueEstimate={parseFloat(price) || null}
                rentEstimate={parseFloat(rent) || null}
              />
            </Section>

            <Section title="AI review">
              <Paywalled
                title="AI investment review"
                message="Get a written second opinion on the deal, the biggest risk, and one way to improve it."
              >
                <AISynopsis cacheKey={`analysis-${price}-${rent}-${strategy}`} prompt={aiPrompt} onText={setAiText} />
              </Paywalled>
            </Section>

            <Button label={saving ? "Saving…" : "Save analysis"} onPress={save} disabled={saving} />

            <AppText variant="label" tone="muted" style={styles.disclaimer}>
              Conservative assumptions: 8% vacancy · 52% expense ratio · 20% down · 12%
              appreciation over 4 years. Estimates only — not financial advice.
            </AppText>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: Spacing.md },
  parsed: { gap: Spacing.sm },
  verdictRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  disclaimer: { marginTop: Spacing.lg, lineHeight: 17 },
});
