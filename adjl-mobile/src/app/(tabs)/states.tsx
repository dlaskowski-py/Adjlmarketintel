import { TabScaffold } from "@/components/TabScaffold";
import { Hero, PreviewNote } from "@/components/ui";

export default function StatesScreen() {
  return (
    <TabScaffold>
      <Hero
        title="All 50 States."
        accent="Ranked & analyzed."
        subtitle="Median home price, average rent, rent growth, and an ADJL investment rating for every state."
      />
      <PreviewNote text="The sortable 50-state list (A–Z, price, hottest) and per-state AI analysis land in the next build step." />
    </TabScaffold>
  );
}
