#!/usr/bin/env node
// Ensures the voice-canvas local server is running (reusing a healthy one if
// present), spawning it detached otherwise. Exported as a function so other
// scripts (open-canvas.mjs) can call it directly; also runnable standalone.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const STATE_DIR = path.join(os.homedir(), ".voice-canvas");
const STATE_FILE = path.join(STATE_DIR, "server.json");
const LOG_FILE = path.join(STATE_DIR, "server.log");
const SERVER_SCRIPT = fileURLToPath(new URL("./canvas-server.mjs", import.meta.url));

function checkHealth(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/healthz", timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

function isPidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function spawnServerDetached() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const out = fs.openSync(LOG_FILE, "a");
  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
}

export async function ensureServerRunning() {
  const before = readState();
  if (before && isPidAlive(before.pid) && (await checkHealth(before.port))) {
    return { port: before.port, pid: before.pid, reused: true };
  }

  await spawnServerDetached();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    await sleep(150);
    const state = readState();
    if (!state) continue;
    if (before && state.pid === before.pid) continue; // stale file, not yet overwritten
    if (isPidAlive(state.pid) && (await checkHealth(state.port))) {
      return { port: state.port, pid: state.pid, reused: false };
    }
  }

  throw new Error(`Failed to start the canvas server within 5s. Check ${LOG_FILE} for details.`);
}

// Standalone CLI usage: prints the bare server URL.
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureServerRunning()
    .then(({ port }) => console.log(`http://127.0.0.1:${port}/`))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
