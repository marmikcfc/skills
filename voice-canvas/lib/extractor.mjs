// Background fact-extraction, billed to the user's Claude subscription.
//
// Deliberately uses headless `claude -p` rather than the fast provider API:
// extraction runs in the background (on connect, and after a dispatch finishes),
// so its ~15s latency is irrelevant — and it costs nothing beyond the existing
// subscription, needs no API key, and returns schema-validated JSON via
// --json-schema. The latency that made `claude -p` wrong for interactive chat
// (see reference/claude-p-latency-and-leakage) simply doesn't matter here.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// What the voice agent needs to know about the session it's attached to.
export const SESSION_DIGEST_SCHEMA = {
  type: "object",
  properties: {
    goal: { type: "string", description: "What the user is ultimately trying to accomplish." },
    current_state: { type: "string", description: "Where the work stands right now, in one or two sentences." },
    recent_actions: { type: "array", items: { type: "string" }, description: "Concrete things just done." },
    key_decisions: { type: "array", items: { type: "string" }, description: "Decisions made and why." },
    open_questions: { type: "array", items: { type: "string" }, description: "Unresolved questions or blockers." },
  },
  required: ["goal", "current_state", "recent_actions", "key_decisions", "open_questions"],
  additionalProperties: false,
};

// What the user wants read back after the agent finishes a dispatched task.
export const TRAJECTORY_DIGEST_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "One or two sentences: what was actually done." },
    changes: { type: "array", items: { type: "string" }, description: "Files changed or concrete edits made." },
    verification: { type: "string", description: "What was tested or verified — and plainly, what was NOT." },
    next_steps: { type: "array", items: { type: "string" }, description: "What remains." },
    blockers: { type: "array", items: { type: "string" }, description: "Anything that failed or is stuck. Empty if none." },
  },
  required: ["summary", "changes", "verification", "next_steps", "blockers"],
  additionalProperties: false,
};

/**
 * Run one extraction pass. Returns the parsed object, or null on any failure —
 * extraction is an enhancement and must never break the caller.
 */
export async function extract(prompt, schema, { model = "claude-haiku-4-5", timeoutMs = 300_000 } = {}) {
  try {
    const { stdout } = await execFileAsync(
      "claude",
      ["-p", prompt, "--model", model, "--json-schema", JSON.stringify(schema), "--output-format", "json"],
      { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }
    );
    const envelope = JSON.parse(stdout);
    if (envelope.is_error) {
      debug("extraction returned is_error", envelope.result);
      return null;
    }
    return JSON.parse(envelope.result);
  } catch (err) {
    // Never break the caller — but never fail invisibly either. A silent null
    // here is indistinguishable from "nothing to extract", which costs far more
    // time to diagnose than the log line costs to emit.
    debug(err.killed ? `timed out after ${timeoutMs}ms` : err.message);
    return null;
  }
}

function debug(...args) {
  if (process.env.VOICE_CANVAS_DEBUG) console.error("[extractor]", ...args);
}

const SESSION_PROMPT = (transcript) =>
  `Below is the recent transcript of a coding session. Extract a compact digest a ` +
  `voice assistant can read to bring someone up to speed. Be concrete and specific — ` +
  `name real files, decisions, and findings rather than generalities. If something ` +
  `was left unverified or failed, say so.\n\n<transcript>\n${transcript}\n</transcript>`;

export function extractSessionDigest(transcript, opts) {
  return extract(SESSION_PROMPT(transcript), SESSION_DIGEST_SCHEMA, opts);
}

const TRAJECTORY_PROMPT = (trajectory) =>
  `Below is the full trajectory of work an agent just performed. Extract what the ` +
  `user needs to know: what was done, what changed, what was actually verified ` +
  `versus merely claimed, and what remains. Report failures plainly — do not ` +
  `describe unverified work as complete.\n\n<trajectory>\n${trajectory}\n</trajectory>`;

export function extractTrajectoryDigest(trajectory, opts) {
  return extract(TRAJECTORY_PROMPT(trajectory), TRAJECTORY_DIGEST_SCHEMA, opts);
}

// Render a session digest as a compact prompt block for the voice agent.
export function formatSessionDigest(d) {
  if (!d) return "";
  const list = (label, items) =>
    items?.length ? `\n${label}:\n${items.map((i) => `- ${i}`).join("\n")}` : "";
  return `\n\n<connected_session>
This canvas is attached to a live coding session. This digest describes the work
actually in progress — when the user asks what is happening or refers to "this
session", answer from this.

Goal: ${d.goal}
Current state: ${d.current_state}${list("Recent actions", d.recent_actions)}${list("Key decisions", d.key_decisions)}${list("Open questions", d.open_questions)}
</connected_session>`;
}
