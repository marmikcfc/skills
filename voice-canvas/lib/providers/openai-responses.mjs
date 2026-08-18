// OpenAI Responses API (POST /v1/responses) — OpenAI's current-generation endpoint.
// Streams `response.output_text.delta` events.

import { readSSE, requireCredential } from "./sse.mjs";

export const id = "openai-responses";
export const defaultBaseUrl = "https://api.openai.com";
export const defaultModel = "gpt-5.2";
export const defaultApiKeyEnv = { "api-key": "OPENAI_API_KEY" };

export async function* streamChat(cfg, { system, messages, tools, signal }) {
  const credential = requireCredential(cfg.apiKeyEnv ?? defaultApiKeyEnv["api-key"]);

  // Responses takes a flat `input` list; the system prompt rides as `instructions`.
  // Tool calls and their outputs are peer items in that list, not nested in a
  // message — which is why this flattens rather than maps 1:1.
  const input = messages.flatMap((m) => {
    if (m.role === "tool") {
      return [{ type: "function_call_output", call_id: m.toolCallId, output: m.result }];
    }
    const items = [];
    if (m.content) {
      items.push({
        role: m.role,
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
      });
    }
    for (const t of m.toolCalls ?? []) {
      items.push({
        type: "function_call",
        call_id: t.id,
        name: t.name,
        arguments: JSON.stringify(t.input ?? {}),
      });
    }
    return items;
  });

  const res = await fetch(`${cfg.baseUrl ?? defaultBaseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${credential}`,
    },
    signal,
    body: JSON.stringify({
      model: cfg.model ?? defaultModel,
      stream: true,
      ...(system ? { instructions: system } : {}),
      ...(cfg.maxTokens ? { max_output_tokens: cfg.maxTokens } : {}),
      ...(tools?.length
        ? {
            tools: tools.map((t) => ({
              type: "function",
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })),
          }
        : {}),
      input,
    }),
  });

  // Function calls arrive as output items; arguments stream separately and are
  // keyed by output_index.
  const pending = new Map();

  for await (const event of readSSE(res)) {
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      yield { type: "text", text: event.delta };
    }
    if (event.type === "response.output_item.added" && event.item?.type === "function_call") {
      pending.set(event.output_index, { id: event.item.call_id, name: event.item.name, json: "" });
    }
    if (event.type === "response.function_call_arguments.delta") {
      const slot = pending.get(event.output_index);
      if (slot) slot.json += event.delta ?? "";
    }
    if (event.type === "response.output_item.done" && pending.has(event.output_index)) {
      const slot = pending.get(event.output_index);
      pending.delete(event.output_index);
      // The done event carries the complete arguments; prefer it over our
      // accumulation, which can miss fragments if a delta was dropped.
      const json = event.item?.arguments ?? slot.json;
      yield { type: "tool_call", id: slot.id, name: slot.name, input: safeParse(json) };
    }
    if (event.type === "error" || event.type === "response.failed") {
      throw new Error(`openai responses stream error: ${event.error?.message ?? "unknown"}`);
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
