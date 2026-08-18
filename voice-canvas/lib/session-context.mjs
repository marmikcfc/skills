// Reads the transcript of the coding session a canvas is attached to, so the
// brainstorm chat can answer questions about the work actually in progress.
//
// Claude Code writes one JSONL transcript per session at:
//   ~/.claude/projects/<cwd, slashes replaced by dashes>/<session-id>.jsonl
//
// These get large (10-17MB observed), so we tail-read a bounded window rather
// than loading the file — and cap the extracted text before it reaches a prompt.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULTS = {
  maxTurns: 12,          // most recent turns to consider
  maxCharsPerTurn: 700,  // truncate any single long turn
  maxTotalChars: 6000,   // hard ceiling on the whole injected block
  tailBytes: 2_000_000,  // only the last ~2MB of the file is ever read
};

// /Users/me/skills -> -Users-me-skills
export function projectSlug(cwd) {
  return cwd.replace(/\//g, "-");
}

export function transcriptPath(sessionId, cwd) {
  return path.join(os.homedir(), ".claude", "projects", projectSlug(cwd), `${sessionId}.jsonl`);
}

// Read at most `tailBytes` from the end of a file, dropping the leading
// partial line so every returned line is parseable.
function readTail(file, tailBytes) {
  const { size } = fs.statSync(file);
  const start = Math.max(0, size - tailBytes);
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const text = buf.toString("utf8");
    return start === 0 ? text : text.slice(text.indexOf("\n") + 1);
  } finally {
    fs.closeSync(fd);
  }
}

// Content is either a plain string or an array of blocks.
function blockText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Extract a bounded, prompt-ready summary of a Claude Code session.
 * Returns null when there's no transcript (unknown/new session).
 */
export function readClaudeSessionContext(sessionId, cwd, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const file = transcriptPath(sessionId, cwd);
  if (!fs.existsSync(file)) return null;

  const lines = readTail(file, o.tailBytes).split("\n");

  let title = null, gitBranch = null;
  const turns = [];

  // Walk backwards — we want the most recent turns.
  for (let i = lines.length - 1; i >= 0 && turns.length < o.maxTurns; i--) {
    const line = lines[i];
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }

    // Claude Code regenerates this throughout the session; walking backwards
    // means the first one we hit is the most recent. Field is `aiTitle`.
    if (!title && rec.type === "ai-title" && rec.aiTitle) title = rec.aiTitle;
    if (!gitBranch && rec.gitBranch) gitBranch = rec.gitBranch;

    if (rec.type !== "user" && rec.type !== "assistant") continue;
    if (rec.isSidechain) continue; // subagent chatter, not the main thread

    let text = blockText(rec.message?.content).trim();
    if (!text) continue;
    // Skip harness-injected noise so it doesn't crowd out real conversation.
    if (text.startsWith("<") && text.includes("system-reminder")) continue;

    if (text.length > o.maxCharsPerTurn) text = text.slice(0, o.maxCharsPerTurn) + "…";
    turns.push({ role: rec.type, text });
  }

  turns.reverse();
  if (!turns.length) return null;

  // Enforce the global budget, dropping oldest turns first.
  let total = turns.reduce((n, t) => n + t.text.length, 0);
  let truncated = false;
  while (total > o.maxTotalChars && turns.length > 1) {
    total -= turns.shift().text.length;
    truncated = true;
  }

  return { title, cwd, gitBranch, turns, truncated, transcript: file };
}

// Dispatches on the canvas's tool. Codex rollouts live elsewhere
// (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) and aren't wired up yet.
export function readSessionContext({ tool, sessionId, cwd }, opts = {}) {
  if (!sessionId || !cwd) return null;
  if (tool === "codex") return { unsupported: "codex" };
  if (tool !== "claude") return null;
  return readClaudeSessionContext(sessionId, cwd, opts);
}

// Render as a prompt block. Returns "" when there's nothing useful to add.
export function formatSessionContext(ctx) {
  if (!ctx) return "";
  if (ctx.unsupported) {
    return `\n\n<connected_session>\nA ${ctx.unsupported} session is attached, but reading its transcript isn't supported yet — you cannot see what it is doing.\n</connected_session>`;
  }

  const head = [
    ctx.title ? `Title: ${ctx.title}` : null,
    ctx.cwd ? `Directory: ${ctx.cwd}` : null,
    ctx.gitBranch ? `Branch: ${ctx.gitBranch}` : null,
  ].filter(Boolean).join("\n");

  const body = ctx.turns
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`)
    .join("\n\n");

  return `\n\n<connected_session>
This canvas is attached to a live coding session. Below is its recent history —
this is the work actually in progress. When the user asks what is happening, what
you are working on, or refers to "this session", answer from this, not from the
canvas chat above.${ctx.truncated ? " (Older turns omitted.)" : ""}

${head}

${body}
</connected_session>`;
}
