import StateExplorer from "@/components/StateExplorer";

export default function StatesPage() {
  return (
    <>
      <div className="hero">
        <div className="hero-row">
          <div>
            <h1 className="hero-hl">
              All 50 States.
              <br />
              <em>Ranked &amp; analyzed.</em>
            </h1>
          </div>
          <p className="hero-sub">
            Median home price, average rent, rent growth, and an ADJL investment rating for every
            state. Click any state for a full AI-powered analysis. June 2026.
          </p>
        </div>
      </div>

      <div className="view-wrap">
        <StateExplorer />
      </div>
    </>
  );
}
