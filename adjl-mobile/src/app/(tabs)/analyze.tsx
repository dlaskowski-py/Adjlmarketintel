import { TabScaffold } from "@/components/TabScaffold";
import { Hero, PreviewNote } from "@/components/ui";

export default function AnalyzeScreen() {
  return (
    <TabScaffold>
      <Hero
        title="Property"
        accent="Investment Analyzer."
        subtitle="Enter a property and get a full investment analysis across three ownership scenarios."
      />
      <PreviewNote text="The analyzer form (DSCR, cap rate, IRR across ADJL / investor / solo scenarios) and the BUY · CONDITIONAL · PASS verdict come next." />
    </TabScaffold>
  );
}
