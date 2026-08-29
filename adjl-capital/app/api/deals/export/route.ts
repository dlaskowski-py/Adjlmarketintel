import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

// GET /api/deals/export — download the shared pipeline as CSV (Phase 2 §6c).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deals = await prisma.deal.findMany({ orderBy: { savedAt: "desc" } });

  const headers = [
    "Address",
    "City",
    "Price",
    "Units",
    "Beds/Unit",
    "Rent/Unit",
    "Strategy",
    "Verdict",
    "IRR (%)",
    "DSCR",
    "Status",
    "Saved By",
    "Date",
    "Notes",
  ];

  const rows = deals.map((d) => {
    const results = d.results as Record<string, Record<string, number>> | null;
    const adjl = results?.adjl;
    return [
      d.address,
      d.city,
      d.price,
      d.units,
      d.bedsPerUnit,
      d.rentPerUnit,
      d.strategy,
      d.verdict,
      (adjl?.irr ?? d.irr)?.toFixed(1) ?? "",
      adjl?.dscr?.toFixed(2) ?? "",
      d.status,
      d.savedBy,
      new Date(d.savedAt).toLocaleDateString(),
      d.notes ?? "",
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [headers.map(csvCell).join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adjl-pipeline-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
