#!/usr/bin/env node
// The real /canvas entry point: ensures the server is running, finds-or-creates
// the canvas for the CURRENT session (via CLAUDE_CODE_SESSION_ID / CODEX_*),
// and prints the canvas-specific URL. See VOI-7 + VOI-8.

import { ensureServerRunning } from "./ensure-canvas-server.mjs";
import { findOrCreateCanvas, setMessagingInbox } from "../lib/canvas-store.mjs";

function detectSession() {
  const claudeSessionId = process.env.CLAUDE_CODE_SESSION_ID;
  if (claudeSessionId) {
    return { sessionId: claudeSessionId, tool: "claude" };
  }
  const codexThreadId = process.env.CODEX_THREAD_ID ?? process.env.CODEX_SESSION_ID;
  if (codexThreadId) {
    return { sessionId: codexThreadId, tool: "codex" };
  }
  return null;
}

async function main() {
  const session = detectSession();
  if (!session) {
    console.error(
      "Could not detect a session ID (CLAUDE_CODE_SESSION_ID / CODEX_THREAD_ID not set). " +
      "Run this from inside a Claude Code or Codex session."
    );
    process.exit(1);
  }

  const { port } = await ensureServerRunning();
  const { canvas, created } = findOrCreateCanvas(session.sessionId, {
    tool: session.tool,
    cwd: process.cwd(),
  });

  // This process runs *inside* the session, so it inherits the session's inbox
  // credentials — the one moment they're available without discovery. The
  // canvas server is a long-lived singleton and never sees them otherwise.
  const socket = process.env.CLAUDE_CODE_MESSAGING_SOCKET;
  if (socket) {
    setMessagingInbox(canvas.id, socket, process.env.CLAUDE_CODE_MESSAGING_TOKEN ?? null);
  }

  console.log(`http://127.0.0.1:${port}/c/${canvas.id}`);
  console.error(created ? "(new canvas)" : "(reused existing canvas for this session)");
  if (!socket && session.tool === "claude") {
    console.error(
      "Note: this session has no messaging socket, so dispatch will fall back to " +
      "discovery via `claude agents --json`."
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
