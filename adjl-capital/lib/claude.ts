import Anthropic from "@anthropic-ai/sdk";

// Spec pins claude-sonnet-4-20250514; allow an env override without changing
// the default. Server-side only — the API key is never exposed to the client.
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function runClaude(prompt: string, maxTokens = 1000): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY not configured");

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text;
}
