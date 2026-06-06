import { TOP20 } from "@/lib/data/markets";
import MarketExplorer from "@/components/MarketExplorer";

const DEFENSE = TOP20.filter((m) => !m.cat.includes("college"));

export default function DefensePage({ searchParams }: { searchParams: { sel?: string } }) {
  return (
    <>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1 className="hero-hl">
              Defense &amp; Tech.
              <br />
              <em>Boom markets.</em>
            </h1>
          </div>
          <p className="hero-sub">
            Military, defense, and tech-driven growth markets with stable workforce-housing demand.
            Click any row for full AI analysis.
          </p>
        </div>
      </div>

      <div className="view-wrap">
        <MarketExplorer markets={DEFENSE} initialSelectedId={searchParams.sel} />
      </div>
    </>
  );
}
