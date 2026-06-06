import AnalyzerForm from "@/components/AnalyzerForm";

export default function AnalyzePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const prefill = {
    city: searchParams.city,
    price: searchParams.price,
    units: searchParams.units,
    beds: searchParams.beds,
    rent: searchParams.rent,
    year: searchParams.year,
    sqft: searchParams.sqft,
    rate: searchParams.rate,
  };

  return (
    <div className="view-wrap">
      <div className="az-wrap">
        <div className="az-hero">
          <h2 className="az-hl">
            Property <em>Investment Analyzer</em>
          </h2>
          <p className="az-sub">
            Paste a Zillow or Redfin URL, or enter property details manually.
            <br />
            Get a full investment analysis across three ownership scenarios side by side.
          </p>
        </div>

        <AnalyzerForm prefill={prefill} />
      </div>
    </div>
  );
}
