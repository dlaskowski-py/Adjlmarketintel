import { useRouter } from "expo-router";
import { TabScaffold } from "@/components/TabScaffold";
import { Hero, MarketRow } from "@/components/ui";
import { TOP20 } from "@/data/markets";

const DEFENSE = TOP20.filter((m) => !m.cat.includes("college"));

export default function DefenseScreen() {
  const router = useRouter();
  return (
    <TabScaffold>
      <Hero
        title="Defense & Tech."
        accent="Boom markets."
        subtitle="Military, defense, and tech-driven growth markets with stable workforce-housing demand. Tap any market for full AI analysis."
      />
      {DEFENSE.map((m) => (
        <MarketRow key={m.id} market={m} onPress={() => router.push(`/market/${m.id}`)} />
      ))}
    </TabScaffold>
  );
}
