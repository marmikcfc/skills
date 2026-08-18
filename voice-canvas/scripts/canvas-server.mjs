#!/usr/bin/env node
// The long-running canvas HTTP server. Spawned detached by ensure-canvas-server.mjs.
// Not meant to be run directly by a human.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logEvent, getEvents, openStore } from "../lib/canvas-store.mjs";
import { streamBrainstormReply } from "../lib/brainstorm-llm.mjs";
import { refreshSessionDigest, refreshSessionDigestInBackground, currentSessionDigest } from "../lib/session-digest.mjs";
import { extractDispatchOutcome, formatOutcome } from "../lib/trajectory.mjs";
import { dispatch } from "../lib/dispatch.mjs";
import crypto from "node:crypto";

const STATE_DIR = path.join(os.homedir(), ".voice-canvas");
const STATE_FILE = path.join(STATE_DIR, "server.json");
const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;

fs.mkdirSync(STATE_DIR, { recursive: true });
openStore(); // ensure schema exists before any request arrives

// canvasId -> Set<ServerResponse> of open SSE connections
const subscribers = new Map();

function broadcast(canvasId, event) {
  const set = subscribers.get(canvasId);
  if (!set) return;
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) res.write(line);
}

function serveFile(res, resolved) {
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const ext = path.extname(resolved);
    const type = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = "";
    req.on("data", (c) => { chunks += c; if (chunks.length > 1_000_000) req.destroy(); });
    req.on("end", () => resolve(chunks));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  // GET /api/canvas/:id/events -> existing transcript, for initial load / refresh
  let m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/events$/);
  if (m && req.method === "GET") {
    const events = getEvents(m[1]).filter((e) => e.type === "transcript" || e.type === "status");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(events));
    return;
  }

  // POST /api/canvas/:id/message -> append + broadcast
  m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/message$/);
  if (m && req.method === "POST") {
    const canvasId = m[1];
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON body" }));
      return;
    }
    if (typeof body.text !== "string" || !body.text.trim()) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "text is required" }));
      return;
    }
    const payload = { role: "user", text: body.text, clientMsgId: body.clientMsgId ?? null };
    logEvent(canvasId, "transcript", payload);
    broadcast(canvasId, { type: "transcript", payload, timestamp: Date.now() });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));

    // Stream the reply async — the POST already returned. Deltas broadcast as
    // they arrive; the final full message is what gets persisted.
    const messageId = crypto.randomUUID();
    broadcast(canvasId, { type: "transcript_start", messageId, role: "assistant" });

    streamBrainstormReply(canvasId, body.text, {
      onDelta: (text) => broadcast(canvasId, { type: "transcript_delta", messageId, text }),
      onToolCall: ({ name, input }) => broadcast(canvasId, { type: "tool_call", messageId, name, input }),
    })
      .then((replyText) => {
        const replyPayload = { role: "assistant", text: replyText, clientMsgId: null };
        logEvent(canvasId, "transcript", replyPayload);
        broadcast(canvasId, { type: "transcript", messageId, payload: replyPayload, timestamp: Date.now() });
      })
      .catch((err) => {
        const errPayload = { role: "assistant", text: `(error getting a reply: ${err.message})`, clientMsgId: null };
        logEvent(canvasId, "transcript", errPayload);
        broadcast(canvasId, { type: "transcript", messageId, payload: errPayload, timestamp: Date.now() });
      });
    return;
  }

  // GET  /api/canvas/:id/digest -> cached session digest (null until extracted)
  // POST /api/canvas/:id/digest -> force re-extraction, wait for it, return result
  m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/digest$/);
  if (m) {
    const canvasId = m[1];
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ digest: currentSessionDigest(canvasId) }));
      return;
    }
    if (req.method === "POST") {
      try {
        const digest = await refreshSessionDigest(canvasId, { force: true });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ digest }));
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // POST /api/canvas/:id/dispatch -> send a brief into the live session.
  // The button path. Identical to what the model's dispatch_to_agent tool does —
  // both land in lib/dispatch.mjs, so they can't drift apart.
  m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/dispatch$/);
  if (m && req.method === "POST") {
    const canvasId = m[1];
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON body" }));
      return;
    }
    const brief = typeof body.brief === "string" ? body.brief.trim() : "";
    if (!brief) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "brief is required" }));
      return;
    }
    try {
      const result = await dispatch(canvasId, brief);
      const payload = { role: "user", text: brief, kind: "dispatch", clientMsgId: null };
      logEvent(canvasId, "transcript", payload);
      broadcast(canvasId, { type: "transcript", payload, timestamp: Date.now() });
      broadcast(canvasId, { type: "status", status: "dispatched" });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(409, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/canvas/:id/outcome -> extract what the agent did since the last
  // dispatch and post it into the canvas as an assistant message.
  m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/outcome$/);
  if (m && req.method === "POST") {
    const canvasId = m[1];
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch { /* body optional */ }
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ started: true }));

    extractDispatchOutcome(canvasId, { fromOffset: body.fromOffset })
      .then((digest) => {
        if (!digest) return;
        const payload = { role: "assistant", text: formatOutcome(digest), kind: "outcome", clientMsgId: null };
        logEvent(canvasId, "transcript", payload);
        broadcast(canvasId, { type: "transcript", payload, timestamp: Date.now() });
        // The session moved on; the framing digest is now stale.
        refreshSessionDigestInBackground(canvasId, { force: true });
      })
      .catch(() => {});
    return;
  }

  // GET /api/canvas/:id/stream -> SSE live feed
  m = url.pathname.match(/^\/api\/canvas\/([^/]+)\/stream$/);
  if (m && req.method === "GET") {
    const canvasId = m[1];
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.write(": connected\n\n");
    if (!subscribers.has(canvasId)) subscribers.set(canvasId, new Set());
    subscribers.get(canvasId).add(res);
    req.on("close", () => {
      subscribers.get(canvasId)?.delete(res);
    });
    // Canvas just opened — warm the session digest so it's ready before the
    // user types. Backgrounded; the stream is already live either way.
    refreshSessionDigestInBackground(canvasId);
    return;
  }

  // /c/<canvas_id> serves the chat page.
  const isCanvasRoute = /^\/c\/[^/]+\/?$/.test(url.pathname);
  const filePath = isCanvasRoute ? "/canvas.html" : url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = path.join(PUBLIC_DIR, filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  serveFile(res, resolved);
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;
  const state = { pid: process.pid, port, startedAt: Date.now() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`READY port=${port} pid=${process.pid}`);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
