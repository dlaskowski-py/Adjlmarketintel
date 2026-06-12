// Anthropic API — called directly from the app with the user-entered key
// (native fetch, no CORS). Model pinned per spec.
const MODEL = "claude-sonnet-4-20250514";

export async function runClaude(
  apiKey: string,
  prompt: string,
  maxTokens = 1000
): Promise<string> {
  if (!apiKey) throw new Error("missing-key");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("invalid-key");
    throw new Error(`claude-${res.status}`);
  }

  const data = await res.json();
  const text = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("empty-response");
  return text;
}

// Lightweight key check used by the Settings screen.
export async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    await runClaude(apiKey, "Reply with the single word: ok", 8);
    return true;
  } catch {
    return false;
  }
}
