import { TabScaffold } from "@/components/TabScaffold";
import { Hero, PreviewNote } from "@/components/ui";

export default function CompareScreen() {
  return (
    <TabScaffold>
      <Hero
        title="All 70 Markets."
        accent="Side by side."
        subtitle="The 20 curated markets and all 50 states in one comparable table — price, rent, growth, score."
      />
      <PreviewNote text="The full side-by-side comparison table arrives once the market and state datasets are wired in." />
    </TabScaffold>
  );
}
