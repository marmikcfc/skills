// Shared SSE reader. Yields parsed `data:` payloads from a fetch Response body.
// All three provider wire formats are SSE; only the payload shape differs.

export async function* readSSE(response) {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 400)}` : ""}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          yield JSON.parse(payload);
        } catch {
          // Ignore non-JSON keepalive frames.
        }
      }
    }
  }
}

// Resolve a credential from the environment, with a clear error naming the var.
export function requireCredential(envName) {
  const value = process.env[envName];
  if (!value) {
    throw new Error(
      `Missing credential: set ${envName} in your environment (or point chat.apiKeyEnv at a different variable in ~/.voice-canvas/config.json).`
    );
  }
  return value;
}
