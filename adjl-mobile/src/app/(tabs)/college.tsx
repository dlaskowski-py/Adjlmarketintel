import { TabScaffold } from "@/components/TabScaffold";
import { Hero, PreviewNote } from "@/components/ui";

export default function CollegeScreen() {
  return (
    <TabScaffold>
      <Hero
        title="College Towns."
        accent="Per-room cash flow."
        subtitle="University markets with strong per-room leasing demand and accessible entry prices."
      />
      <PreviewNote text="This tab will show the college-town markets filtered from the curated 20, each tappable for full AI analysis." />
    </TabScaffold>
  );
}
