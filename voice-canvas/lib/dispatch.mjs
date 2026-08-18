// Dispatch a brief into a LIVE coding session — without closing or forking it.
//
// Claude Code: each interactive session listens on a Unix socket
// (/tmp/cc-socks/<pid>.sock) and accepts newline-delimited JSON. Writing a
// user message there injects a real turn into the running TUI — the same
// mechanism the built-in cross-session messaging uses. The protocol is exactly:
//
//     {"type":"auth","token":"<CLAUDE_CODE_MESSAGING_TOKEN>"}   <- when auth is on
//     {"type":"user","message":{"role":"user","content":"…"}}
//
// NOT `claude --resume <id> -p`: that forks a disk-only branch the open
// terminal never sees. Verified — see reference/live-dispatch-mechanism.

import net from "node:net";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getCanvas, logEvent, setStatus } from "./canvas-store.mjs";
import { markDispatchStart } from "./trajectory.mjs";

const execFileAsync = promisify(execFile);

const CONNECT_TIMEOUT_MS = 5_000;

/** Write the auth + message lines to a session inbox socket. */
export function sendToSocket(socketPath, text, { token } = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(socketPath)) {
      reject(new Error(`no live session at ${socketPath} — is it still running?`));
      return;
    }
    const sock = net.createConnection({ path: socketPath });
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      err ? reject(err) : resolve();
    };

    sock.setTimeout(CONNECT_TIMEOUT_MS, () => done(new Error("timed out writing to session socket")));
    sock.on("error", done);
    sock.on("connect", () => {
      // Auth line first when we have a token; the receiver drops the whole
      // connection on a bad/missing line when auth is required.
      if (token) sock.write(JSON.stringify({ type: "auth", token }) + "\n");
      sock.write(JSON.stringify({ type: "user", message: { role: "user", content: text } }) + "\n");
      sock.end();
    });
    sock.on("close", () => done());
  });
}

/**
 * Resolve a session_id to its live socket via `claude agents --json`.
 * Returns null when that session isn't running (or isn't interactive).
 */
export async function findLiveSocket(sessionId) {
  try {
    const { stdout } = await execFileAsync("claude", ["agents", "--json"], { timeout: 30_000 });
    const entry = JSON.parse(stdout).find((a) => a.sessionId === sessionId && a.pid);
    if (!entry) return null;
    const path = `/tmp/cc-socks/${entry.pid}.sock`;
    return fs.existsSync(path) ? { path, pid: entry.pid, status: entry.status } : null;
  } catch {
    return null;
  }
}

/**
 * Dispatch `brief` into the canvas's attached session.
 *
 * Marks the transcript offset first so the reply trajectory has a well-defined
 * start — see lib/trajectory.mjs. Throws with a human-readable reason on
 * failure so the caller (button or tool call) can surface it.
 */
export async function dispatch(canvasId, brief) {
  const canvas = getCanvas(canvasId);
  if (!canvas) throw new Error("unknown canvas");
  if (canvas.tool !== "claude") {
    throw new Error("Codex dispatch goes through the shared app-server, not this path");
  }

  // Prefer the socket captured when /canvas ran inside the session; fall back
  // to discovery, which survives the session being restarted on a new pid.
  let socketPath = canvas.messaging_socket;
  if (!socketPath || !fs.existsSync(socketPath)) {
    const live = await findLiveSocket(canvas.session_id);
    if (!live) {
      throw new Error(
        "That session isn't running anymore. Reopen it and run /canvas to reattach."
      );
    }
    socketPath = live.path;
  }

  const fromOffset = markDispatchStart(canvasId);
  await sendToSocket(socketPath, brief, { token: canvas.messaging_token });

  logEvent(canvasId, "dispatch", { brief, socketPath, fromOffset });
  setStatus(canvasId, "dispatched");
  return { ok: true, fromOffset };
}
