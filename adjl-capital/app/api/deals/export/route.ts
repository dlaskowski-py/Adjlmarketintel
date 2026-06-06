import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/deals/export — download all of the user's deals as CSV.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deals = await prisma.deal.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: "desc" },
  });

  const headers = [
    "Address",
    "City",
    "Price",
    "Units",
    "Beds/Unit",
    "Rent/Unit",
    "Strategy",
    "Mortgage Rate",
    "Verdict",
    "IRR",
    "Status",
    "Saved By",
    "Saved At",
    "Notes",
  ];

  const rows = deals.map((d) =>
    [
      d.address,
      d.city,
      d.price,
      d.units,
      d.bedsPerUnit,
      d.rentPerUnit,
      d.strategy,
      d.mortgageRate,
      d.verdict,
      d.irr,
      d.status,
      d.savedBy,
      d.savedAt.toISOString(),
      d.notes ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="adjl-pipeline.csv"',
    },
  });
}
