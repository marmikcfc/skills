import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractIds, assertUniqueIds, formatReport } from "../../scripts/lib/assert-unique-ids.mjs";

async function fixture(files) {
  const d = await mkdtemp(join(tmpdir(), "ids-"));
  const paths = [];
  for (const [name, html] of Object.entries(files)) {
    const p = join(d, name);
    await writeFile(p, html);
    paths.push(p);
  }
  return { dir: d, paths };
}

test("extractIds pulls every id attribute", () => {
  assert.deepEqual(extractIds('<div id="a"></div><video id="b">'), ["a", "b"]);
});

test("clean namespaced composition passes", async () => {
  const { dir, paths } = await fixture({
    "index.html": '<div id="root"><audio id="narration"></audio><video id="s01-manim"></video></div>',
    "01-hook.html": '<div id="s01-wrap"><h1 id="s01-title"></h1></div>',
    "02-reveal.html": '<div id="s02-wrap"></div>',
  });
  try {
    const r = await assertUniqueIds(paths);
    assert.equal(r.ok, true, formatReport(r));
  } finally { await rm(dir, { recursive: true }); }
});

test("cross-file duplicate id is caught — the blank-render bug", async () => {
  const { dir, paths } = await fixture({
    "index.html": '<div id="root"></div>',
    "01-hook.html": '<video id="clip"></video>',
    "02-reveal.html": '<video id="clip"></video>',
  });
  try {
    const r = await assertUniqueIds(paths);
    assert.equal(r.ok, false);
    const dup = r.duplicates.find((d) => d.id === "clip");
    assert.ok(dup, "expected 'clip' duplicate");
    assert.deepEqual(dup.files.sort(), ["01-hook.html", "02-reveal.html"]);
    assert.match(formatReport(r), /render BLANK/);
  } finally { await rm(dir, { recursive: true }); }
});

test("unnamespaced scene id is flagged even when unique", async () => {
  const { dir, paths } = await fixture({
    "index.html": '<div id="root"></div>',
    "01-hook.html": '<div id="wrapper"></div>',
  });
  try {
    const r = await assertUniqueIds(paths);
    assert.equal(r.ok, false);
    assert.equal(r.unnamespaced[0].id, "wrapper");
  } finally { await rm(dir, { recursive: true }); }
});

test("host file may use reserved root ids", async () => {
  const { dir, paths } = await fixture({
    "index.html": '<div id="root"><audio id="narration"></audio><audio id="soundtrack"></audio></div>',
  });
  try {
    assert.equal((await assertUniqueIds(paths)).ok, true);
  } finally { await rm(dir, { recursive: true }); }
});

test("data-composition-id is NOT an id — HyperFrames repeats it by design", () => {
  const html = '<div data-composition-id="s01-hook" data-composition-src="x.html"></div>';
  assert.deepEqual(extractIds(html), [], "matching data-composition-id flags every valid composition");
});

test("other *-id attributes are not ids either", () => {
  assert.deepEqual(extractIds('<div aria-owns-id="q" data-track-id="7"></div>'), []);
  assert.deepEqual(extractIds('<div id="s01-real" data-composition-id="s01-hook"></div>'), ["s01-real"]);
});
