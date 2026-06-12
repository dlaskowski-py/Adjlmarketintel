import { useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { Hero, MarketRow } from "@/components/ui";
import { TOP20 } from "@/data/markets";

const COLLEGE = TOP20.filter((m) => m.cat.includes("college"));

export default function CollegeScreen() {
  const router = useRouter();
  return (
    <TabScaffold>
      <Hero
        title="College Towns."
        accent="Per-room cash flow."
        subtitle="University markets with strong per-room leasing demand and accessible entry prices. Tap any market for full AI analysis."
      />
      {COLLEGE.map((m) => (
        <MarketRow key={m.id} market={m} onPress={() => router.push(`/market/${m.id}`)} />
      ))}
    </TabScaffold>
  );
}
