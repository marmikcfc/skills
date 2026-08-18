// Local canvas store: SQLite at ~/.voice-canvas/canvas.db.
// Two tables — `canvases` (current state, overwritten) and `canvas_events`
// (append-only log). See VOI-8.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const STATE_DIR = path.join(os.homedir(), ".voice-canvas");
const DB_FILE = path.join(STATE_DIR, "canvas.db");

let db;

export function openStore() {
  if (db) return db;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS canvases (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      tool TEXT NOT NULL,
      project_path TEXT,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'framing',
      brainstorm_session_id TEXT,
      created_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS canvas_events (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_canvas_id ON canvas_events(canvas_id);
  `);

  // Lightweight migrations for dbs created before these columns existed.
  const cols = db.prepare("PRAGMA table_info(canvases)").all().map((c) => c.name);
  const addColumn = (name, type) => {
    if (!cols.includes(name)) db.exec(`ALTER TABLE canvases ADD COLUMN ${name} ${type}`);
  };
  addColumn("brainstorm_session_id", "TEXT");
  // Cached digest of the attached coding session (see lib/extractor.mjs).
  addColumn("session_digest", "TEXT");       // JSON
  addColumn("digest_at", "INTEGER");         // when extracted
  addColumn("digest_source_size", "INTEGER"); // transcript bytes at extraction time
  // Transcript offset when work was dispatched — everything after it is the
  // agent's response trajectory for that dispatch (see lib/trajectory.mjs).
  addColumn("dispatch_offset", "INTEGER");
  // Captured when /canvas runs inside the session — the inbox we dispatch into.
  // Re-discoverable via `claude agents --json`, so this is a fast path, not the
  // only path (see lib/dispatch.mjs).
  addColumn("messaging_socket", "TEXT");
  addColumn("messaging_token", "TEXT");

  return db;
}

function uuid() {
  return crypto.randomUUID();
}

export function logEvent(canvasId, type, payload) {
  const store = openStore();
  const stmt = store.prepare(
    "INSERT INTO canvas_events (id, canvas_id, type, payload, timestamp) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(uuid(), canvasId, type, JSON.stringify(payload), Date.now());
}

// Look up a canvas by session_id; create one if it doesn't exist.
// Returns { canvas, created: boolean }.
export function findOrCreateCanvas(sessionId, { tool, cwd, title } = {}) {
  const store = openStore();
  const existing = store
    .prepare("SELECT * FROM canvases WHERE session_id = ?")
    .get(sessionId);

  if (existing) {
    store
      .prepare("UPDATE canvases SET last_activity_at = ? WHERE id = ?")
      .run(Date.now(), existing.id);
    logEvent(existing.id, "reuse", { sessionId });
    return { canvas: { ...existing, last_activity_at: Date.now() }, created: false };
  }

  const id = uuid();
  const now = Date.now();
  store
    .prepare(
      `INSERT INTO canvases (id, session_id, tool, project_path, title, status, created_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, 'framing', ?, ?)`
    )
    .run(id, sessionId, tool ?? "unknown", cwd ?? null, title ?? null, now, now);

  const canvas = store.prepare("SELECT * FROM canvases WHERE id = ?").get(id);
  logEvent(id, "create", { sessionId, tool, cwd });
  return { canvas, created: true };
}

export function listCanvases() {
  const store = openStore();
  return store.prepare("SELECT * FROM canvases ORDER BY last_activity_at DESC").all();
}

export function getEvents(canvasId) {
  const store = openStore();
  return store
    .prepare("SELECT * FROM canvas_events WHERE canvas_id = ? ORDER BY timestamp ASC")
    .all(canvasId)
    .map((e) => ({ ...e, payload: JSON.parse(e.payload) }));
}

export function getCanvas(canvasId) {
  const store = openStore();
  return store.prepare("SELECT * FROM canvases WHERE id = ?").get(canvasId);
}

export function setBrainstormSessionId(canvasId, brainstormSessionId) {
  const store = openStore();
  store
    .prepare("UPDATE canvases SET brainstorm_session_id = ? WHERE id = ?")
    .run(brainstormSessionId, canvasId);
}

export function saveSessionDigest(canvasId, digest, sourceSize) {
  const store = openStore();
  store
    .prepare("UPDATE canvases SET session_digest = ?, digest_at = ?, digest_source_size = ? WHERE id = ?")
    .run(JSON.stringify(digest), Date.now(), sourceSize ?? null, canvasId);
  logEvent(canvasId, "digest", { kind: "session", digest, sourceSize: sourceSize ?? null });
}

export function getSessionDigest(canvasId) {
  const row = getCanvas(canvasId);
  if (!row?.session_digest) return null;
  try {
    return { digest: JSON.parse(row.session_digest), at: row.digest_at, sourceSize: row.digest_source_size };
  } catch {
    return null;
  }
}

export function setMessagingInbox(canvasId, socketPath, token) {
  const store = openStore();
  store
    .prepare("UPDATE canvases SET messaging_socket = ?, messaging_token = ? WHERE id = ?")
    .run(socketPath, token, canvasId);
}

export function setDispatchOffset(canvasId, offset) {
  const store = openStore();
  store.prepare("UPDATE canvases SET dispatch_offset = ? WHERE id = ?").run(offset, canvasId);
}

export function setStatus(canvasId, status) {
  const store = openStore();
  store
    .prepare("UPDATE canvases SET status = ?, last_activity_at = ? WHERE id = ?")
    .run(status, Date.now(), canvasId);
  logEvent(canvasId, "status", { status });
}
