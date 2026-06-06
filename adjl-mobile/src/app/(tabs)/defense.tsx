import { TabScaffold } from "@/components/TabScaffold";
import { Hero, PreviewNote } from "@/components/ui";

export default function DefenseScreen() {
  return (
    <TabScaffold>
      <Hero
        title="Defense & Tech."
        accent="Boom markets."
        subtitle="Military, defense, and tech-driven growth markets with stable workforce-housing demand."
      />
      <PreviewNote text="This tab will list the defense & tech markets from the curated 20, each with AI synopsis and ADJL strategy." />
    </TabScaffold>
  );
}
