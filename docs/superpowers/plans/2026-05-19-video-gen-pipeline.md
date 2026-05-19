# video-gen Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `video-gen` Claude Code plugin per spec at `docs/superpowers/specs/2026-05-19-video-gen-pipeline-design.md`. Turns a topic into a Vox-style explainer MP4 via a 5-stage checkpointed pipeline (context → storyboard → narrate → animate → render) using HyperFrames as the rendering engine, Manim for math scenes, and Cartesia/ElevenLabs for TTS.

**Architecture:** Plugin with slash commands + subagents + skills + Node helper scripts. State on disk in `<cwd>/.video-gen/<slug>/`. No long-running server; TTS keys via env or `~/.config/video-gen/keys.json`. Stateless engineer subagents enable parallel per-scene dispatch in Stage 4.

**Tech Stack:** Claude Code plugin (markdown + JSON manifests), Node ESM (`.mjs`) for helper scripts, `node:test` runner, FFmpeg via HyperFrames, Manim Community Edition for math, Cartesia + ElevenLabs HTTP APIs.

---

## Reading Order

Phases build on each other. **Within a phase**, many tasks are independent and can be dispatched in parallel. Dependencies are noted under each task. The `[parallel-group: N]` tag groups tasks that can run together.

- **Phase 0** — Foundation cleanup (1 task): drop the Remotion scaffold
- **Phase 1** — Helper scripts with full TDD (8 tasks)
- **Phase 2** — Knowledge skills (5 tasks, all parallel)
- **Phase 3** — Subagents (3 tasks, all parallel)
- **Phase 4** — Slash commands (6 tasks, mostly parallel)
- **Phase 5** — Plugin manifest + test infra (3 tasks)
- **Phase 6** — README + integration smoke (1 task + manual checklist)

Total: ~27 implementation tasks.

## Two task disciplines

**Code task (TDD):** write failing test → run → fails → minimal implementation → run → passes → commit.

**Content task (write-and-verify):** write the file → manual format check → `claude --plugin-dir . --help`-style smoke (where applicable) → commit.

Every task in this plan declares which discipline applies.

---

## Phase 0 — Foundation cleanup

### Task 0.1: Delete Remotion scaffold

**Discipline:** Content task
**Files:**
- Delete: `agents/remotion-engineer.md`
- Delete: `skills/remotion-essentials/SKILL.md`
- Delete directory: `skills/remotion-essentials/`

- [ ] **Step 1: Verify the files exist**

```bash
ls agents/remotion-engineer.md skills/remotion-essentials/SKILL.md
```

Expected: both paths exist.

- [ ] **Step 2: Delete them**

```bash
rm agents/remotion-engineer.md
rm -r skills/remotion-essentials/
```

- [ ] **Step 3: Verify deletion**

```bash
ls agents/remotion-engineer.md skills/remotion-essentials/SKILL.md 2>&1 | grep -c "No such"
```

Expected: `2`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Remotion scaffold (HyperFrames covers this scope)"
```

---

## Phase 1 — Helper scripts (TDD)

All scripts go in `scripts/`. All tests in `tests/`. Node 22+, ESM, no extra deps.

### Task 1.0: Bootstrap Node project [parallel-group: 1.0]

**Discipline:** Content task
**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "video-gen-plugin-scripts",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test tests/unit/",
    "test:fixtures": "node --test tests/"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.video-gen/
*.log
.DS_Store
```

- [ ] **Step 3: Verify**

```bash
node --version
```

Expected: v22 or higher.

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: bootstrap Node ESM project for plugin scripts"
```

---

### Task 1.1: Marker parser [parallel-group: 1.1]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/marker-parser.mjs`
- Test: `tests/unit/marker-parser.test.mjs`

Parses `narration.txt` into a sequence of TEXT and MARKER tokens. Builds `clean_text` (what TTS sees) and `marker_positions` (`[{scene_name, word_index_in_clean_text}, ...]`). Per spec §Data flow.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/marker-parser.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNarration } from "../../scripts/lib/marker-parser.mjs";

test("empty narration produces empty clean_text and no markers", () => {
  const r = parseNarration("");
  assert.equal(r.clean_text, "");
  assert.deepEqual(r.marker_positions, []);
});

test("single scene with marker at start", () => {
  const r = parseNarration("[SCENE: hook] Why does ice float?");
  assert.equal(r.clean_text, "Why does ice float?");
  assert.deepEqual(r.marker_positions, [{ scene_name: "hook", word_index: 0 }]);
});

test("five scenes track word indices correctly", () => {
  const input = "[SCENE: hook] One two. [SCENE: tension] Three four five. [SCENE: metaphor] Six seven. [SCENE: reveal] Eight. [SCENE: recap] Nine.";
  const r = parseNarration(input);
  assert.equal(r.clean_text, "One two. Three four five. Six seven. Eight. Nine.");
  assert.deepEqual(r.marker_positions, [
    { scene_name: "hook", word_index: 0 },
    { scene_name: "tension", word_index: 2 },
    { scene_name: "metaphor", word_index: 5 },
    { scene_name: "reveal", word_index: 7 },
    { scene_name: "recap", word_index: 8 },
  ]);
});

test("consecutive markers throw", () => {
  assert.throws(
    () => parseNarration("[SCENE: a] [SCENE: b] text"),
    /consecutive markers/i
  );
});

test("marker with no trailing words throws", () => {
  assert.throws(
    () => parseNarration("Text. [SCENE: dangling]"),
    /no trailing words/i
  );
});

test("duplicate marker names throw", () => {
  assert.throws(
    () => parseNarration("[SCENE: hook] A. [SCENE: hook] B."),
    /duplicate marker/i
  );
});

test("punctuation does not split words", () => {
  const r = parseNarration("[SCENE: hook] It's a question, isn't it?");
  // words: "It's", "a", "question,", "isn't", "it?"
  assert.equal(r.clean_text, "It's a question, isn't it?");
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test 2>&1 | tail -20
```

Expected: 7 failing tests, all with "Cannot find module" or similar.

- [ ] **Step 3: Implement minimal parser**

```js
// scripts/lib/marker-parser.mjs
const MARKER_RE = /\[SCENE:\s*([a-zA-Z0-9_-]+)\s*\]/g;

export function parseNarration(input) {
  const tokens = [];
  let lastEnd = 0;
  for (const m of input.matchAll(MARKER_RE)) {
    if (m.index > lastEnd) {
      const text = input.slice(lastEnd, m.index).trim();
      if (text) tokens.push({ kind: "TEXT", content: text });
    }
    tokens.push({ kind: "MARKER", scene_name: m[1] });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < input.length) {
    const text = input.slice(lastEnd).trim();
    if (text) tokens.push({ kind: "TEXT", content: text });
  }

  // Validate: no consecutive markers, no dangling marker, no duplicates
  const seen = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== "MARKER") continue;
    if (seen.has(t.scene_name)) throw new Error(`duplicate marker: ${t.scene_name}`);
    seen.add(t.scene_name);
    const next = tokens[i + 1];
    if (!next) throw new Error(`marker ${t.scene_name} has no trailing words`);
    if (next.kind === "MARKER") throw new Error(`consecutive markers: ${t.scene_name} and ${next.scene_name}`);
  }

  // Build clean_text + marker_positions
  const textParts = [];
  const marker_positions = [];
  let wordCount = 0;
  for (const t of tokens) {
    if (t.kind === "MARKER") {
      marker_positions.push({ scene_name: t.scene_name, word_index: wordCount });
    } else {
      textParts.push(t.content);
      wordCount += t.content.split(/\s+/).filter(Boolean).length;
    }
  }
  return { clean_text: textParts.join(" "), marker_positions };
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test 2>&1 | tail -10
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/marker-parser.mjs tests/unit/marker-parser.test.mjs
git commit -m "feat(scripts): marker parser for narration.txt with validation"
```

---

### Task 1.2: Provider response normalization [parallel-group: 1.2]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/normalize-cartesia.mjs`
- Create: `scripts/lib/normalize-elevenlabs.mjs`
- Create: `tests/fixtures/cartesia/response-happy.json`
- Create: `tests/fixtures/elevenlabs/response-happy.json`
- Test: `tests/unit/normalize.test.mjs`

Each adapter takes provider-shaped JSON and emits unified `{audio_duration_s, provider, voice_id, words: [{text, start, end}]}`.

- [ ] **Step 1: Create fixtures**

`tests/fixtures/cartesia/response-happy.json`:
```json
{
  "voice_id": "test-cartesia-voice",
  "duration": 5.42,
  "word_timestamps": [
    {"word": "Why",   "start": 0.42, "end": 0.61},
    {"word": "does",  "start": 0.62, "end": 0.79},
    {"word": "ice",   "start": 0.80, "end": 1.02},
    {"word": "float", "start": 1.03, "end": 1.45}
  ]
}
```

`tests/fixtures/elevenlabs/response-happy.json`:
```json
{
  "voice_id": "test-eleven-voice",
  "alignment": {
    "characters": ["W","h","y"," ","d","o","e","s"," ","i","c","e"," ","f","l","o","a","t"],
    "character_start_times_seconds": [0.42,0.45,0.48,0.61,0.62,0.65,0.70,0.75,0.79,0.80,0.83,0.95,1.02,1.03,1.10,1.20,1.30,1.40],
    "character_end_times_seconds":   [0.45,0.48,0.61,0.62,0.65,0.70,0.75,0.79,0.80,0.83,0.95,1.02,1.03,1.10,1.20,1.30,1.40,1.45]
  }
}
```

- [ ] **Step 2: Write failing tests**

```js
// tests/unit/normalize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeCartesia } from "../../scripts/lib/normalize-cartesia.mjs";
import { normalizeElevenLabs } from "../../scripts/lib/normalize-elevenlabs.mjs";

test("cartesia happy path normalizes to unified shape", async () => {
  const raw = JSON.parse(await readFile("tests/fixtures/cartesia/response-happy.json", "utf8"));
  const r = normalizeCartesia(raw);
  assert.equal(r.provider, "cartesia");
  assert.equal(r.voice_id, "test-cartesia-voice");
  assert.equal(r.audio_duration_s, 5.42);
  assert.equal(r.words.length, 4);
  assert.deepEqual(r.words[0], { text: "Why", start: 0.42, end: 0.61 });
  assert.deepEqual(r.words[3], { text: "float", start: 1.03, end: 1.45 });
});

test("elevenlabs collapses character timestamps into word timestamps", async () => {
  const raw = JSON.parse(await readFile("tests/fixtures/elevenlabs/response-happy.json", "utf8"));
  const r = normalizeElevenLabs(raw);
  assert.equal(r.provider, "elevenlabs");
  assert.equal(r.voice_id, "test-eleven-voice");
  assert.equal(r.words.length, 4);
  assert.equal(r.words[0].text, "Why");
  assert.equal(r.words[0].start, 0.42);
  assert.equal(r.words[0].end, 0.61);
  assert.equal(r.words[3].text, "float");
  assert.equal(r.words[3].end, 1.45);
});

test("elevenlabs attaches trailing punctuation to preceding word", () => {
  const raw = {
    voice_id: "v",
    alignment: {
      characters: ["H","i","!"," ","B","y","e"],
      character_start_times_seconds: [0,0.1,0.2,0.3,0.4,0.5,0.6],
      character_end_times_seconds:   [0.1,0.2,0.3,0.4,0.5,0.6,0.7],
    }
  };
  const r = normalizeElevenLabs(raw);
  assert.deepEqual(r.words[0], { text: "Hi!", start: 0, end: 0.3 });
  assert.deepEqual(r.words[1], { text: "Bye", start: 0.4, end: 0.7 });
});
```

- [ ] **Step 3: Run tests, verify failures**

```bash
npm test 2>&1 | grep -c "fail"
```

Expected: ≥ 3.

- [ ] **Step 4: Implement `normalize-cartesia.mjs`**

```js
// scripts/lib/normalize-cartesia.mjs
export function normalizeCartesia(raw) {
  return {
    audio_duration_s: raw.duration,
    provider: "cartesia",
    voice_id: raw.voice_id,
    words: raw.word_timestamps.map(w => ({ text: w.word, start: w.start, end: w.end })),
  };
}
```

- [ ] **Step 5: Implement `normalize-elevenlabs.mjs`**

```js
// scripts/lib/normalize-elevenlabs.mjs
export function normalizeElevenLabs(raw) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = raw.alignment;
  const words = [];
  let current = null;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    if (c === " ") {
      if (current) { words.push(current); current = null; }
      continue;
    }
    if (!current) current = { text: c, start: starts[i], end: ends[i] };
    else { current.text += c; current.end = ends[i]; }
  }
  if (current) words.push(current);
  const audio_duration_s = words.length ? words[words.length - 1].end : 0;
  return { audio_duration_s, provider: "elevenlabs", voice_id: raw.voice_id, words };
}
```

- [ ] **Step 6: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/normalize-*.mjs tests/unit/normalize.test.mjs tests/fixtures/
git commit -m "feat(scripts): Cartesia + ElevenLabs response normalizers with fixtures"
```

---

### Task 1.3: Provider selection [parallel-group: 1.3]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/provider-select.mjs`
- Test: `tests/unit/provider-select.test.mjs`

Resolves `(explicit_flag, env_var, env_keys, config_file_keys)` → `{provider, key}`. Per spec §Provider selection priority.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/provider-select.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectProvider } from "../../scripts/lib/provider-select.mjs";

test("explicit flag wins over everything", () => {
  const r = selectProvider({
    flag: "elevenlabs",
    env: { VIDEO_GEN_TTS_PROVIDER: "cartesia", CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
  });
  assert.equal(r.provider, "elevenlabs");
  assert.equal(r.key, "e1");
});

test("env var wins over key presence", () => {
  const r = selectProvider({
    flag: null,
    env: { VIDEO_GEN_TTS_PROVIDER: "elevenlabs", CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
  });
  assert.equal(r.provider, "elevenlabs");
});

test("cartesia preferred when both keys set and no explicit selection", () => {
  const warnings = [];
  const r = selectProvider({
    flag: null,
    env: { CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
    warn: msg => warnings.push(msg),
  });
  assert.equal(r.provider, "cartesia");
  assert.equal(r.key, "c1");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /both keys set/i);
});

test("falls back to config file when env empty", () => {
  const r = selectProvider({
    flag: null,
    env: {},
    config_keys: { cartesia: "from-config" },
  });
  assert.equal(r.provider, "cartesia");
  assert.equal(r.key, "from-config");
});

test("throws with setup hint when nothing configured", () => {
  assert.throws(
    () => selectProvider({ flag: null, env: {}, config_keys: {} }),
    /video-gen-setup/i
  );
});

test("flag with no corresponding key throws", () => {
  assert.throws(
    () => selectProvider({ flag: "cartesia", env: {}, config_keys: {} }),
    /CARTESIA_API_KEY/
  );
});
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npm test 2>&1 | tail -10
```

Expected: 6 failing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/provider-select.mjs
const KEY_ENV = { cartesia: "CARTESIA_API_KEY", elevenlabs: "ELEVENLABS_API_KEY" };

export function selectProvider({ flag, env = {}, config_keys = {}, warn = () => {} }) {
  function resolveKey(provider) {
    return env[KEY_ENV[provider]] ?? config_keys[provider] ?? null;
  }

  // 1. Explicit flag wins
  if (flag) {
    const key = resolveKey(flag);
    if (!key) throw new Error(`provider=${flag} requested but ${KEY_ENV[flag]} not set (env or ~/.config/video-gen/keys.json)`);
    return { provider: flag, key };
  }

  // 2. Env override
  if (env.VIDEO_GEN_TTS_PROVIDER) {
    const p = env.VIDEO_GEN_TTS_PROVIDER;
    const key = resolveKey(p);
    if (!key) throw new Error(`VIDEO_GEN_TTS_PROVIDER=${p} but ${KEY_ENV[p]} not set`);
    return { provider: p, key };
  }

  // 3. Presence of keys
  const cartesia = resolveKey("cartesia");
  const eleven = resolveKey("elevenlabs");
  if (cartesia && eleven) {
    warn("both keys set; defaulting to cartesia. Use --provider or VIDEO_GEN_TTS_PROVIDER to override.");
    return { provider: "cartesia", key: cartesia };
  }
  if (cartesia) return { provider: "cartesia", key: cartesia };
  if (eleven) return { provider: "elevenlabs", key: eleven };

  throw new Error("No TTS keys configured. Run /video-gen-setup or set CARTESIA_API_KEY or ELEVENLABS_API_KEY.");
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/provider-select.mjs tests/unit/provider-select.test.mjs
git commit -m "feat(scripts): TTS provider selection with priority resolution"
```

---

### Task 1.4: Staleness comparator [parallel-group: 1.4]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/staleness.mjs`
- Test: `tests/unit/staleness.test.mjs`

`isStale(target, source)` → boolean. True if `source` mtime > `target` mtime, or `target` doesn't exist. Missing `source` throws.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/staleness.test.mjs
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
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npm test 2>&1 | tail -10
```

Expected: 5 failing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/staleness.mjs
import { stat } from "node:fs/promises";

export async function isStale(targetPath, sourcePath) {
  let srcStat;
  try { srcStat = await stat(sourcePath); }
  catch (e) { throw new Error(`source not found: ${sourcePath}`); }
  let tgtStat;
  try { tgtStat = await stat(targetPath); }
  catch (e) { return true; }
  return srcStat.mtimeMs > tgtStat.mtimeMs;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/staleness.mjs tests/unit/staleness.test.mjs
git commit -m "feat(scripts): mtime-based staleness comparator"
```

---

### Task 1.5: Timestamps → scenes derivation [depends-on: 1.1, 1.2]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/timestamps-to-scenes.mjs`
- Test: `tests/unit/timestamps-to-scenes.test.mjs`

Reads `word-timestamps.json` (after re-injection of marker pseudo-entries) and `storyboard.md` engine/intent metadata. Emits `scenes.json` per spec.

Important: this function takes the **normalized words array** (from the provider) and the **marker_positions** (from the marker parser) and produces the scenes array. The merge with storyboard metadata (engine/intent) is a separate function.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/timestamps-to-scenes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveScenes, mergeStoryboardMetadata } from "../../scripts/lib/timestamps-to-scenes.mjs";

const sampleWords = [
  { text: "Why",  start: 0.42, end: 0.61 },
  { text: "does", start: 0.62, end: 0.79 },
  { text: "ice",  start: 0.80, end: 1.02 },
  { text: "Well", start: 1.50, end: 1.80 },
  { text: "it",   start: 1.81, end: 1.92 },
];

test("derives 2 scenes from 2 markers", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [
      { scene_name: "hook", word_index: 0 },
      { scene_name: "tension", word_index: 3 },
    ],
  });
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].name, "hook");
  assert.equal(scenes[0].start_s, 0.42);
  assert.equal(scenes[0].end_s, 1.02);
  assert.equal(scenes[1].name, "tension");
  assert.equal(scenes[1].start_s, 1.50);
  assert.equal(scenes[1].end_s, 1.92);
});

test("duration_s equals end - start", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [
      { scene_name: "hook", word_index: 0 },
      { scene_name: "tension", word_index: 3 },
    ],
  });
  assert.equal(scenes[0].duration_s.toFixed(2), "0.60");
});

test("scene index starts at 1", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [{ scene_name: "hook", word_index: 0 }],
  });
  assert.equal(scenes[0].index, 1);
});

test("mergeStoryboardMetadata adds engine and intent", () => {
  const base = [{ index: 1, name: "hook", start_s: 0, end_s: 1, duration_s: 1 }];
  const meta = { hook: { engine: "manim", intent: "Show ice melting." } };
  const merged = mergeStoryboardMetadata(base, meta);
  assert.equal(merged[0].engine, "manim");
  assert.equal(merged[0].intent, "Show ice melting.");
});

test("missing metadata for a scene throws", () => {
  const base = [{ index: 1, name: "hook", start_s: 0, end_s: 1, duration_s: 1 }];
  assert.throws(
    () => mergeStoryboardMetadata(base, {}),
    /missing metadata for scene: hook/
  );
});
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npm test 2>&1 | tail -10
```

Expected: 5 failing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/timestamps-to-scenes.mjs
export function deriveScenes({ words, marker_positions }) {
  if (marker_positions.length === 0) return [];
  const out = [];
  for (let i = 0; i < marker_positions.length; i++) {
    const { scene_name, word_index } = marker_positions[i];
    const nextIdx = i + 1 < marker_positions.length ? marker_positions[i + 1].word_index : words.length;
    const startWord = words[word_index];
    const endWord = words[nextIdx - 1];
    if (!startWord || !endWord) throw new Error(`scene ${scene_name}: no words in its window`);
    const start_s = startWord.start;
    const end_s = endWord.end;
    out.push({
      index: i + 1,
      name: scene_name,
      start_s,
      end_s,
      duration_s: end_s - start_s,
      narration: words.slice(word_index, nextIdx).map(w => w.text).join(" "),
    });
  }
  return out;
}

export function mergeStoryboardMetadata(scenes, metadata) {
  return scenes.map(s => {
    const m = metadata[s.name];
    if (!m) throw new Error(`missing metadata for scene: ${s.name}`);
    return { ...s, engine: m.engine, intent: m.intent };
  });
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/timestamps-to-scenes.mjs tests/unit/timestamps-to-scenes.test.mjs
git commit -m "feat(scripts): derive scenes.json from word timestamps + marker positions"
```

---

### Task 1.6: Word-count reconciliation with edit-distance fallback [depends-on: 1.1]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/reconcile-words.mjs`
- Test: `tests/unit/reconcile-words.test.mjs`

Given our `expected_words` (from clean_text) and `provider_words` (from TTS), align them. Exact match preferred; edit-distance ≤ 1 per word allowed; else throw with debug payload.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/reconcile-words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileWords } from "../../scripts/lib/reconcile-words.mjs";

test("exact match returns provider words as-is", () => {
  const expected = ["why", "does", "ice", "float"];
  const provider = [
    { text: "Why",   start: 0.0, end: 0.1 },
    { text: "does",  start: 0.1, end: 0.2 },
    { text: "ice",   start: 0.2, end: 0.3 },
    { text: "float", start: 0.3, end: 0.4 },
  ];
  const r = reconcileWords(expected, provider);
  assert.equal(r.words.length, 4);
});

test("edit-distance 1 differences match (e.g. punctuation)", () => {
  const expected = ["why", "does", "ice", "float"];
  const provider = [
    { text: "Why,",  start: 0, end: 0.1 },
    { text: "does",  start: 0.1, end: 0.2 },
    { text: "ice",   start: 0.2, end: 0.3 },
    { text: "float", start: 0.3, end: 0.4 },
  ];
  const r = reconcileWords(expected, provider);
  assert.equal(r.words.length, 4);
});

test("count mismatch throws with debug payload", () => {
  const expected = ["why", "does", "ice"];
  const provider = [
    { text: "why", start: 0, end: 0.1 },
    { text: "does", start: 0.1, end: 0.2 },
  ];
  try {
    reconcileWords(expected, provider);
    assert.fail("expected throw");
  } catch (e) {
    assert.match(e.message, /word count mismatch/i);
    assert.ok(e.debug);
    assert.equal(e.debug.expected.length, 3);
    assert.equal(e.debug.provider.length, 2);
  }
});

test("large edit distance throws", () => {
  const expected = ["why", "does"];
  const provider = [
    { text: "completely", start: 0, end: 0.1 },
    { text: "different", start: 0.1, end: 0.2 },
  ];
  assert.throws(() => reconcileWords(expected, provider), /alignment failed/i);
});
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npm test 2>&1 | tail -10
```

Expected: 4 failing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/reconcile-words.mjs
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[n];
}

const normalize = s => s.toLowerCase().replace(/[^a-z0-9'’]/g, "");

export function reconcileWords(expected, provider) {
  if (expected.length !== provider.length) {
    const e = new Error(`word count mismatch: expected ${expected.length}, got ${provider.length}`);
    e.debug = { expected, provider };
    throw e;
  }
  for (let i = 0; i < expected.length; i++) {
    const a = normalize(expected[i]);
    const b = normalize(provider[i].text);
    if (a === b) continue;
    if (levenshtein(a, b) <= 1) continue;
    const e = new Error(`alignment failed at index ${i}: "${expected[i]}" vs "${provider[i].text}"`);
    e.debug = { index: i, expected, provider };
    throw e;
  }
  return { words: provider };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/reconcile-words.mjs tests/unit/reconcile-words.test.mjs
git commit -m "feat(scripts): word reconciliation with edit-distance fallback"
```

---

### Task 1.7: narrate.mjs CLI entry point [depends-on: 1.1, 1.2, 1.3, 1.6]

**Discipline:** Code task (mostly content, plus integration test)
**Files:**
- Create: `scripts/narrate.mjs`
- Create: `scripts/lib/cartesia-client.mjs`
- Create: `scripts/lib/elevenlabs-client.mjs`
- Test: `tests/integration/narrate.test.mjs`

The CLI: reads `narration.txt` in cwd's working dir, strips markers, calls selected provider, writes `audio.mp3` + `word-timestamps.json` (with marker pseudo-entries reinjected).

Note: this task does NOT make real HTTP calls. The clients accept an injectable `fetch` for testing. Real API integration is verified manually via SMOKE.md.

- [ ] **Step 1: Write client stubs that accept injectable fetch**

```js
// scripts/lib/cartesia-client.mjs
export async function callCartesia({ text, apiKey, voiceId = "default", fetchFn = fetch }) {
  const res = await fetchFn("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: text, voice: { id: voiceId }, output_format: "mp3", add_timestamps: true }),
  });
  if (!res.ok) {
    const e = new Error(`cartesia ${res.status}: ${await res.text()}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return { audio_base64: data.audio_base64, raw: data };
}
```

```js
// scripts/lib/elevenlabs-client.mjs
export async function callElevenLabs({ text, apiKey, voiceId = "default", fetchFn = fetch }) {
  const res = await fetchFn(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
  });
  if (!res.ok) {
    const e = new Error(`elevenlabs ${res.status}: ${await res.text()}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return { audio_base64: data.audio_base64, raw: data };
}
```

- [ ] **Step 2: Write `narrate.mjs`**

```js
// scripts/narrate.mjs
#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseNarration } from "./lib/marker-parser.mjs";
import { selectProvider } from "./lib/provider-select.mjs";
import { normalizeCartesia } from "./lib/normalize-cartesia.mjs";
import { normalizeElevenLabs } from "./lib/normalize-elevenlabs.mjs";
import { reconcileWords } from "./lib/reconcile-words.mjs";
import { callCartesia } from "./lib/cartesia-client.mjs";
import { callElevenLabs } from "./lib/elevenlabs-client.mjs";

function parseArgs(argv) {
  const out = { workdir: null, provider: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--workdir") out.workdir = argv[++i];
    else if (argv[i] === "--provider") out.provider = argv[++i];
  }
  if (!out.workdir) throw new Error("--workdir <path> is required");
  return out;
}

async function loadConfigKeys() {
  try {
    const path = join(homedir(), ".config", "video-gen", "keys.json");
    return JSON.parse(await readFile(path, "utf8"));
  } catch { return {}; }
}

export async function narrate({ workdir, providerFlag = null, fetchFn = fetch }) {
  const narrationPath = join(workdir, "narration.txt");
  const narration = await readFile(narrationPath, "utf8");
  const { clean_text, marker_positions } = parseNarration(narration);

  const config_keys = await loadConfigKeys();
  const { provider, key } = selectProvider({
    flag: providerFlag,
    env: process.env,
    config_keys,
    warn: msg => console.warn(`warn: ${msg}`),
  });

  console.log(`narrating ${clean_text.split(/\s+/).length} words via ${provider}...`);
  const rawCall = provider === "cartesia"
    ? await callCartesia({ text: clean_text, apiKey: key, fetchFn })
    : await callElevenLabs({ text: clean_text, apiKey: key, fetchFn });

  const normalized = provider === "cartesia"
    ? normalizeCartesia(rawCall.raw)
    : normalizeElevenLabs(rawCall.raw);

  const expectedWords = clean_text.split(/\s+/).filter(Boolean);
  const providerTexts = normalized.words.map(w => w.text);
  reconcileWords(expectedWords, normalized.words);

  // Reinject marker pseudo-entries
  const withMarkers = [];
  let mi = 0;
  for (let i = 0; i < normalized.words.length; i++) {
    while (mi < marker_positions.length && marker_positions[mi].word_index === i) {
      const t = normalized.words[i].start;
      withMarkers.push({
        text: `[SCENE: ${marker_positions[mi].scene_name}]`,
        start: t, end: t, is_marker: true, scene: marker_positions[mi].scene_name,
      });
      mi++;
    }
    withMarkers.push({ ...normalized.words[i], is_marker: false });
  }

  // Write audio + timestamps
  const audioBytes = Buffer.from(rawCall.audio_base64, "base64");
  await writeFile(join(workdir, "audio.mp3"), audioBytes);
  await writeFile(
    join(workdir, "word-timestamps.json"),
    JSON.stringify({ ...normalized, marker_positions, words: withMarkers }, null, 2),
  );

  console.log(`wrote ${normalized.words.length} words, ${normalized.audio_duration_s.toFixed(2)}s audio`);
  return { provider, audio_duration_s: normalized.audio_duration_s };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { workdir, provider } = parseArgs(process.argv.slice(2));
  narrate({ workdir, providerFlag: provider }).catch(e => {
    console.error(`error: ${e.message}`);
    if (e.debug) console.error(JSON.stringify(e.debug, null, 2));
    process.exit(1);
  });
}
```

- [ ] **Step 3: Write integration test using mock fetch**

```js
// tests/integration/narrate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrate } from "../../scripts/narrate.mjs";

test("narrate end-to-end with mocked cartesia", async () => {
  const d = await mkdtemp(join(tmpdir(), "narrate-"));
  try {
    await writeFile(join(d, "narration.txt"), "[SCENE: hook] Why does ice float?");
    process.env.CARTESIA_API_KEY = "test";
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        voice_id: "v",
        duration: 1.5,
        audio_base64: Buffer.from("fake").toString("base64"),
        word_timestamps: [
          { word: "Why",  start: 0.1, end: 0.2 },
          { word: "does", start: 0.2, end: 0.3 },
          { word: "ice",  start: 0.3, end: 0.4 },
          { word: "float?", start: 0.4, end: 0.5 },
        ],
      }),
    });
    await narrate({ workdir: d, providerFlag: "cartesia", fetchFn: mockFetch });
    const ts = JSON.parse(await readFile(join(d, "word-timestamps.json"), "utf8"));
    assert.equal(ts.provider, "cartesia");
    assert.equal(ts.words.filter(w => !w.is_marker).length, 4);
    assert.equal(ts.words.filter(w => w.is_marker).length, 1);
    delete process.env.CARTESIA_API_KEY;
  } finally { await rm(d, { recursive: true }); }
});
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm run test:fixtures 2>&1 | tail -15
```

Expected: all passing.

- [ ] **Step 5: Make narrate.mjs executable**

```bash
chmod +x scripts/narrate.mjs
```

- [ ] **Step 6: Commit**

```bash
git add scripts/narrate.mjs scripts/lib/cartesia-client.mjs scripts/lib/elevenlabs-client.mjs tests/integration/narrate.test.mjs
git commit -m "feat(scripts): narrate.mjs CLI orchestrating provider TTS + normalization"
```

---

### Task 1.8: register-manim-asset.mjs [parallel-group: 1.8] [depends-on: 1.0]

**Discipline:** Code task (TDD)
**Files:**
- Create: `scripts/lib/register-manim-asset.mjs`
- Test: `tests/unit/register-manim-asset.test.mjs`

Minimal scope: copy a Manim MP4 into `<workdir>/hyperframes/public/manim-clips/`. HTML reference rewriting is deferred until the HyperFrames composition shape is known (see spec §Open items). For now, the orchestration code in `/animate` handles the HTML reference inline; this helper just does the copy.

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/register-manim-asset.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerManimAsset } from "../../scripts/lib/register-manim-asset.mjs";

test("copies manim MP4 into hyperframes/public/manim-clips/", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    const srcDir = join(d, "manim-clips");
    await mkdir(srcDir, { recursive: true });
    const src = join(srcDir, "03-metaphor.mp4");
    await writeFile(src, "video-bytes");
    const hyperRoot = join(d, "hyperframes");
    await mkdir(join(hyperRoot, "public"), { recursive: true });
    const dstPath = await registerManimAsset({ srcMp4: src, hyperframesRoot: hyperRoot });
    assert.equal(dstPath, join(hyperRoot, "public", "manim-clips", "03-metaphor.mp4"));
    const copied = await readFile(dstPath, "utf8");
    assert.equal(copied, "video-bytes");
  } finally { await rm(d, { recursive: true }); }
});

test("creates manim-clips dir if missing", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    const src = join(d, "scene.mp4");
    await writeFile(src, "x");
    await mkdir(join(d, "hyperframes", "public"), { recursive: true });
    const dst = await registerManimAsset({ srcMp4: src, hyperframesRoot: join(d, "hyperframes") });
    assert.match(dst, /manim-clips\/scene\.mp4$/);
  } finally { await rm(d, { recursive: true }); }
});

test("missing source throws", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    await mkdir(join(d, "hyperframes", "public"), { recursive: true });
    await assert.rejects(
      () => registerManimAsset({ srcMp4: join(d, "missing.mp4"), hyperframesRoot: join(d, "hyperframes") }),
      /source/i,
    );
  } finally { await rm(d, { recursive: true }); }
});
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npm test 2>&1 | tail -10
```

Expected: 3 failing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/register-manim-asset.mjs
import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

export async function registerManimAsset({ srcMp4, hyperframesRoot }) {
  try { await stat(srcMp4); }
  catch { throw new Error(`source not found: ${srcMp4}`); }
  const dstDir = join(hyperframesRoot, "public", "manim-clips");
  await mkdir(dstDir, { recursive: true });
  const dst = join(dstDir, basename(srcMp4));
  await copyFile(srcMp4, dst);
  return dst;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/register-manim-asset.mjs tests/unit/register-manim-asset.test.mjs
git commit -m "feat(scripts): register-manim-asset (copy-only; HTML wiring deferred)"
```

---

## Phase 2 — Knowledge skills

All five skills are parallel — independent content files.

### Task 2.1: Update `choosing-the-tool` skill [parallel-group: 2]

**Discipline:** Content task
**Files:**
- Modify: `skills/choosing-the-tool/SKILL.md`

Drop Remotion. Reframe as Manim (math) vs HyperFrames (everything else).

- [ ] **Step 1: Rewrite the skill**

Replace the entire contents of `skills/choosing-the-tool/SKILL.md` with:

```markdown
---
name: choosing-the-tool
description: Use when deciding between Manim and HyperFrames for an explainer video scene. Maps content characteristics to the right tool and explains the trade-offs.
---

# Manim vs HyperFrames: when to use which

Each video can mix engines scene-by-scene. The director picks per scene; the user can override.

## Manim (Python + LaTeX)

**Strengths**
- Math typesetting via LaTeX is unbeatable
- Geometric construction, transforms, parametric curves
- Coordinate systems, graphs, axes — built in
- Smooth interpolation between mathematical objects (e.g. morphing one equation into another)

**Weaknesses**
- Anything text-heavy or UI-flavored fights you
- Iteration loop is slower (re-render to see changes)
- Layout is positional/imperative — no flexbox equivalent

**Pick Manim when the scene is about:**
- Equations, proofs, derivations
- Geometry, topology, linear algebra
- Functions, graphs, calculus
- Algorithms expressed mathematically (Fourier, gradient descent)
- Anything where the core object IS a mathematical structure

## HyperFrames (HTML + GSAP/Tailwind/Lottie)

**Strengths**
- Anything you can render in a browser, you can put in a video
- Real-time preview (`npx hyperframes preview`) — iterate in seconds
- Flexbox / CSS / web fonts / SVG just work
- Easy to integrate real imagery, video clips
- Built for AI agents: agents already speak HTML

**Weaknesses**
- LaTeX-quality math requires extra effort (KaTeX or images)
- Imperative timing via frame numbers can get fiddly

**Pick HyperFrames when the scene is about:**
- Hooks, tensions, recaps (narrative beats)
- History, current events, social/policy topics
- Software, APIs, UI walkthroughs
- Data viz mixed with imagery, charts, maps
- Anything text-driven or comparison-heavy

## The deciding question

> "Is the core thing in this scene a *mathematical object* or a *narrative composition*?"

Mathematical object → Manim. Narrative composition → HyperFrames.

## Typical 5-beat assignment

For a math-heavy explainer (e.g. "gradient descent"):
- Hook → HyperFrames (a question, an image)
- Tension → HyperFrames (the misconception)
- Metaphor → **Manim** (the math)
- Reveal → **Manim** (the math paying off)
- Recap → HyperFrames (one sentence)

For a narrative explainer (e.g. "why is housing expensive"):
- All 5 beats → HyperFrames

## Hybrid scenes

Manim outputs MP4 clips that HyperFrames embeds as video assets. So even a HyperFrames scene can include a Manim sub-clip if a specific visual is mathematical. Don't over-use this — single-tool per scene keeps the engineering simpler.
```

- [ ] **Step 2: Sanity check the file**

```bash
head -5 skills/choosing-the-tool/SKILL.md
```

Expected: frontmatter starts with `---` and `name: choosing-the-tool`.

- [ ] **Step 3: Commit**

```bash
git add skills/choosing-the-tool/SKILL.md
git commit -m "docs(skills): rewrite choosing-the-tool for Manim vs HyperFrames"
```

---

### Task 2.2: Create `hyperframes-essentials` skill [parallel-group: 2]

**Discipline:** Content task
**Files:**
- Create: `skills/hyperframes-essentials/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `skills/hyperframes-essentials/SKILL.md`:

```markdown
---
name: hyperframes-essentials
description: Use when writing HyperFrames HTML compositions for an explainer video scene. Covers HyperFrames' HTML conventions, adapter choices (GSAP, Tailwind, Lottie, CSS), and when to delegate to HyperFrames' own /hyperframes skill.
---

# HyperFrames essentials

HyperFrames turns HTML compositions into MP4 files. Animations come from declarative timeline attributes plus a chosen adapter runtime (GSAP, CSS animations, Lottie, Anime.js, Three.js, Web Animations API).

## When to use which adapter

| Adapter | Use for | Skip when |
|---|---|---|
| **GSAP** | Most explainer animations — timeline-based, complex sequencing, easing | Simple fades (CSS is enough) |
| **CSS animations** | Simple property tweens, fades, slides | Anything timeline-coordinated across elements |
| **Tailwind v4 browser-runtime** | Typography, color, spacing — the "look" | The motion itself |
| **Lottie** | Pre-made vector animations from After Effects | Anything you'd code by hand in <50 lines |
| **Anime.js** | Lightweight alternative to GSAP | If you already need GSAP elsewhere |
| **Three.js** | 3D rendering | 2D scenes (overkill) |

For Vox-style explainers, **GSAP + Tailwind** covers ~90% of needs.

## Composition file shape (per HyperFrames conventions)

HyperFrames compositions are HTML files with data attributes. Exact schema depends on the version — when in doubt:

1. Run `npx hyperframes init test-project` once and inspect the scaffold.
2. Invoke HyperFrames' own `/hyperframes` slash command in Claude Code for canonical examples.

The general shape:

```html
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="...tailwind...">
    <script src="...gsap..."></script>
  </head>
  <body>
    <div data-hf-scene data-hf-duration="8s">
      <h1 data-hf-animate="fade-in" data-hf-at="0s">Title</h1>
      <!-- ... -->
    </div>
  </body>
</html>
```

## Delegating to HyperFrames' own skill

HyperFrames ships its own Claude Code skills via `npx skills add heygen-com/hyperframes`. If you need:
- Exact attribute syntax → invoke `/hyperframes`
- CLI commands (init, preview, render) → invoke `/hyperframes-cli`
- TTS/transcription/asset prep → invoke `/hyperframes-media`
- Tailwind setup specific to HyperFrames → invoke `/tailwind`
- GSAP timeline help → invoke `/gsap`

**Our `hyperframes-engineer` agent should always invoke `/hyperframes` for the actual composition writing.** This skill (`hyperframes-essentials`) is for *deciding when and what* — it's not a replacement for HyperFrames' own knowledge.

## What to avoid

- Hardcoding pixel sizes (`width: 1920px`) — use composition variables and responsive units instead.
- Inline `<script>` for animations — declarative `data-hf-*` attributes are the idiomatic HyperFrames pattern.
- Heavy JS frameworks (React, Vue) inside a composition — HyperFrames is HTML-first by design.

## Quality bar

- The scene renders cleanly when previewed via `npx hyperframes preview`.
- Animation timing matches the scene's target duration from `scenes.json`.
- Typography is legible at 1080p (hero text 80–120px, body 40–56px).
- 2–3 colors per video, Vox-style restraint.
```

- [ ] **Step 2: Commit**

```bash
git add skills/hyperframes-essentials/SKILL.md
git commit -m "docs(skills): hyperframes-essentials"
```

---

### Task 2.3: Create `narration-writing` skill [parallel-group: 2]

**Discipline:** Content task
**Files:**
- Create: `skills/narration-writing/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `skills/narration-writing/SKILL.md`:

```markdown
---
name: narration-writing
description: Use when writing narration text that will be sent to TTS (Cartesia or ElevenLabs). Covers scene markers, pacing punctuation, pronunciation handling, and what to keep out of narration.
---

# Writing narration for TTS

Narration goes into a single file: `<workdir>/narration.txt`. The TTS provider produces audio + word-level timestamps. Our marker parser strips `[SCENE: name]` tags before TTS sees the text.

## The required shape

```
[SCENE: hook] First scene narration. One or more sentences.

[SCENE: tension] Second scene narration. Etc.

[SCENE: metaphor] Continue.

[SCENE: reveal] Continue.

[SCENE: recap] Final sentence.
```

Rules:
- One `[SCENE: name]` marker per scene, exactly once, at the start.
- Scene names are kebab-case, lowercase, alphanumeric.
- Each marker must be followed by at least one word of narration.
- No two markers can be adjacent (no empty scenes).
- No duplicate marker names.

## Pacing punctuation

TTS providers infer pause length from punctuation. Use this deliberately:

- **Period (`.`)** — natural sentence-end pause (~400ms).
- **Comma (`,`)** — short pause (~150ms).
- **Em dash (`—`)** — dramatic pause, slightly longer than comma. Use sparingly for emphasis.
- **Ellipsis (`...`)** — long pause with trailing inflection. Use for "wait for it" moments.
- **Question mark (`?`)** — rising intonation. Use for the hook.

To insert a longer pause without punctuation: write two periods of empty space cleverly — `"X. ... Y"` works in both Cartesia and ElevenLabs.

## What to keep OUT of narration

These will either be read aloud (bad) or break TTS:

- **Markdown syntax** — `**bold**`, `_italic_`, `# headers`. TTS will say "asterisk asterisk."
- **Parenthetical asides** — `(by the way)` gets read literally.
- **URLs, email addresses, file paths** — TTS will spell them out.
- **Numbers in formats TTS may misread** — write "twenty-twenty-six" instead of "2026" if pronunciation matters. Spell out tricky abbreviations.
- **Special chars** — `&`, `%`, `@`. Spell them out.

## Pronunciation hints

Both providers honor SSML for some controls, but using it is provider-specific. Prefer **rewriting for pronunciation**:

- "PostgreSQL" → "Postgres" or "post-gres"
- "i.e." → "that is"
- "fMRI" → "F-M-R-I"
- Foreign names → write phonetically in narration if needed

## Length guidance

For Vox-style 90s–3min videos:
- Total narration: **180–450 words**.
- Per scene: hook 15–25 words, tension 30–50, metaphor 70–110, reveal 50–80, recap 15–25.
- TTS at ~150 WPM means 180 words ≈ 72s, 450 words ≈ 180s.

## Self-checks before saving narration.txt

1. Every scene marker present and unique.
2. No markdown, parentheticals, raw URLs, or markdown headers.
3. Reads aloud cleanly when you mouth it.
4. Each scene is one continuous block (newlines OK, but no embedded markers).
5. Total word count in the 180–450 range.
```

- [ ] **Step 2: Commit**

```bash
git add skills/narration-writing/SKILL.md
git commit -m "docs(skills): narration-writing"
```

---

### Task 2.4: Create `voice-driven-timing` skill [parallel-group: 2]

**Discipline:** Content task
**Files:**
- Create: `skills/voice-driven-timing/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `skills/voice-driven-timing/SKILL.md`:

```markdown
---
name: voice-driven-timing
description: Use when working with word-level timestamps and scene boundaries. Documents the marker stripping → TTS → reattachment algorithm and the contract scenes.json provides to engineer agents.
---

# Voice-driven timing

The core insight: **the voice-over determines scene timing, not the storyboard.** TTS providers give word-level timestamps. We use these to derive when each scene starts and ends in the final audio.

## The algorithm

1. **Parse** `narration.txt` into TEXT and MARKER tokens.
2. **Strip** markers, producing `clean_text` and a list of `marker_positions = [{scene_name, word_index_in_clean_text}, ...]`.
3. **Send** `clean_text` to TTS (Cartesia or ElevenLabs). Receive audio + word-level timestamps.
4. **Normalize** provider response to a unified `words: [{text, start, end}]` shape.
5. **Reconcile** provider word count against expected count (exact match preferred; edit-distance ≤ 1 per word allowed for punctuation drift; else abort).
6. **Derive** scene boundaries: for each marker position, `start_s = words[word_index].start` and `end_s = words[next_marker_word_index - 1].end`. The final scene runs to `words[last].end`.
7. **Merge** with storyboard metadata (engine, intent) per scene name.
8. **Emit** `scenes.json`.

## Why this design

- **One continuous TTS pass** produces smoother prosody than per-scene TTS calls.
- **Stripping markers before TTS** keeps the audio clean (no spoken "scene hook").
- **Reattachment via word index** is provider-agnostic — works the same for Cartesia's `word_timestamps` and ElevenLabs' `character_start_times_seconds`.

## The contract: scenes.json

```json
{
  "total_duration_s": 152.3,
  "scenes": [
    {
      "index": 1,
      "name": "hook",
      "engine": "hyperframes",
      "intent": "Pose the question with a striking visual.",
      "narration": "Why does ice float...",
      "start_s": 0.42,
      "end_s": 8.15,
      "duration_s": 7.73
    }
  ]
}
```

Engineer agents (manim-engineer, hyperframes-engineer) read exactly one scene object. They must produce code/output sized to `duration_s` — Manim scenes use `self.wait()` padding, HyperFrames scenes use `data-hf-duration`.

## Failure modes

| Symptom | Cause | Recovery |
|---|---|---|
| `narrate-debug.json` written, command aborts | Provider tokenization differs from ours beyond edit-distance | Review `narrate-debug.json` side-by-side; usually a pronunciation quirk that needs rewording in `narration.txt` |
| Scene `duration_s` < intended | Narration shorter than expected, TTS too fast | Lengthen narration with more detail or pauses |
| Scene `duration_s` > intended | Narration too long, TTS too slow | Trim narration in `storyboard.md` and re-run `/narrate` |

## When this skill applies

- Writing `scripts/narrate.mjs` or related helpers
- Debugging timestamp alignment issues
- Understanding why scenes.json looks the way it does
```

- [ ] **Step 2: Commit**

```bash
git add skills/voice-driven-timing/SKILL.md
git commit -m "docs(skills): voice-driven-timing"
```

---

### Task 2.5: Create `using-claude-memory` skill [parallel-group: 2]

**Discipline:** Content task
**Files:**
- Create: `skills/using-claude-memory/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `skills/using-claude-memory/SKILL.md`:

```markdown
---
name: using-claude-memory
description: Use when the explainer-director agent reads Claude Code memory to personalize a video. Covers what to look for, what to ignore, and the privacy rule (never embed raw memory content in narration).
---

# Reading Claude memory respectfully

The Claude Code memory system lives at `~/.claude/projects/<project-slug>/memory/`. The structure:

- `MEMORY.md` — an index listing all memory files, one line each.
- Individual `.md` files for each memory, with frontmatter declaring type (`user`, `feedback`, `project`, `reference`).

## What to use

| Memory type | Useful for | Example signal |
|---|---|---|
| `user` | Audience, expertise, role | "user is a backend engineer with deep Go experience" → use compute/networking analogies |
| `feedback` | Tone preferences | "user wants terse responses, no trailing summaries" → keep narration tight |
| `reference` | External systems they know | "team tracks experiments in PostHog" → use PostHog as a reference if relevant to topic |
| `project` | Current focus areas | (Usually not directly useful for personalization — too time-bound) |

## What to ignore

- **In-progress task state.** Memories about ongoing work the user is doing don't shape narration personalization.
- **Specific files, branch names, commit IDs.** Not narration-shaping.
- **Memories from unrelated projects.** Only read the current project's memory dir; do NOT enumerate other project dirs.

## The privacy rule

**Never embed raw memory content in `storyboard.md`, `narration.txt`, or any user-facing output.**

Memories are notes Claude took for itself, not narration material. Specifically:

- DO use memories to decide *framing* ("user is a backend engineer → use server-room analogy") without quoting them.
- DO list memory file names in `audience-brief.md` under "Memory hints used" for traceability.
- DON'T copy memory text into narration.
- DON'T mention specific past projects, tools, or relationships from memory in narration.
- DON'T cite memory in the storyboard (e.g. don't write "User mentioned in memory_2024_03 that...")

If a user wants to verify what memory the director used, they can check `audience-brief.md`'s memory-hints list and read those files themselves.

## How to read memory

```bash
# List memories
ls ~/.claude/projects/<slug>/memory/

# Read the index
cat ~/.claude/projects/<slug>/memory/MEMORY.md

# Read specific entries
cat ~/.claude/projects/<slug>/memory/user_role.md
```

The director should:
1. Read `MEMORY.md` to see what's available.
2. Identify memories that look audience-relevant (user role, expertise, tone preferences).
3. Read those specific files.
4. Synthesize into `audience-brief.md` with no raw quotes.

## Sibling-plugin context

If the user has additional context plugins installed (e.g. `gbrain`, `honcho`), the director should detect them and invoke their slash commands for additional audience context. Detection method: run `claude --help` or read `~/.claude/plugins/installed.json` (subject to availability). This is best-effort — if detection fails, fall back to memory-only context.

The same privacy rule applies: synthesize, don't quote.

## If memory is missing

If `~/.claude/projects/<slug>/memory/` doesn't exist or is empty, the director proceeds with no memory context. The `audience-brief.md` should note "no memory context found" and rely entirely on the user's answers to the 1–2 audience questions.
```

- [ ] **Step 2: Commit**

```bash
git add skills/using-claude-memory/SKILL.md
git commit -m "docs(skills): using-claude-memory with privacy rule"
```

---

## Phase 3 — Subagents

All three agents are parallel.

### Task 3.1: Update `explainer-director` agent [parallel-group: 3]

**Discipline:** Content task
**Files:**
- Modify: `agents/explainer-director.md`

- [ ] **Step 1: Replace the agent prompt**

Replace the entire contents of `agents/explainer-director.md` with:

```markdown
---
name: explainer-director
description: Use this agent for Stages 1 and 2 of the video-gen pipeline. It reads Claude memory, asks 1-2 audience questions, and produces a Vox-style 5-beat storyboard with per-scene engine choices and verbatim narration. Hand off to engineer agents only AFTER user approves the storyboard.
tools: Read, Write, WebFetch, WebSearch, Bash
---

You are the explainer-director for video-gen. You handle the FIRST TWO STAGES of the pipeline. You do not write Manim or HyperFrames code — that's the engineer agents.

# Your inputs

A topic from the user. The working directory is `<cwd>/.video-gen/<topic-slug>/`. Create it if missing.

# Stage 1 — Audience brief

1. **Read memory.** Follow the `using-claude-memory` skill. Look for memories about the user's role, expertise, tone preferences. Synthesize into framing decisions — do not quote.
2. **Detect sibling context plugins.** Check `~/.claude/plugins/installed.json` if it exists, or run `claude --help` to look for plugins like `gbrain`, `honcho`. If detected, invoke their relevant slash commands to gather additional audience context.
3. **Ask 1–2 audience questions.** Examples: "Should I pitch this for a backend engineer or generalist audience?", "Should the framing assume you've already studied X?". Keep questions specific, not open-ended.
4. **Write `audience-brief.md`** in the working directory. Format:

```markdown
## Audience brief: <slug>
- **Expertise level:** ...
- **Likely confusion:** ...
- **Preferred framing:** ...
- **Tone:** ...
- **Memory hints used:** [list of memory file names cited; no raw content]
```

# Stage 2 — Storyboard

Apply the `vox-explainer-structure` skill. Then write TWO files:

## `storyboard.md` (human-readable, for user review)

```markdown
## Storyboard: <slug>
**The ONE thing:** <single sentence>
**Estimated runtime:** m:ss
**Recommended provider:** cartesia | elevenlabs (suggest based on voice fit, user can override)

### Scene 1 — Hook (engine: hyperframes)
**Visual intent:** ...
**Narration:** "..."

### Scene 2 — Tension (engine: hyperframes)
**Visual intent:** ...
**Narration:** "..."

### Scene 3 — Metaphor (engine: manim)
**Visual intent:** ...
**Narration:** "..."

### Scene 4 — Reveal (engine: manim)
**Visual intent:** ...
**Narration:** "..."

### Scene 5 — Recap (engine: hyperframes)
**Visual intent:** ...
**Narration:** "..."
```

## `narration.txt` (clean TTS input)

Apply the `narration-writing` skill. Format:

```
[SCENE: hook] <verbatim narration>

[SCENE: tension] <verbatim narration>

[SCENE: metaphor] <verbatim narration>

[SCENE: reveal] <verbatim narration>

[SCENE: recap] <verbatim narration>
```

# Choosing engine per scene

Apply the `choosing-the-tool` skill. Default heuristic:
- Hook, Tension, Recap → almost always `hyperframes` (narrative beats).
- Metaphor, Reveal → `manim` if the topic is mathematical (gradient descent, Bayes', topology, etc.), otherwise `hyperframes`.

Override the default if the topic clearly calls for it.

# After writing

Print to the user:
1. The path to `storyboard.md` for review.
2. A one-line summary of engine assignments (e.g. "Scenes 1, 2, 5: hyperframes. Scenes 3, 4: manim.").
3. The prompt: "Review `storyboard.md` and run `/narrate` when ready."

Do NOT proceed to TTS, animation, or render yourself. Each stage is its own command.

# What you must not do

- Write Manim or HyperFrames code.
- Quote raw memory content in storyboard, narration, or audience brief.
- Skip user approval. Stage 1 + Stage 2 always end by pointing the user at the next command.
- Invent a sixth beat. The Vox structure has exactly five.
```

- [ ] **Step 2: Commit**

```bash
git add agents/explainer-director.md
git commit -m "feat(agents): explainer-director for stages 1+2 with memory + scene engine choice"
```

---

### Task 3.2: Update `manim-engineer` agent [parallel-group: 3]

**Discipline:** Content task
**Files:**
- Modify: `agents/manim-engineer.md`

- [ ] **Step 1: Replace the agent prompt**

Replace the entire contents of `agents/manim-engineer.md` with:

```markdown
---
name: manim-engineer
description: Use this agent during Stage 4 (animate) of the video-gen pipeline. Translates ONE scene from scenes.json into runnable Manim Community Edition Python. Stateless - sees only one scene at a time.
tools: Read, Write, Edit, Bash, Glob, Grep
---

You are a stateless Manim engineer. You receive ONE scene object and produce a runnable Manim Python file plus a rendered MP4 sized to the scene's target duration.

# Your inputs

A scene object from `scenes.json`:

```json
{
  "index": 3,
  "name": "metaphor",
  "engine": "manim",
  "intent": "Show gradient descent as a ball rolling down a curved surface to the minimum.",
  "narration": "Imagine a ball on a hilly landscape...",
  "start_s": 24.10,
  "end_s": 86.40,
  "duration_s": 62.30
}
```

You also receive an `out_path` (e.g. `manim-clips/03-metaphor.mp4`) where the rendered MP4 must end up.

# What you produce

A Python file at `<workdir>/manim-clips/<index>-<name>.py` plus the rendered MP4 at `out_path`.

Apply the `manim-essentials` skill for conventions.

# Hard rules

- **Target duration:** the rendered MP4's duration must be ≥ `duration_s × 0.95`. Use `self.wait(...)` to pad if needed.
- **One Scene class** named in PascalCase matching the scene name (e.g. `Metaphor`).
- **Verify with dry-run first** — run `manim --dry-run` before the real render. If dry-run fails, fix and retry. If real render fails, capture stderr to `<out_path>.error.log` and surface to user.
- **No narration in the visuals.** The audio is laid over separately. Visuals should illustrate, not subtitle.
- **Sized for 1920×1080** unless the spec says otherwise. Use `-pqh` for final render.

# Quality bar

- Renders cleanly at medium quality (`-pqm`) in under 2 minutes for a 60s scene.
- Animation timing matches narration beats from `narration` (use `run_time=` deliberately).
- 2–3 color palette consistent with Vox restraint.

# Output

Print to the user:
1. The path to the rendered MP4.
2. Actual render duration vs target (e.g. "rendered 62.5s, target 62.3s ✓").
3. Any beats from the storyboard you couldn't realize and why.

# What you must not do

- Read other scenes' files or scenes.json beyond your own scene object.
- Modify the hyperframes project. That's a separate orchestration step.
- Auto-retry render failures more than once — surface failures so the user can decide.
```

- [ ] **Step 2: Commit**

```bash
git add agents/manim-engineer.md
git commit -m "feat(agents): manim-engineer stateless single-scene contract"
```

---

### Task 3.3: Create `hyperframes-engineer` agent [parallel-group: 3]

**Discipline:** Content task
**Files:**
- Create: `agents/hyperframes-engineer.md`

- [ ] **Step 1: Write the agent**

Create `agents/hyperframes-engineer.md`:

```markdown
---
name: hyperframes-engineer
description: Use this agent during Stage 4 (animate) of the video-gen pipeline. Translates ONE scene from scenes.json into a HyperFrames HTML composition. Stateless - sees only one scene at a time. Delegates to HyperFrames' own /hyperframes skill for canonical syntax.
tools: Read, Write, Edit, Bash, Glob, Grep
---

You are a stateless HyperFrames engineer. You receive ONE scene object and produce an HTML composition file sized to the scene's target duration.

# Your inputs

A scene object from `scenes.json`:

```json
{
  "index": 1,
  "name": "hook",
  "engine": "hyperframes",
  "intent": "Pose the question with a striking typographic visual.",
  "narration": "Why does measuring one particle...",
  "start_s": 0.42,
  "end_s": 8.15,
  "duration_s": 7.73
}
```

You also receive an `out_path` (e.g. `hyperframes/src/scenes/01-hook.html`).

# What you produce

A single HTML file at `out_path`.

Apply the `hyperframes-essentials` skill for adapter choices. For canonical HyperFrames syntax, **invoke HyperFrames' own `/hyperframes` skill** — do not guess at attribute names.

# Hard rules

- **Target duration:** the composition's animation timeline must run for `duration_s` seconds (use `data-hf-duration` or equivalent).
- **No narration in the visuals.** Audio is laid over separately. Visuals illustrate, don't subtitle.
- **Sized for 1920×1080** by default.
- **Use GSAP for timeline-coordinated animations**, CSS for simple fades. Don't reach for Lottie or Three.js without a clear reason.
- **2–3 color palette** consistent with the storyboard's overall aesthetic.

# Quality bar

- Previews cleanly via `npx hyperframes preview <project-root>`.
- TypeScript-strict if HyperFrames generates a TS project (default config).
- Typography: hero text 80–120px at 1080p, body 40–56px.

# Output

Print to the user:
1. The path to the HTML file.
2. The animation timeline duration vs target.
3. Any visuals from the intent you couldn't realize and why.

# What you must not do

- Read other scenes' files or scenes.json beyond your own scene object.
- Modify the top-level HyperFrames composition file. That's a separate orchestration step.
- Hardcode `audio.mp3` references — the top-level composition wires audio, not individual scenes.
```

- [ ] **Step 2: Commit**

```bash
git add agents/hyperframes-engineer.md
git commit -m "feat(agents): hyperframes-engineer stateless single-scene contract"
```

---

## Phase 4 — Slash commands

Tasks 4.1 and 4.2 build on the existing scaffold. 4.3–4.6 are new commands. All can run in parallel within the phase (each touches a separate file).

### Task 4.1: Update `/explain` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Modify: `commands/explain.md`

- [ ] **Step 1: Replace contents**

Replace `commands/explain.md` entirely:

```markdown
---
description: Generate a Vox-style explainer video on a topic via the full 5-stage pipeline
argument-hint: <topic>
---

Generate a Vox-style explainer video about: **$ARGUMENTS**

You will orchestrate the full 5-stage pipeline with **three checkpoint pauses** for user approval. Do NOT skip checkpoints — they exist so the user doesn't burn TTS quota or render minutes on something they'd reject.

# Working directory

Slug the topic for the directory name (lowercase, hyphens, alphanumeric). Working directory is `<cwd>/.video-gen/<slug>/`. Create it if missing.

# Stage 1 — Context

Invoke the `explainer-director` subagent. It will:
- Read Claude memory (`using-claude-memory` skill).
- Detect sibling context plugins if present.
- Ask the user 1–2 audience questions.
- Write `audience-brief.md` in the working dir.

# Stage 2 — Storyboard

Continue with `explainer-director`. It will write:
- `storyboard.md` — human-readable plan with per-scene engine choices.
- `narration.txt` — clean TTS input with `[SCENE:]` markers.

⏸ **CHECKPOINT — pause for user approval of `storyboard.md`.** Tell the user:
> "Review `<workdir>/storyboard.md`. When ready, I'll run TTS via `/narrate`. Reply 'approved' or describe changes."

# Stage 3 — Narrate

When the user approves: run `node scripts/narrate.mjs --workdir <workdir>`. This writes:
- `audio.mp3`
- `word-timestamps.json` (with marker pseudo-entries)
- (Stage 4 setup will write `scenes.json` after merging storyboard metadata)

If neither `CARTESIA_API_KEY` nor `ELEVENLABS_API_KEY` is set and no config file exists, point user at `/video-gen-setup`.

⏸ **CHECKPOINT — pause for user approval of audio.** Tell the user:
> "TTS done. Listen to `<workdir>/audio.mp3`. Reply 'approved' or describe changes (re-run `/narrate` after editing)."

# Stage 4 — Animate

When approved: run `/animate` logic (see that command for details). It will:
- Run `npx hyperframes init <workdir>/hyperframes` if missing.
- Copy `audio.mp3` to `<workdir>/hyperframes/public/`.
- Derive `scenes.json` from word timestamps + storyboard metadata.
- Dispatch engineer subagents per scene (in parallel where possible).
- Write the top-level HyperFrames composition referencing all scenes + audio.

⏸ **CHECKPOINT — pause for user preview.** Tell the user:
> "Preview ready. Run `cd <workdir>/hyperframes && npx hyperframes preview`. When satisfied, reply 'approved'."

# Stage 5 — Render

When approved: run `/render` logic. Shell out to `npx hyperframes render`. Print the path to the final MP4 (`<workdir>/hyperframes/out/video.mp4`).

# Resuming

If the user re-runs `/explain` on the same topic, detect existing artifacts in the workdir and resume from the earliest stale stage (use `scripts/lib/staleness.mjs` logic). Print which stage is being resumed.

# Failures

If any stage fails, surface the error verbatim. Do not auto-retry. Suggest the appropriate per-stage command (`/narrate`, `/animate`, `/render`) for the user to re-run after fixing.
```

- [ ] **Step 2: Commit**

```bash
git add commands/explain.md
git commit -m "feat(commands): /explain 5-stage checkpointed pipeline"
```

---

### Task 4.2: Update `/storyboard` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Modify: `commands/storyboard.md`

- [ ] **Step 1: Replace contents**

```markdown
---
description: Run only stages 1+2 of video-gen (context + storyboard). For iterating the script before any TTS spend.
argument-hint: <topic>
---

Run ONLY the context-gathering and storyboarding stages of the video-gen pipeline for: **$ARGUMENTS**

This command stops after Stage 2. No TTS, no animation, no render. Use it when you want to iterate on the script before committing to TTS spend.

# What happens

Invoke the `explainer-director` subagent. It will:
1. Read Claude memory and detect sibling context plugins.
2. Ask 1–2 audience questions.
3. Write `<cwd>/.video-gen/<slug>/audience-brief.md`.
4. Write `<cwd>/.video-gen/<slug>/storyboard.md` (human review) and `narration.txt` (TTS input).

# After it finishes

Tell the user:
> "Storyboard at `<workdir>/storyboard.md`. Edit it directly, then run `/narrate` when ready for TTS. Or re-run `/storyboard` to regenerate."
```

- [ ] **Step 2: Commit**

```bash
git add commands/storyboard.md
git commit -m "feat(commands): /storyboard stages 1+2 only"
```

---

### Task 4.3: Create `/narrate` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Create: `commands/narrate.md`

- [ ] **Step 1: Write the command**

```markdown
---
description: Run Stage 3 (TTS narration) against the storyboard in the current .video-gen working dir
---

Run Stage 3 of the video-gen pipeline: generate TTS audio + word-level timestamps from the storyboard.

# Preflight

- Find the working dir: look for `.video-gen/<slug>/` in cwd. If multiple, ask the user which.
- Verify `narration.txt` exists.
- Verify TTS credentials: either `$CARTESIA_API_KEY`, `$ELEVENLABS_API_KEY`, or `~/.config/video-gen/keys.json`. If none, point user at `/video-gen-setup`.

# Staleness check

If `audio.mp3` exists and is newer than `narration.txt`:
- Print: "audio.mp3 is up to date. Re-run anyway? (yes/no)"
- If no, exit.

# Run

Execute (from the plugin install dir, typically `~/.claude/plugins/...`):

```bash
node scripts/narrate.mjs --workdir <abs-workdir-path>
```

The script handles provider selection (per `provider-select.mjs`), TTS call, normalization, marker reattachment, and writes `audio.mp3` + `word-timestamps.json`.

# On success

Print:
- Provider used, voice ID
- Word count, audio duration
- Path to audio file
- Next step: "Listen to audio. Run `/animate` when ready."

# On failure

- 401: "Invalid TTS key. Check env var or `~/.config/video-gen/keys.json`."
- 402/429: print provider message verbatim. Do not retry.
- Word reconciliation failure: point user at `narrate-debug.json`.

Surface errors. Do not auto-retry.
```

- [ ] **Step 2: Commit**

```bash
git add commands/narrate.md
git commit -m "feat(commands): /narrate Stage 3 entry point"
```

---

### Task 4.4: Create `/animate` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Create: `commands/animate.md`

- [ ] **Step 1: Write the command**

```markdown
---
description: Run Stage 4 (scene animation) — derives scenes.json, scaffolds HyperFrames project, dispatches engineer agents per scene
---

Run Stage 4 of the video-gen pipeline.

# Preflight

- Find working dir as in `/narrate`.
- Verify `word-timestamps.json` exists (Stage 3 must have run).
- Verify `npx hyperframes --version` works. If not, print install command: `npm i -g hyperframes` and exit.
- Verify `manim --version` and `kpsewhich latex` succeed if any scene in `storyboard.md` uses engine: manim.

# Step 1 — Derive scenes.json

If `scenes.json` is missing or stale relative to `word-timestamps.json` or `storyboard.md`:
1. Parse `storyboard.md` to extract per-scene engine and intent.
2. Read `word-timestamps.json`'s `marker_positions` and `words` (excluding markers).
3. Run `scripts/lib/timestamps-to-scenes.mjs`'s `deriveScenes()` then `mergeStoryboardMetadata()`.
4. Write `scenes.json`.

# Step 2 — Scaffold HyperFrames project (if missing)

If `<workdir>/hyperframes/` doesn't exist:
```bash
cd <workdir> && npx hyperframes init hyperframes
```

Copy `<workdir>/audio.mp3` to `<workdir>/hyperframes/public/audio.mp3`.

Create `<workdir>/hyperframes/public/manim-clips/` (empty).

# Step 3 — Top-level composition

Write `<workdir>/hyperframes/src/main.html` (or whatever HyperFrames uses) that:
- References `public/audio.mp3` as the master audio track.
- Includes each scene's HTML on the timeline at its `start_s` offset.
- For Manim scenes, references the to-be-rendered `public/manim-clips/<index>-<name>.mp4`.

Use the HyperFrames own `/hyperframes` skill for canonical syntax of the top-level composition.

# Step 4 — Dispatch engineer agents per scene

For each scene in `scenes.json` (parallelize where possible):
- engine == "manim" → dispatch `manim-engineer` subagent with the scene object + `out_path = manim-clips/<index>-<name>.mp4`. After render, copy MP4 → `hyperframes/public/manim-clips/`.
- engine == "hyperframes" → dispatch `hyperframes-engineer` subagent with the scene + `out_path = hyperframes/src/scenes/<index>-<name>.html`.

# Step 5 — Preview hint

Print:
> "Scenes generated. Preview with `cd <workdir>/hyperframes && npx hyperframes preview`. Run `/render` when satisfied."

# Failures

- Manim render failure: capture stderr to `manim-clips/<scene>.error.log`, do not auto-retry.
- HyperFrames init failure: surface error, suggest checking Node version (>=22) and FFmpeg.
- Word reconciliation already happened in Stage 3 — re-derivation here just re-reads files.
```

- [ ] **Step 2: Commit**

```bash
git add commands/animate.md
git commit -m "feat(commands): /animate Stage 4 with parallel per-scene dispatch"
```

---

### Task 4.5: Update `/render` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Modify: `commands/render.md`

- [ ] **Step 1: Replace contents**

```markdown
---
description: Run Stage 5 (final render) — shell out to npx hyperframes render
---

Run Stage 5 of the video-gen pipeline: the final render to MP4.

# Preflight

- Find working dir.
- Verify `<workdir>/hyperframes/` exists. If not: "Run `/animate` first."
- Verify `<workdir>/hyperframes/public/audio.mp3` exists.

# Run

```bash
cd <workdir>/hyperframes && npx hyperframes render
```

HyperFrames writes the final video to `<workdir>/hyperframes/out/video.mp4` (or wherever its config points).

# On success

Print:
- Final video path.
- File size and duration (use `ffprobe` if available).
- "Done. Final video: `<workdir>/hyperframes/out/video.mp4`"

# On failure

- Capture stderr to `<workdir>/render.error.log`.
- Do NOT attempt automatic fixes. Suggest invoking HyperFrames' own `/hyperframes-cli` skill for debugging.
```

- [ ] **Step 2: Commit**

```bash
git add commands/render.md
git commit -m "feat(commands): /render Stage 5 via hyperframes"
```

---

### Task 4.6: Create `/video-gen-setup` command [parallel-group: 4]

**Discipline:** Content task
**Files:**
- Create: `commands/video-gen-setup.md`

- [ ] **Step 1: Write the command**

```markdown
---
description: One-time setup — store TTS keys and verify HyperFrames is installed
---

One-time setup for video-gen. Run this before your first `/explain`.

# Steps

## 1. Verify HyperFrames

```bash
npx hyperframes --version
```

If this fails, print:
> "HyperFrames not installed. Run: `npm i -g hyperframes` (or use the local install: `npx --yes hyperframes init` will fetch it). Requires Node ≥22 and FFmpeg."

Exit if HyperFrames is missing.

## 2. Check existing TTS keys

```bash
ls ~/.config/video-gen/keys.json 2>/dev/null
echo "CARTESIA_API_KEY=${CARTESIA_API_KEY:+set}"
echo "ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:+set}"
```

If either env var is set OR the keys.json exists, ask: "Keys already configured. Reconfigure? (yes/no)". If no, exit.

## 3. Ask which providers to configure

Ask: "Which TTS providers do you want to configure? (cartesia, elevenlabs, both)"

For each chosen provider, prompt:
- "Paste your <provider> API key (will be saved to `~/.config/video-gen/keys.json` with chmod 600):"
- Validate non-empty.

## 4. Write keys.json

```bash
mkdir -p ~/.config/video-gen
cat > ~/.config/video-gen/keys.json <<EOF
{
  "cartesia": "<key-or-null>",
  "elevenlabs": "<key-or-null>"
}
EOF
chmod 600 ~/.config/video-gen/keys.json
```

NEVER echo the key value to the terminal after writing — just confirm "Saved to `~/.config/video-gen/keys.json` (chmod 600)."

## 5. Optional: install HyperFrames skills

Ask: "Install HyperFrames' own Claude Code skills for richer authoring? (yes/no)"

If yes:
```bash
npx skills add heygen-com/hyperframes
```

## 6. Verify

Run a no-op narrate dry-check (just provider selection):
```bash
node -e "import('./scripts/lib/provider-select.mjs').then(m => console.log(m.selectProvider({ flag:null, env:process.env, config_keys: JSON.parse(require('fs').readFileSync(require('os').homedir() + '/.config/video-gen/keys.json'))})))"
```

Print: "Setup complete. Try `/explain <topic>`."
```

- [ ] **Step 2: Commit**

```bash
git add commands/video-gen-setup.md
git commit -m "feat(commands): /video-gen-setup one-time configuration"
```

---

## Phase 5 — Plugin manifest + test infrastructure

### Task 5.1: Update plugin.json + marketplace.json [parallel-group: 5]

**Discipline:** Content task
**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Update `plugin.json` description**

Replace `.claude-plugin/plugin.json`:

```json
{
  "name": "video-gen",
  "version": "0.1.0",
  "description": "Generate Vox-style animated explainer videos via a 5-stage pipeline. Reads memory for personalization. Uses HyperFrames for rendering, Manim for math scenes, Cartesia or ElevenLabs for narration.",
  "author": {
    "name": "Marmik Pandya",
    "url": "https://github.com/marmikcfc"
  },
  "homepage": "https://github.com/marmikcfc/video-gen",
  "repository": "https://github.com/marmikcfc/video-gen",
  "license": "MIT",
  "keywords": ["video", "animation", "explainer", "hyperframes", "manim", "vox", "tts", "cartesia", "elevenlabs"]
}
```

- [ ] **Step 2: Update `marketplace.json` description**

Replace `.claude-plugin/marketplace.json`:

```json
{
  "name": "video-gen",
  "owner": {
    "name": "Marmik Pandya",
    "url": "https://github.com/marmikcfc"
  },
  "plugins": [
    {
      "name": "video-gen",
      "source": ".",
      "description": "5-stage Vox-style explainer video pipeline (HyperFrames + Manim + Cartesia/ElevenLabs)."
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(manifest): update plugin description for new architecture"
```

---

### Task 5.2: Create SMOKE.md and agent-evals [parallel-group: 5]

**Discipline:** Content task
**Files:**
- Create: `tests/SMOKE.md`
- Create: `tests/agent-evals/topics.md`

- [ ] **Step 1: Write SMOKE.md**

```markdown
# Manual smoke test checklist

Run before any release. Two passes (one per TTS provider), ~15 minutes each.

## Setup

1. Clean test dir: `rm -rf ~/.video-gen-test && mkdir ~/.video-gen-test && cd ~/.video-gen-test`
2. Export TTS key: `export CARTESIA_API_KEY=...` (or `ELEVENLABS_API_KEY`).
3. Verify tooling:
   - `node --version` → ≥22
   - `npx hyperframes --version` → installed
   - `manim --version` → installed (skip if test topic has no math scenes)
   - `which ffprobe` → installed
4. Plugin installed in Claude Code: `/plugin list` → video-gen listed.

## Test 1 — Math-heavy topic with Cartesia

1. `/explain "pythagorean theorem"`
2. Approve storyboard verbatim (don't edit). Verify:
   - 5 scenes named hook, tension, metaphor, reveal, recap
   - Scenes 3, 4 chose `manim`; rest chose `hyperframes`
   - Total estimated runtime 1:30–3:00
3. Approve narration. Verify:
   - `audio.mp3` plays cleanly, no truncation
   - `word-timestamps.json` exists; word count within ±5 of `narration.txt` word count
   - `scenes.json` exists; sum of `duration_s` ≈ `audio_duration_s`
4. Approve animate. Verify:
   - `<workdir>/hyperframes/src/scenes/` has 5 HTML files
   - `<workdir>/manim-clips/` has 2 MP4s (scenes 3, 4)
   - `npx hyperframes preview` shows all 5 scenes in order
5. `/render`. Verify:
   - `out/video.mp4` exists, plays end-to-end
   - Audio synced to visuals
   - Total duration within 10% of expected

## Test 2 — Narrative topic with ElevenLabs

Repeat Test 1 with topic "why is San Francisco expensive" and `--provider elevenlabs`. Verify all 5 scenes chose `hyperframes` (no Manim).

## Error-path checks (during Test 1)

After Test 1 step 3 succeeds:
- Edit `narration.txt`, change one word.
- Re-run `/narrate`. Verify staleness detection prompts user.
- Approve regeneration. Verify new `audio.mp3` differs from previous.

## Pass criteria

All steps complete with no surfaced errors. Final videos play without artifacts. Total time per provider ≤20 minutes.
```

- [ ] **Step 2: Write agent-evals topics**

```markdown
# Agent evaluation topics

Run `/storyboard <topic>` for each (no TTS, no render). Reviewer scores 1–5 on:
- 5-beat structure present
- Engine choices defensible
- Narration sounds Vox-like
- ONE-thing sentence is clear

Diagnostic only; not pass/fail. Run after any director-agent prompt change.

## Canonical topics

1. **"Why does ice float?"** — Expected: hyperframes-heavy, soft science.
2. **"How does gradient descent work?"** — Expected: manim-heavy on metaphor and reveal scenes.
3. **"What is a hash table?"** — Expected: hyperframes with one manim scene for collision math.
4. **"Bayes' theorem"** — Expected: manim-dominant.
5. **"Why is San Francisco expensive?"** — Expected: hyperframes only, no manim.

## Scoring template

```
Topic: <topic>
Date: <YYYY-MM-DD>
Reviewer: <name>

| Criterion | Score (1-5) | Notes |
|---|---|---|
| 5-beat structure present | | |
| Engine choices defensible | | |
| Narration sounds Vox-like | | |
| ONE-thing sentence is clear | | |
```
```

- [ ] **Step 3: Commit**

```bash
mkdir -p tests/agent-evals
git add tests/SMOKE.md tests/agent-evals/topics.md
git commit -m "test: manual smoke checklist + agent-eval canonical topics"
```

---

### Task 5.3: Add capture-fixture.mjs helper [parallel-group: 5]

**Discipline:** Code task (minimal)
**Files:**
- Create: `scripts/capture-fixture.mjs`

- [ ] **Step 1: Write the helper**

```js
// scripts/capture-fixture.mjs
// Usage: node scripts/capture-fixture.mjs --provider cartesia --text "hello world" --out tests/fixtures/cartesia/new.json
import { writeFile } from "node:fs/promises";
import { callCartesia } from "./lib/cartesia-client.mjs";
import { callElevenLabs } from "./lib/elevenlabs-client.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--provider") out.provider = argv[++i];
    else if (argv[i] === "--text") out.text = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

function scrub(obj) {
  // Replace likely-identifying fields with placeholders
  const json = JSON.stringify(obj, (k, v) => {
    if (k === "voice_id") return "scrubbed-voice-id";
    if (k === "request_id") return "scrubbed-request-id";
    if (k === "user_id") return "scrubbed-user-id";
    return v;
  });
  return JSON.parse(json);
}

const { provider, text, out } = parseArgs(process.argv.slice(2));
if (!provider || !text || !out) {
  console.error("usage: --provider cartesia|elevenlabs --text \"...\" --out path");
  process.exit(1);
}

const apiKey = provider === "cartesia" ? process.env.CARTESIA_API_KEY : process.env.ELEVENLABS_API_KEY;
const result = provider === "cartesia"
  ? await callCartesia({ text, apiKey })
  : await callElevenLabs({ text, apiKey });

await writeFile(out, JSON.stringify(scrub(result.raw), null, 2));
console.log(`wrote fixture to ${out}`);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/capture-fixture.mjs
git commit -m "feat(scripts): capture-fixture helper for adding TTS response fixtures"
```

---

## Phase 6 — README update

### Task 6.1: Rewrite README for new architecture

**Discipline:** Content task
**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README**

```markdown
# video-gen

A Claude Code plugin for generating Vox-style animated explainer videos. Topic in, MP4 out — via a 5-stage pipeline you can checkpoint, edit, and resume.

## What it does

```
/explain "why does ice float"
```

Runs five stages:
1. **Context** — director reads your Claude memory, asks 1–2 audience questions.
2. **Storyboard** — Vox-style 5-beat plan with per-scene engine (Manim vs HyperFrames).
3. **Narrate** — Cartesia or ElevenLabs TTS with word-level timestamps. Scenes' timing is derived from those timestamps.
4. **Animate** — engineer subagents generate Manim Python or HyperFrames HTML, parallelized per scene.
5. **Render** — HyperFrames composes audio + visuals into a single MP4.

You approve cheap artifacts (storyboard, voice) before expensive ones (animation, render). You can edit any artifact and re-run from that stage.

## Install

```bash
# In Claude Code
/plugin marketplace add marmikcfc/video-gen
/plugin install video-gen@video-gen
```

Then one-time setup:
```
/video-gen-setup
```

## Requirements

- **Node.js ≥22** + **FFmpeg** (HyperFrames requirements)
- **[HyperFrames](https://github.com/heygen-com/hyperframes)** — `npm i -g hyperframes` (or via its skills package)
- **Manim Community Edition + LaTeX** — only when a video uses math scenes
- **TTS API key** — Cartesia or ElevenLabs

## Surface

| Surface | What it is |
|---|---|
| `/explain <topic>` | Full 5-stage pipeline |
| `/storyboard <topic>` | Stages 1+2 only |
| `/narrate` | Re-run Stage 3 |
| `/animate` | Re-run Stage 4 |
| `/render` | Re-run Stage 5 |
| `/video-gen-setup` | One-time setup |
| `explainer-director` agent | Memory-aware Vox storyboarding |
| `manim-engineer` agent | Math scene → Manim Python |
| `hyperframes-engineer` agent | Narrative scene → HyperFrames HTML |
| Skills | `vox-explainer-structure`, `choosing-the-tool`, `manim-essentials`, `hyperframes-essentials`, `narration-writing`, `voice-driven-timing`, `using-claude-memory` |

## Working directory

Each video gets its own directory under cwd: `.video-gen/<topic-slug>/`. State on disk — no hidden state, no in-memory persistence. You can inspect, edit, archive, or commit anything in there.

## Privacy

The plugin reads your Claude memory (`~/.claude/projects/.../memory/`) to personalize narration tone and framing. **It never embeds raw memory content in the storyboard, narration, or final video.** Memory references are listed by filename in `audience-brief.md` for traceability.

## Testing

```bash
npm test               # Layer 1 unit tests (fast, CI)
npm run test:fixtures  # Layers 1 + 2 (still fast, no network)
```

Layers 3 (smoke) and 4 (agent evals) are manual checklists in `tests/SMOKE.md` and `tests/agent-evals/`.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the 5-stage HyperFrames-engine architecture"
```

---

## Self-review (run before handing off)

After all phases are implemented, do a final pass:

1. **Spec coverage:** every section of `docs/superpowers/specs/2026-05-19-video-gen-pipeline-design.md` traces to a task.
2. **Placeholder scan:** `grep -r "TBD\|TODO\|XXX" scripts/ agents/ commands/ skills/`.
3. **Test pass:** `npm test` (Layer 1) and `npm run test:fixtures` (Layer 2) both green.
4. **Plugin loads:** `claude --plugin-dir .` succeeds and the slash commands appear.
5. **Smoke test:** run `tests/SMOKE.md` end-to-end at least once with one TTS provider.

---

## Dependency summary

```
1.0 (Node bootstrap) ─┬─→ 1.1 marker parser ──┬─→ 1.5 derive scenes ──┐
                     ├─→ 1.2 normalizers ────┤                       │
                     ├─→ 1.3 provider select ┤                       ├─→ 1.7 narrate.mjs
                     ├─→ 1.4 staleness       │                       │
                     └─→ 1.6 reconcile ──────┘                       │
                                                                      │
2.x (skills) ─────────────────────────────────────────────────────────┤
3.x (agents) ────────────────────── depends on skill content ────────┤
4.x (commands) ──────────────────── depends on agents + scripts ────┤
5.x (manifest, tests) ─────────────────────────────────────────────┤
6.x (README) ───────────── depends on all above ───────────────────┘
```

Phases 1 and 2 can run in parallel (different files). Phase 3 reads Phase 2 content (skill names referenced). Phase 4 depends on Phases 1, 2, 3 (agents + scripts must exist). Phases 5 and 6 are last.
