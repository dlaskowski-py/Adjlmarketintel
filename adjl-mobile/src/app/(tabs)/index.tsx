import { TabScaffold } from "@/components/TabScaffold";
import { Hero, StatBar, SectionHeader, MarketRowCard, PreviewNote, type MarketCard } from "@/components/ui";
import { Colors } from "@/constants/adjl";

const STATS = [
  { value: "50", label: "States Covered" },
  { value: "20", label: "Curated Markets" },
  { value: "$175K", label: "Lowest Entry" },
  { value: "$835K", label: "Highest (HI)" },
  { value: "$355K", label: "National Avg" },
  { value: "2026", label: "Live Data" },
];

const COLLEGE: MarketCard[] = [
  {
    rank: "01",
    city: "College Station, TX",
    driver: "Texas A&M · 74,000+ students",
    median: "$395,000",
    rent: "$1,253/mo",
    growth: "+0.2%",
    growthColor: Colors.greenBright,
    score: 9.5,
    tag: "College",
    tagColor: Colors.greenBright,
  },
  {
    rank: "02",
    city: "Tuscaloosa, AL",
    driver: "University of Alabama · 38,000+ students",
    median: "$280,000",
    rent: "$1,299/mo",
    growth: "+1.9%",
    growthColor: Colors.greenBright,
    score: 9.2,
    tag: "College",
    tagColor: Colors.greenBright,
  },
];

const DEFENSE: MarketCard[] = [
  {
    rank: "01",
    city: "San Antonio, TX",
    driver: "JBSA — 4 Installations · 80,000+ Personnel",
    median: "$284,000",
    rent: "$1,295/mo",
    growth: "+3.1%",
    growthColor: Colors.greenBright,
    score: 9.3,
    tag: "Military",
    tagColor: Colors.blue,
  },
  {
    rank: "03",
    city: "Augusta, GA",
    driver: "US Army Cyber Command · $2B Data Center",
    median: "$207,000",
    rent: "$1,100–1,400",
    growth: "+1.3%",
    growthColor: Colors.greenBright,
    score: 8.7,
    tag: "Defense/Cyber",
    tagColor: Colors.redBright,
  },
];

export default function Top20Screen() {
  return (
    <TabScaffold>
      <Hero
        title="70 Markets."
        accent="Click any to explore."
        subtitle="All 50 states + 20 curated markets. Tap any row for an AI growth synopsis, pricing, and ADJL strategy. June 2026."
      />
      <StatBar stats={STATS} />

      <SectionHeader title="College Town Markets" count="10 Markets" />
      {COLLEGE.map((m) => (
        <MarketRowCard key={m.city} m={m} />
      ))}

      <SectionHeader title="Defense & Tech Boom Markets" count="10 Markets" />
      {DEFENSE.map((m) => (
        <MarketRowCard key={m.city} m={m} />
      ))}

      <PreviewNote text="Tab navigation and the ADJL design system are wired up. Next step: load the full 20-market dataset, the detail panel, and the AI synopsis." />
    </TabScaffold>
  );
}
