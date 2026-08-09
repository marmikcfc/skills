import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, utimes, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isStale } from "../../scripts/lib/staleness.mjs";

async function tempFile(dir, name, mtimeSec) {
  const path = join(dir, name);
  await writeFile(path, "x");
  if (mtimeSec !== undefined) await utimes(path, mtimeSec, mtimeSec);
  return path;
}

test("source newer than target → stale", async () => {
  const d = await mkdtemp(join(tmpdir(), "stale-"));
  try {
    const tgt = await tempFile(d, "tgt", 1000);
    const src = await tempFile(d, "src", 2000);
    assert.equal(await isStale(tgt, src), true);
  } finally { await rm(d, { recursive: true }); }
});

test("source older than target → not stale", async () => {
  const d = await mkdtemp(join(tmpdir(), "stale-"));
  try {
    const tgt = await tempFile(d, "tgt", 2000);
    const src = await tempFile(d, "src", 1000);
    assert.equal(await isStale(tgt, src), false);
  } finally { await rm(d, { recursive: true }); }
});

test("target missing → stale", async () => {
  const d = await mkdtemp(join(tmpdir(), "stale-"));
  try {
    const src = await tempFile(d, "src", 1000);
    assert.equal(await isStale(join(d, "missing"), src), true);
  } finally { await rm(d, { recursive: true }); }
});

test("source missing → throws", async () => {
  const d = await mkdtemp(join(tmpdir(), "stale-"));
  try {
    const tgt = await tempFile(d, "tgt", 1000);
    await assert.rejects(() => isStale(tgt, join(d, "missing")), /source/i);
  } finally { await rm(d, { recursive: true }); }
});

test("equal mtimes → not stale", async () => {
  const d = await mkdtemp(join(tmpdir(), "stale-"));
  try {
    const tgt = await tempFile(d, "tgt", 1000);
    const src = await tempFile(d, "src", 1000);
    assert.equal(await isStale(tgt, src), false);
  } finally { await rm(d, { recursive: true }); }
});
