// The canvas's own framing/brainstorm chat.
//
// Talks to whichever provider the user configured (Anthropic Messages, OpenAI
// Responses, or any OpenAI-Chat-compatible host incl. OpenRouter and a local
// Ollama) — see lib/providers/. Streams deltas so text appears as it is
// generated; the previous `claude -p` implementation was replaced because it
// cost ~14s to first token and leaked the ambient Claude Code skill set.

import { streamChat } from "./providers/index.mjs";
import { getEvents } from "./canvas-store.mjs";
import { formatSessionDigest } from "./extractor.mjs";
import { currentSessionDigest, refreshSessionDigestInBackground } from "./session-digest.mjs";
import { TOOLS, runTool } from "./tools.mjs";

const SYSTEM_PROMPT =
  "You are a brainstorming partner helping the user frame a problem or idea " +
  "before any code gets written. Ask sharp, specific clarifying questions — " +
  "one at a time. Keep replies short: 2-4 sentences, plain text, no markdown headers.\n\n" +
  "You can hand work to the coding agent in the attached session by calling " +
  "dispatch_to_agent. Frame first, dispatch second: only call it once you could " +
  "write a brief the agent could act on with no follow-up questions. If the user " +
  "asks you to dispatch, do it even if you'd have asked more questions.";

// A tool call can chain (dispatch, then report) but must not loop forever.
const MAX_TOOL_ROUNDS = 3;

// The chat sees a model-extracted *digest* of the attached coding session, never
// the raw transcript — small, high-signal, and bounded however long the session
// runs. Reads whatever is cached and kicks off a background refresh if stale;
// it never waits on extraction.
function systemPromptFor(canvasId) {
  try {
    refreshSessionDigestInBackground(canvasId);
    return SYSTEM_PROMPT + formatSessionDigest(currentSessionDigest(canvasId));
  } catch {
    // Never let context-loading break the chat.
    return SYSTEM_PROMPT;
  }
}

// Rebuild the conversation from the canvas's append-only event log.
function historyFor(canvasId) {
  return getEvents(canvasId)
    .filter((e) => e.type === "transcript" && e.payload?.text)
    .map((e) => ({
      role: e.payload.role === "assistant" ? "assistant" : "user",
      content: e.payload.text,
    }));
}

/**
 * Stream a brainstorm reply for `userText`.
 *
 * `onDelta(text)` fires per chunk. `onToolCall({name, input})` fires when the
 * model decides to act — the UI uses it to show "dispatching…" rather than
 * leaving a silent gap while the tool runs. Resolves with the full reply text.
 */
export async function streamBrainstormReply(canvasId, userText, { onDelta, onToolCall, signal } = {}) {
  // History already includes the just-logged user message.
  const messages = historyFor(canvasId);
  if (!messages.length || messages[messages.length - 1].content !== userText) {
    messages.push({ role: "user", content: userText });
  }

  const system = systemPromptFor(canvasId);
  let full = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let roundText = "";
    const calls = [];

    for await (const ev of streamChat({ system, messages, tools: TOOLS, signal })) {
      if (ev.type === "text") {
        roundText += ev.text;
        full += ev.text;
        onDelta?.(ev.text);
      } else if (ev.type === "tool_call") {
        calls.push(ev);
      }
    }

    if (!calls.length) break;

    // Record what the model asked for, then feed results back so it can speak
    // about the outcome in the next round.
    messages.push({ role: "assistant", content: roundText || null, toolCalls: calls });
    for (const call of calls) {
      onToolCall?.({ name: call.name, input: call.input });
      const result = await runTool(canvasId, call.name, call.input);
      messages.push({ role: "tool", toolCallId: call.id, name: call.name, result });
    }
  }

  return full;
}
