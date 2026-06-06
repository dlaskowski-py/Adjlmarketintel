import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// PATCH /api/deals/:id — update status or notes (must belong to the user).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { status?: string; notes?: string } = {};
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.notes === "string") data.notes = body.notes;

  const deal = await prisma.deal.update({ where: { id: params.id }, data });
  return NextResponse.json({ deal });
}

// DELETE /api/deals/:id — delete a deal (must belong to the user).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
