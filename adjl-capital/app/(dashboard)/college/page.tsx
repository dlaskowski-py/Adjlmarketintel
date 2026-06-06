import { TOP20 } from "@/lib/data/markets";
import MarketExplorer from "@/components/MarketExplorer";

const COLLEGE = TOP20.filter((m) => m.cat.includes("college"));

export default function CollegePage({ searchParams }: { searchParams: { sel?: string } }) {
  return (
    <>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1 className="hero-hl">
              College Towns.
              <br />
              <em>Per-room cash flow.</em>
            </h1>
          </div>
          <p className="hero-sub">
            University markets with strong per-room leasing demand. Click any row for an AI growth
            synopsis, pricing, and ADJL strategy.
          </p>
        </div>
      </div>

      <div className="view-wrap">
        <MarketExplorer markets={COLLEGE} initialSelectedId={searchParams.sel} />
      </div>
    </>
  );
}
