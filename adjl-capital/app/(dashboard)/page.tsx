import { TOP20 } from "@/lib/data/markets";
import MarketExplorer from "@/components/MarketExplorer";

export default function Top20Page() {
  return (
    <>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1 className="hero-hl">
              70 Markets.
              <br />
              <em>Click any to explore.</em>
            </h1>
          </div>
          <p className="hero-sub">
            All 50 states + 20 curated markets. Click any row for an AI-powered growth synopsis,
            median home price, rental data, and ADJL investment strategy. June 2026.
          </p>
        </div>
        <div className="sbar">
          <div className="sc">
            <span className="sv">50</span>
            <span className="sl">States Covered</span>
          </div>
          <div className="sc">
            <span className="sv">20</span>
            <span className="sl">Curated Markets</span>
          </div>
          <div className="sc">
            <span className="sv">$175K</span>
            <span className="sl">Lowest Entry</span>
          </div>
          <div className="sc">
            <span className="sv">$835K</span>
            <span className="sl">Highest (HI)</span>
          </div>
          <div className="sc">
            <span className="sv">$355K</span>
            <span className="sl">National Avg</span>
          </div>
          <div className="sc">
            <span className="sv">2026</span>
            <span className="sl">Live Data</span>
          </div>
        </div>
      </div>

      <div className="view-wrap">
        <MarketExplorer markets={TOP20} withFilter grouped />
      </div>
    </>
  );
}
