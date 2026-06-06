import PipelineTable from "@/components/PipelineTable";

export default function PipelinePage() {
  return (
    <div className="view-wrap" style={{ paddingTop: "1.5rem" }}>
      <h2
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: "1.7rem",
          fontWeight: 300,
          color: "var(--cream)",
          marginBottom: "1.2rem",
        }}
      >
        My <em style={{ fontStyle: "italic", color: "var(--gold)" }}>Pipeline</em>
      </h2>
      <PipelineTable />
    </div>
  );
}
