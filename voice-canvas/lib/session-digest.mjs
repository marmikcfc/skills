// Orchestrates: read the attached session's transcript -> extract a digest with
// a model -> cache it. The voice/chat agent reads only the cached digest, never
// the raw transcript, so its context stays small and high-signal regardless of
// how long the coding session runs.
//
// Extraction is always backgrounded. Chat never blocks on it: a canvas with no
// digest yet simply has no session context for that turn.

import fs from "node:fs";
import { readSessionContext, transcriptPath } from "./session-context.mjs";
import { extractSessionDigest } from "./extractor.mjs";
import { getCanvas, saveSessionDigest, getSessionDigest } from "./canvas-store.mjs";

// Re-extract once the transcript has grown this much past the last extraction.
const STALE_GROWTH_BYTES = 50_000;

// Extraction reads a wider window than the chat ever would — the model compresses it.
const EXTRACT_WINDOW = { maxTurns: 40, maxCharsPerTurn: 1500, maxTotalChars: 25_000 };

const inFlight = new Set(); // canvasId — avoid stacking concurrent extractions

function transcriptSize(canvas) {
  try {
    return fs.statSync(transcriptPath(canvas.session_id, canvas.project_path)).size;
  } catch {
    return null;
  }
}

function isStale(cached, size) {
  if (!cached) return true;
  if (size == null || cached.sourceSize == null) return false;
  return size - cached.sourceSize > STALE_GROWTH_BYTES;
}

/**
 * Kick off extraction if the cached digest is missing or stale.
 * Returns immediately; resolves when any started extraction completes.
 */
export async function refreshSessionDigest(canvasId, { force = false } = {}) {
  if (inFlight.has(canvasId)) return null;

  const canvas = getCanvas(canvasId);
  if (!canvas || canvas.tool !== "claude") return null;

  const size = transcriptSize(canvas);
  const cached = getSessionDigest(canvasId);
  if (!force && !isStale(cached, size)) return cached?.digest ?? null;

  const ctx = readSessionContext(
    { tool: canvas.tool, sessionId: canvas.session_id, cwd: canvas.project_path },
    EXTRACT_WINDOW
  );
  if (!ctx || ctx.unsupported || !ctx.turns?.length) return null;

  const header = [
    ctx.title ? `Session title: ${ctx.title}` : null,
    ctx.cwd ? `Directory: ${ctx.cwd}` : null,
    ctx.gitBranch ? `Branch: ${ctx.gitBranch}` : null,
  ].filter(Boolean).join("\n");

  const body = ctx.turns
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`)
    .join("\n\n");

  inFlight.add(canvasId);
  try {
    const digest = await extractSessionDigest(`${header}\n\n${body}`);
    if (digest) {
      saveSessionDigest(canvasId, digest, size);
      return digest;
    }
    return null;
  } finally {
    inFlight.delete(canvasId);
  }
}

// Fire-and-forget refresh — for call sites that must not wait (chat, connect).
export function refreshSessionDigestInBackground(canvasId, opts) {
  refreshSessionDigest(canvasId, opts).catch(() => {});
}

// What the chat agent reads. Never triggers extraction itself.
export function currentSessionDigest(canvasId) {
  return getSessionDigest(canvasId)?.digest ?? null;
}
