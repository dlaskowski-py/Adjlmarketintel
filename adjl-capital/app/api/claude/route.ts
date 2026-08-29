import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runClaude } from "@/lib/claude";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/claude
// Body: { prompt: string } → { text: string }
// - Requires a valid NextAuth session (401 otherwise)
// - Rate limit: 20 requests per user per minute
// - Uses claude-sonnet-4-20250514, max_tokens: 1000
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userKey = session.user.id || session.user.email || "anon";
  if (!rateLimit(`claude:${userKey}`, 20, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again shortly." }, { status: 429 });
  }

  let prompt = "";
  try {
    const body = await req.json();
    prompt = typeof body?.prompt === "string" ? body.prompt : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!prompt.trim()) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    const text = await runClaude(prompt, 1000);
    if (!text) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/claude]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }
}
