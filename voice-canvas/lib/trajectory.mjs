// After dispatched work finishes, extract what actually happened from the
// agent's response trajectory — the transcript written since the dispatch —
// and put *that* in the canvas, so the user learns what was done without
// reading a raw tool-call log.
//
// Extraction is subscription-backed (`claude -p`, see lib/extractor.mjs); it
// runs after the work completes, so latency doesn't matter.

import fs from "node:fs";
import { transcriptPath } from "./session-context.mjs";
import { extractTrajectoryDigest } from "./extractor.mjs";
import { getCanvas, setDispatchOffset, logEvent } from "./canvas-store.mjs";

// Cap how much trajectory is fed to the extractor — a long agent run can write
// megabytes. We keep the most recent slice, which is where conclusions live.
const MAX_TRAJECTORY_CHARS = 60_000;

function transcriptFor(canvas) {
  if (!canvas?.session_id || !canvas?.project_path) return null;
  if (canvas.tool !== "claude") return null;
  const file = transcriptPath(canvas.session_id, canvas.project_path);
  return fs.existsSync(file) ? file : null;
}

/** Record where the transcript stood when work was dispatched. */
export function markDispatchStart(canvasId) {
  const file = transcriptFor(getCanvas(canvasId));
  const offset = file ? fs.statSync(file).size : 0;
  setDispatchOffset(canvasId, offset);
  return offset;
}

/** Read the transcript written since `fromOffset`, as flattened turn text. */
export function readTrajectorySince(canvasId, fromOffset) {
  const canvas = getCanvas(canvasId);
  const file = transcriptFor(canvas);
  if (!file) return null;

  const { size } = fs.statSync(file);
  const start = Math.max(0, Math.min(fromOffset ?? 0, size));
  if (size - start <= 0) return null;

  const fd = fs.openSync(file, "r");
  let text;
  try {
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    text = buf.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
  // Drop the leading partial line unless we started at the very beginning.
  if (start > 0) text = text.slice(text.indexOf("\n") + 1);

  const turns = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    if (rec.type !== "user" && rec.type !== "assistant") continue;

    const content = rec.message?.content;
    let body = "";
    if (typeof content === "string") {
      body = content;
    } else if (Array.isArray(content)) {
      // Keep tool activity — it's the evidence of what was actually done.
      body = content
        .map((b) => {
          if (b?.type === "text") return b.text;
          if (b?.type === "tool_use") return `[tool: ${b.name}] ${JSON.stringify(b.input).slice(0, 300)}`;
          if (b?.type === "tool_result") {
            const t = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
            return `[result] ${String(t).slice(0, 400)}`;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
    body = body.trim();
    if (!body || (body.startsWith("<") && body.includes("system-reminder"))) continue;
    turns.push(`${rec.type === "user" ? "User" : "Assistant"}: ${body}`);
  }

  if (!turns.length) return null;
  let joined = turns.join("\n\n");
  if (joined.length > MAX_TRAJECTORY_CHARS) {
    joined = "…(earlier trajectory omitted)…\n\n" + joined.slice(-MAX_TRAJECTORY_CHARS);
  }
  return joined;
}

/**
 * Extract a digest of what the agent just did. Returns null when there's no
 * new trajectory or extraction fails.
 */
export async function extractDispatchOutcome(canvasId, { fromOffset } = {}) {
  const canvas = getCanvas(canvasId);
  if (!canvas) return null;

  const start = fromOffset ?? canvas.dispatch_offset ?? 0;
  const trajectory = readTrajectorySince(canvasId, start);
  if (!trajectory) return null;

  const digest = await extractTrajectoryDigest(trajectory);
  if (!digest) return null;

  logEvent(canvasId, "outcome", { digest, fromOffset: start });
  return digest;
}

/** Render an outcome digest as the message the user reads (or hears). */
export function formatOutcome(d) {
  if (!d) return "";
  const list = (label, items) =>
    items?.length ? `\n\n${label}:\n${items.map((i) => `• ${i}`).join("\n")}` : "";
  return (
    d.summary +
    list("Changes", d.changes) +
    (d.verification ? `\n\nVerification: ${d.verification}` : "") +
    list("Blockers", d.blockers) +
    list("Next", d.next_steps)
  );
}
