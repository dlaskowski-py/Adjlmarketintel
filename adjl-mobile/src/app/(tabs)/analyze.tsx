import { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { AppText } from "@/components/AppText";
import { AISynopsis } from "@/components/AISynopsis";
import { Hero, GoldButton } from "@/components/ui";
import { Colors, Fonts, Spacing } from "@/constants/adjl";
import { useAuth } from "@/context/auth";
import { useSettings } from "@/context/settings";
import { runClaude } from "@/lib/claude";
import { getRentEstimate } from "@/lib/rentcast";
import {
  runAnalysis,
  metricClass,
  type AnalysisResult,
  type ScenarioResult,
  type Verdict,
  type Strategy,
} from "@/lib/analyzer";
import { buildAnalyzePrompt } from "@/lib/prompts";
import { saveDeal } from "@/lib/pipeline";

const fmt = (n: number, d = 0) =>
  isFinite(n)
    ? "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "N/A";
const fmtP = (n: number, d = 1) => (isFinite(n) ? n.toFixed(d) + "%" : "N/A");

const METRIC_COLOR = { good: Colors.greenBright, warn: Colors.goldL, bad: Colors.redBright } as const;
const VERDICT_COLOR = {
  "verdict-buy": Colors.greenBright,
  "verdict-maybe": Colors.goldL,
  "verdict-pass": Colors.redBright,
} as const;

function Metric({ label, value, cls }: { label: string; value: string; cls?: keyof typeof METRIC_COLOR }) {
  return (
    <View style={styles.metricRow}>
      <AppText variant="body" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText variant="condensed" style={[styles.metricVal, cls && { color: METRIC_COLOR[cls] }]}>
        {value}
      </AppText>
    </View>
  );
}

function ScenarioCard({ s, v }: { s: ScenarioResult; v: Verdict }) {
  const isNeg = s.perInvCF < 0;
  const sub =
    s.numInvestors === 3
      ? "Daniel · Andrew · James"
      : s.numInvestors === 5
        ? `5 investors × ${fmt(s.down / 5)} ea`
        : "100% ownership";
  const color = VERDICT_COLOR[v.cls];
  return (
    <View style={styles.scenario}>
      <View style={styles.scenarioHdr}>
        <View>
          <AppText variant="display" style={styles.scenarioName}>
            {s.label}
          </AppText>
          <AppText variant="body" style={styles.scenarioSub}>
            {sub}
          </AppText>
        </View>
        <View style={{ alignItems: "center" }}>
          <AppText variant="displayBold" style={{ fontSize: 30, lineHeight: 32, color }}>
            {v.emoji}
          </AppText>
          <AppText variant="bodyBold" style={{ fontSize: 10, letterSpacing: 0.8, color }}>
            {v.label}
          </AppText>
        </View>
      </View>
      <View style={styles.scenarioBody}>
        <Metric label="Down Payment" value={fmt(s.down)} />
        <Metric label="Mortgage / mo" value={fmt(s.monthlyPmt)} />
        <Metric label="Gross Revenue / yr" value={fmt(s.grossAnnual)} />
        <Metric label="NOI / yr" value={fmt(s.noi)} />
        <Metric label="DSCR" value={s.dscr.toFixed(2) + "x"} cls={metricClass(s.dscr, 1.25, 1.1)} />
        <Metric label="Cap Rate" value={fmtP(s.capRate)} cls={metricClass(s.capRate, 7, 5)} />
        <Metric label="1% Rule" value={fmtP(s.onePctRule)} cls={metricClass(s.onePctRule, 1.0, 0.8)} />
        <Metric
          label="Annual Net CF"
          value={(isNeg ? "-" : "") + fmt(Math.abs(s.perInvCF))}
          cls={isNeg ? "bad" : "good"}
        />
        <Metric label="Exit Profit (Yr 4)" value={fmt(s.perInvExit)} cls="good" />
        <Metric label="True IRR" value={fmtP(s.irr)} cls={metricClass(s.irr, 18, 12)} />
        <Metric label="Money Multiple" value={s.moic.toFixed(2) + "x"} cls={metricClass(s.moic, 1.8, 1.4)} />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="bodySemibold" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="rgba(248,245,239,0.25)"
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoCapitalize="none"
        style={[styles.input, focused && { borderColor: Colors.gold }]}
      />
    </View>
  );
}

export default function AnalyzeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    address?: string;
    city?: string;
    price?: string;
    units?: string;
    beds?: string;
  }>();
  const { user } = useAuth();
  const { anthropicKey, rentcastKey } = useSettings();

  const [url, setUrl] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [units, setUnits] = useState("4");
  const [beds, setBeds] = useState("2");
  const [rent, setRent] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("unit");
  const [year, setYear] = useState("");
  const [sqft, setSqft] = useState("");
  const [rate, setRate] = useState("6.0");

  const [extracting, setExtracting] = useState(false);
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [analysisKey, setAnalysisKey] = useState("");
  const [aiText, setAiText] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill from navigation params (listing cards / market detail).
  useEffect(() => {
    if (params.city) setCity(String(params.city));
    if (params.price) setPrice(String(params.price));
    if (params.units) setUnits(String(params.units));
    if (params.beds) setBeds(String(params.beds));
    if (params.address) setAddress(String(params.address));
  }, [params.city, params.price, params.units, params.beds, params.address]);

  // Auto rent estimate via RentCast when we have an address and no rent yet.
  useEffect(() => {
    if (!rentcastKey || !address || rent) return;
    getRentEstimate(rentcastKey, address, parseInt(beds, 10) || undefined).then((est) => {
      if (est?.rent) setRent((cur) => (cur ? cur : String(Math.round(est.rent))));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, rentcastKey]);

  async function extractFromUrl() {
    const u = url.trim();
    if (!u) {
      Alert.alert("Paste a URL", "Paste a Zillow or Redfin listing URL first.");
      return;
    }
    if (!anthropicKey) {
      Alert.alert("API key needed", "Add your Anthropic API key in Settings to use URL extraction.", [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => router.push("/settings") },
      ]);
      return;
    }
    setExtracting(true);
    setNotice("");
    const prompt = `A user has provided this property listing URL: ${u}

Based on the URL and address you can infer from it, return ONLY a valid JSON object with no other text:
{
  "address": "full street address",
  "city": "City, ST",
  "price": 445000,
  "units": 4,
  "bedsPerUnit": 2,
  "sqft": 3600,
  "yearBuilt": 1980,
  "estRentPerUnit": 1300
}
If you cannot determine a value, use null.`;
    try {
      const raw = await runClaude(anthropicKey, prompt, 600);
      const prop = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (prop.address) setAddress(String(prop.address));
      if (prop.city) setCity(String(prop.city));
      if (prop.price) setPrice(String(prop.price));
      if (prop.units) setUnits(String(prop.units));
      if (prop.bedsPerUnit) setBeds(String(prop.bedsPerUnit));
      if (prop.estRentPerUnit) setRent(String(prop.estRentPerUnit));
      if (prop.yearBuilt) setYear(String(prop.yearBuilt));
      if (prop.sqft) setSqft(String(prop.sqft));
      setNotice(
        prop.price ? "Details extracted — review and run analysis." : "Partial extraction — fill in the rest manually."
      );
    } catch {
      setNotice("Could not parse that URL automatically. Enter the details manually below.");
    } finally {
      setExtracting(false);
    }
  }

  function run() {
    const p = parseFloat(price) || 0;
    const r = parseFloat(rent) || 0;
    if (!p || !r) {
      Alert.alert("Missing inputs", "Enter at least a purchase price and monthly rent.");
      return;
    }
    const result = runAnalysis({
      price: p,
      units: parseInt(units, 10) || 1,
      bedsPerUnit: parseInt(beds, 10) || 2,
      rentPerUnit: r,
      strategy,
      rate: parseFloat(rate) || 6.0,
    });
    setResults(result);
    setAiText("");
    setAnalysisKey(`analyze-${p}-${units}-${r}-${strategy}-${rate}`);
  }

  async function handleSave() {
    if (!results) return;
    setSaving(true);
    try {
      await saveDeal({
        address: address || city || "Unknown",
        city: city || "Unknown Market",
        price: parseFloat(price) || 0,
        units: parseInt(units, 10) || 1,
        bedsPerUnit: parseInt(beds, 10) || 2,
        rentPerUnit: parseFloat(rent) || 0,
        strategy,
        yearBuilt: parseInt(year, 10) || undefined,
        sqft: parseInt(sqft, 10) || undefined,
        mortgageRate: parseFloat(rate) || 6.0,
        results,
        aiAnalysis: aiText || undefined,
        verdict: results.verdicts.adjl.label,
        irr: results.adjl.irr,
        savedBy: user?.name || "Partner",
      });
      Alert.alert("Saved", "Deal added to your pipeline.", [
        { text: "View Pipeline", onPress: () => router.push("/pipeline") },
        { text: "OK" },
      ]);
    } finally {
      setSaving(false);
    }
  }

  const aiPrompt =
    results && analysisKey
      ? buildAnalyzePrompt({
          city: city || "Unknown Market",
          price: parseFloat(price) || 0,
          units: parseInt(units, 10) || 1,
          beds: parseInt(beds, 10) || 2,
          strategy,
          rent: parseFloat(rent) || 0,
          yearBuilt: parseInt(year, 10) || undefined,
          rate: parseFloat(rate) || 6.0,
          noi: results.adjl.noi,
          dscr: results.adjl.dscr,
          capRate: results.adjl.capRate,
          onePct: results.adjl.onePctRule,
          irr: results.adjl.irr,
          soloIrr: results.solo.irr,
        })
      : "";

  return (
    <TabScaffold>
      <Hero
        title="Property"
        accent="Investment Analyzer."
        subtitle="Paste a Zillow or Redfin URL, or enter details manually. Full analysis across three ownership scenarios."
      />

      {/* URL extraction */}
      <View style={styles.urlRow}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Paste Zillow or Redfin URL…"
          placeholderTextColor="rgba(248,245,239,0.25)"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable style={styles.urlBtn} onPress={extractFromUrl} disabled={extracting}>
          {extracting ? (
            <ActivityIndicator color={Colors.navy} size="small" />
          ) : (
            <AppText variant="bodyBold" style={styles.urlBtnText}>
              EXTRACT
            </AppText>
          )}
        </Pressable>
      </View>

      <AppText variant="bodySemibold" style={styles.or}>
        — OR ENTER DETAILS MANUALLY —
      </AppText>

      {/* Manual form */}
      <View style={styles.form}>
        <AppText variant="bodyBold" style={styles.formTitle}>
          Property Details
        </AppText>
        <Field label="City / Market" value={city} onChange={setCity} placeholder="e.g. College Station, TX" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Purchase Price ($)" value={price} onChange={setPrice} placeholder="445000" numeric />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Monthly Rent / Unit ($)" value={rent} onChange={setRent} placeholder="1300" numeric />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Units" value={units} onChange={setUnits} placeholder="4" numeric />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Beds / Unit" value={beds} onChange={setBeds} placeholder="2" numeric />
          </View>
        </View>

        {/* Strategy toggle */}
        <AppText variant="bodySemibold" style={styles.fieldLabel}>
          Strategy
        </AppText>
        <View style={[styles.row2, { marginBottom: 14 }]}>
          {(
            [
              ["unit", "Per Unit"],
              ["room", "Per Room"],
            ] as [Strategy, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setStrategy(key)}
              style={[styles.stratBtn, strategy === key && styles.stratBtnActive]}
            >
              <AppText
                variant="bodySemibold"
                style={[styles.stratText, strategy === key && { color: Colors.gold }]}
              >
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Year Built" value={year} onChange={setYear} placeholder="1990" numeric />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Sq Ft (total)" value={sqft} onChange={setSqft} placeholder="3600" numeric />
          </View>
        </View>
        <Field label="Mortgage Rate (%)" value={rate} onChange={setRate} placeholder="6.0" numeric />

        {notice ? (
          <AppText variant="body" style={styles.notice}>
            {notice}
          </AppText>
        ) : null}

        <GoldButton label="Run Analysis" onPress={run} />
      </View>

      {/* Results */}
      {results && (
        <View style={{ paddingHorizontal: Spacing.xl }}>
          <View style={styles.summary}>
            <AppText variant="bodyBold" style={styles.summaryTitle}>
              Property Summary
            </AppText>
            <AppText variant="body" style={styles.summaryLine}>
              {(address || city) ?? "—"} · {fmt(parseFloat(price) || 0)} · {units} units
            </AppText>
            <AppText variant="body" style={styles.summarySub}>
              {strategy === "room"
                ? `${beds} beds × ${units} units × $${rent}/bed = ${fmt(results.adjl.effectiveRent)}/mo gross`
                : `${units} units × $${rent}/unit = ${fmt(results.adjl.effectiveRent)}/mo gross`}
            </AppText>
          </View>

          <ScenarioCard s={results.adjl} v={results.verdicts.adjl} />
          <ScenarioCard s={results.deal5} v={results.verdicts.deal5} />
          <ScenarioCard s={results.solo} v={results.verdicts.solo} />

          {aiPrompt ? (
            <AISynopsis
              cacheKey={analysisKey}
              prompt={aiPrompt}
              label="Claude AI Investment Analysis"
              onText={setAiText}
            />
          ) : null}

          <GoldButton label={saving ? "Saving…" : "Save to Pipeline"} onPress={handleSave} disabled={saving} />

          <View style={styles.warnBox}>
            <AppText variant="body" style={styles.warnText}>
              Conservative assumptions: 8% vacancy · 52% expense ratio · 20% down · 12% appreciation
              over 4 years. Actual results vary. Not financial advice.
            </AppText>
          </View>
        </View>
      )}
    </TabScaffold>
  );
}

const styles = StyleSheet.create({
  urlRow: { flexDirection: "row", gap: 9, marginHorizontal: Spacing.xl, marginTop: 4 },
  urlBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    justifyContent: "center",
    minWidth: 86,
    alignItems: "center",
  },
  urlBtnText: { fontSize: 11, letterSpacing: 1.2, color: Colors.navy },
  or: {
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.6,
    color: "rgba(201,168,76,0.35)",
    marginVertical: 14,
  },
  form: {
    marginHorizontal: Spacing.xl,
    backgroundColor: "rgba(27,43,75,0.4)",
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: Colors.gold,
    marginBottom: 14,
  },
  row2: { flexDirection: "row", gap: 10 },
  field: { marginBottom: 13 },
  fieldLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(201,168,76,0.5)",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.cream,
    fontFamily: Fonts.body,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stratBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    paddingVertical: 9,
    alignItems: "center",
  },
  stratBtnActive: { borderColor: Colors.gold, backgroundColor: "rgba(201,168,76,0.08)" },
  stratText: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: Colors.muted },
  notice: { fontSize: 12, color: Colors.goldL, marginBottom: 12 },

  summary: {
    backgroundColor: "rgba(27,43,75,0.5)",
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 14,
  },
  summaryTitle: { fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: Colors.gold, marginBottom: 5 },
  summaryLine: { fontSize: 14, color: Colors.cream },
  summarySub: { fontSize: 12, color: Colors.muted, marginTop: 3 },

  scenario: {
    backgroundColor: "rgba(27,43,75,0.5)",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  scenarioHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "rgba(15,26,46,0.5)",
  },
  scenarioName: { fontSize: 17, color: Colors.cream },
  scenarioSub: { fontSize: 10.5, color: "rgba(201,168,76,0.5)", marginTop: 2 },
  scenarioBody: { paddingHorizontal: 14, paddingVertical: 6 },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.06)",
  },
  metricLabel: { fontSize: 12, color: "rgba(248,245,239,0.5)" },
  metricVal: { fontSize: 14.5, color: Colors.cream },

  warnBox: {
    marginTop: 14,
    backgroundColor: "rgba(201,168,76,0.05)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderLeftWidth: 3,
    borderLeftColor: "rgba(201,168,76,0.3)",
    padding: 12,
  },
  warnText: { fontSize: 11.5, lineHeight: 17, color: "rgba(248,245,239,0.5)" },
});
