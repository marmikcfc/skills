// OpenAI Chat Completions API (POST /v1/chat/completions).
// This is the lingua franca shape — the same adapter serves OpenAI, OpenRouter,
// Together, Groq, LM Studio, Ollama, and anything else that speaks it. Point
// `baseUrl` at the host and set the credential env var.
//
//   OpenRouter → baseUrl "https://openrouter.ai/api/v1", apiKeyEnv "OPENROUTER_API_KEY"
//   Ollama     → baseUrl "http://localhost:11434/v1",    apiKeyEnv unused (any value)

import { readSSE, requireCredential } from "./sse.mjs";

export const id = "openai-chat";
export const defaultBaseUrl = "https://api.openai.com/v1";
export const defaultModel = "gpt-5.2";
export const defaultApiKeyEnv = { "api-key": "OPENAI_API_KEY" };

// Neutral history -> Chat Completions shape.
function toWire(messages) {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: m.toolCallId, content: m.result };
    }
    if (m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content ?? null,
        tool_calls: m.toolCalls.map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  });
}

export async function* streamChat(cfg, { system, messages, tools, signal }) {
  const credential = requireCredential(cfg.apiKeyEnv ?? defaultApiKeyEnv["api-key"]);
  const baseUrl = cfg.baseUrl ?? defaultBaseUrl;

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${credential}`,
  };
  // OpenRouter uses these for attribution/rankings; harmless elsewhere.
  if (baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://github.com/marmikcfc/skills";
    headers["X-Title"] = "voice-canvas";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: cfg.model ?? defaultModel,
      stream: true,
      ...(cfg.maxTokens ? { max_tokens: cfg.maxTokens } : {}),
      ...(tools?.length
        ? {
            tools: tools.map((t) => ({
              type: "function",
              function: { name: t.name, description: t.description, parameters: t.parameters },
            })),
          }
        : {}),
      messages: (() => {
        const wire = toWire(messages);
        return system ? [{ role: "system", content: system }, ...wire] : wire;
      })(),
    }),
  });

  // tool_calls stream as fragments keyed by `index`; id/name arrive on the
  // first fragment, arguments accumulate across the rest.
  const pending = new Map();

  for await (const event of readSSE(res)) {
    const choice = event.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === "string" && delta) yield { type: "text", text: delta };

    for (const tc of choice?.delta?.tool_calls ?? []) {
      const slot = pending.get(tc.index) ?? { id: null, name: "", json: "" };
      if (tc.id) slot.id = tc.id;
      if (tc.function?.name) slot.name = tc.function.name;
      if (tc.function?.arguments) slot.json += tc.function.arguments;
      pending.set(tc.index, slot);
    }

    // Unlike Anthropic there is no per-block stop event — the finish reason is
    // the only signal that arguments are complete.
    if (choice?.finish_reason === "tool_calls") {
      for (const slot of pending.values()) {
        yield { type: "tool_call", id: slot.id, name: slot.name, input: safeParse(slot.json) };
      }
      pending.clear();
    }

    if (event.error) {
      throw new Error(`openai-chat stream error: ${event.error.message ?? "unknown"}`);
    }
  }
}

function safeParse(json) {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}
