import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

// GET /api/deals — the shared pipeline: all deals across all three partners,
// newest first (Phase 2 §6a — no userId filter).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deals = await prisma.deal.findMany({
    orderBy: { savedAt: "desc" },
  });
  return NextResponse.json({ deals });
}

// POST /api/deals — create a new deal.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const required = ["address", "city", "price", "units", "bedsPerUnit", "rentPerUnit", "strategy", "mortgageRate", "verdict", "irr"];
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        userId: session.user.id,
        address: String(body.address),
        sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
        city: String(body.city),
        price: Number(body.price),
        units: Number(body.units),
        bedsPerUnit: Number(body.bedsPerUnit),
        rentPerUnit: Number(body.rentPerUnit),
        strategy: String(body.strategy),
        yearBuilt: body.yearBuilt != null && body.yearBuilt !== "" ? Number(body.yearBuilt) : null,
        sqft: body.sqft != null && body.sqft !== "" ? Number(body.sqft) : null,
        mortgageRate: Number(body.mortgageRate),
        results: (body.results ?? {}) as Prisma.InputJsonValue,
        aiAnalysis: body.aiAnalysis ? String(body.aiAnalysis) : null,
        verdict: String(body.verdict),
        irr: Number(body.irr),
        notes: body.notes ? String(body.notes) : null,
        savedBy: session.user.name || session.user.email || "Unknown",
      },
    });
    return NextResponse.json({ deal }, { status: 201 });
  } catch (err) {
    console.error("[/api/deals POST]", err);
    return NextResponse.json({ error: "Could not save deal" }, { status: 500 });
  }
}
