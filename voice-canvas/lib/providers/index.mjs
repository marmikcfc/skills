// Provider registry + config resolution.
//
// Config lives at ~/.voice-canvas/config.json:
//   { "chat": { "provider": "openai-chat", "model": "anthropic/claude-haiku-4.5",
//               "baseUrl": "https://openrouter.ai/api/v1", "apiKeyEnv": "OPENROUTER_API_KEY" } }
//
// With no config file, the provider is inferred from whichever credential is
// present in the environment, so a user who exports one key is ready to go.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import * as anthropicMessages from "./anthropic-messages.mjs";
import * as openaiResponses from "./openai-responses.mjs";
import * as openaiChat from "./openai-chat.mjs";

const PROVIDERS = {
  [anthropicMessages.id]: anthropicMessages,
  [openaiResponses.id]: openaiResponses,
  [openaiChat.id]: openaiChat,
};

const CONFIG_FILE = path.join(os.homedir(), ".voice-canvas", "config.json");

// Ordered: first credential found wins when there's no explicit config.
const AUTODETECT = [
  { env: "ANTHROPIC_API_KEY", provider: "anthropic-messages", authMode: "api-key" },
  { env: "CLAUDE_CODE_OAUTH_TOKEN", provider: "anthropic-messages", authMode: "oauth-setup-token" },
  { env: "OPENROUTER_API_KEY", provider: "openai-chat", baseUrl: "https://openrouter.ai/api/v1" },
  { env: "OPENAI_API_KEY", provider: "openai-chat" },
];

export function listProviders() {
  return Object.keys(PROVIDERS);
}

export function resolveChatConfig() {
  let fileCfg = {};
  try {
    fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")).chat ?? {};
  } catch {
    // No config file — fall through to autodetect.
  }

  if (fileCfg.provider) {
    if (!PROVIDERS[fileCfg.provider]) {
      throw new Error(
        `Unknown chat provider "${fileCfg.provider}" in ${CONFIG_FILE}. Known: ${listProviders().join(", ")}`
      );
    }
    return fileCfg;
  }

  const detected = AUTODETECT.find((c) => process.env[c.env]);
  if (!detected) {
    throw new Error(
      "No chat credential found. Set one of " +
        AUTODETECT.map((c) => c.env).join(", ") +
        `, or write a provider config to ${CONFIG_FILE}.`
    );
  }
  const { env, ...rest } = detected;
  return { ...rest, apiKeyEnv: env, ...fileCfg };
}

/**
 * Streams events from whichever provider is configured:
 *   { type: "text", text }
 *   { type: "tool_call", id, name, input }
 *
 * `messages` uses one neutral shape across all providers:
 *   { role: "user"|"assistant", content }
 *   { role: "assistant", content?, toolCalls: [{ id, name, input }] }
 *   { role: "tool", toolCallId, name, result }
 * Each provider module translates that into its own wire format, which is what
 * keeps the tool loop in brainstorm-llm.mjs provider-agnostic.
 */
export async function* streamChat({ system, messages, tools, signal, config } = {}) {
  const cfg = config ?? resolveChatConfig();
  const provider = PROVIDERS[cfg.provider];
  if (!provider) {
    throw new Error(`Unknown chat provider "${cfg.provider}". Known: ${listProviders().join(", ")}`);
  }
  yield* provider.streamChat(cfg, { system, messages, tools, signal });
}
