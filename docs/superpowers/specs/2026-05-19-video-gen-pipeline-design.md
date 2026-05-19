# video-gen pipeline design

**Date:** 2026-05-19
**Status:** Design approved, awaiting implementation plan
**Owner:** Marmik Pandya

## Summary

`video-gen` is a Claude Code plugin that generates Vox-style animated explainer videos. It orchestrates a five-stage pipeline that turns a topic into a final MP4: context-gathering, storyboarding, voice-over generation, scene animation, and rendering. The plugin is voice-driven — TTS word-level timestamps determine when each scene starts and ends, not the storyboard.

The plugin does not reimplement rendering. It treats [HyperFrames](https://github.com/heygen-com/hyperframes) as the rendering engine (HTML compositions, deterministic MP4 output, FFmpeg-based) and adds the layers above it: pedagogical structure (Vox 5-beat narrative), personalization (Claude memory + sibling-plugin context), math animation via Manim, voice-over via Cartesia or ElevenLabs, and the scene-timing logic that aligns word timestamps to scene boundaries.

## Goals and non-goals

### Goals
- Generate short (90s–3min) explainer videos that actually teach, in the style of Vox/Kurzgesagt/3Blue1Brown.
- Personalize narration to the user's audience, expertise, and prior context (via Claude Code memory and optional sibling plugins).
- Support mixed-engine videos — Manim for math-heavy scenes, HyperFrames for narrative/HTML scenes — composed into a single output.
- Provide a checkpointed pipeline so users approve cheap artifacts (storyboard, voice) before expensive ones (animation, render).
- Operate without a long-running local server. Keys live in env vars or a config file.

### Non-goals
- Real-time / live video generation.
- Editor-style REPL with selective re-runs per stage (deferred to v2).
- Provider abstraction beyond Cartesia and ElevenLabs (deferred until a third provider is needed).
- Remotion support (HyperFrames covers the same use case).
- AI generative video models (Runway, Sora, etc).
- Hosting a marketplace of pre-made templates.

## Prerequisites

- **HyperFrames** must be installed (`npm i -g hyperframes` or via its skills package). The plugin checks for this and fails fast with the install command if missing.
- **Node.js ≥ 22**, **FFmpeg** (HyperFrames' own requirements).
- **Manim Community Edition** + working LaTeX install — required only when a video uses math scenes.
- **TTS API key** — either `CARTESIA_API_KEY` or `ELEVENLABS_API_KEY` in env, or written to `~/.config/video-gen/keys.json`.

## Architecture

### Pipeline overview

The user runs `/explain <topic>` (or the per-stage commands). The pipeline progresses through five stages, with three checkpoint pauses where the user approves cheap artifacts before more expensive ones are produced:

```
1. CONTEXT   → director reads ~/.claude/.../memory/, asks audience questions
2. STORYBOARD → director writes Vox 5-beat plan with scene markers + per-scene engine
                ⏸ USER APPROVES
3. NARRATE   → TTS the narration once, derive scene timestamps
                ⏸ USER LISTENS & APPROVES
4. ANIMATE   → engineer subagents generate Manim/HyperFrames code per scene
                ⏸ USER PREVIEWS via `npx hyperframes preview` & APPROVES
5. RENDER    → `npx hyperframes render` → out/video.mp4
```

Each stage writes its outputs to a per-video working directory (`<cwd>/.video-gen/<topic-slug>/`). State is files on disk, not in-memory.

### Working directory layout

Per video:

```
<cwd>/.video-gen/<topic-slug>/
  audience-brief.md              # stage 1
  storyboard.md                  # stage 2 (human-readable)
  narration.txt                  # stage 2 (clean TTS input with [SCENE:] markers)
  audio.mp3                      # stage 3
  word-timestamps.json           # stage 3 (normalized provider output)
  scenes.json                    # stage 3 (derived: scene name, engine, time window)
  manim-clips/
    <index>-<name>.mp4           # only present if a scene chose manim
  hyperframes/                   # hyperframes project (created by `hyperframes init`)
    src/scenes/*.html
    public/audio.mp3             # copied from ../audio.mp3
    public/manim-clips/*.mp4     # copied from ../manim-clips/
    out/video.mp4                # stage 5 final output
```

Re-running `/explain <topic>` from the same cwd is idempotent — the plugin reads existing artifacts and resumes from the earliest stale stage.

## Components

### Slash commands (`commands/`)

| Command | Stage(s) | Purpose |
|---|---|---|
| `/explain <topic>` | 1→5 | Full pipeline with checkpoints. The default user entry point. |
| `/storyboard <topic>` | 1+2 | Only context-gathering + storyboard. For users who want to iterate the script before any TTS spend. |
| `/narrate` | 3 | Re-run TTS against the current `storyboard.md` in the cwd's `.video-gen/<slug>/`. |
| `/animate` | 4 | Re-run scene code generation against the current `scenes.json`. |
| `/render` | 5 | Shell out to `npx hyperframes render`. |
| `/video-gen-setup` | — | One-time helper. Prompts for Cartesia/ElevenLabs keys, writes `~/.config/video-gen/keys.json` with `chmod 600`. Checks HyperFrames is installed; prints install command if not. |

`/explain` is the happy path. The others let a user re-enter the middle of the pipeline without re-running upstream stages.

### Subagents (`agents/`)

| Agent | Responsibility | Tools |
|---|---|---|
| `explainer-director` | Stages 1+2: reads memory, detects sibling plugins, asks 1–2 audience questions, writes storyboard with scene markers + per-scene engine choice. | Read, Write, WebFetch, WebSearch, Bash |
| `manim-engineer` | One Manim scene → runnable Python → MP4 sized to the scene's duration. Stateless: sees only one scene at a time. | Read, Write, Edit, Bash, Glob, Grep |
| `hyperframes-engineer` | One HyperFrames scene → HTML composition. Delegates to HyperFrames' own `/hyperframes` skill for deep questions. Stateless. | Read, Write, Edit, Bash, Glob, Grep |

The director is the brain. Engineer agents are dumb codegen — they receive a single scene object and write code that fits its duration. Stateless engineers enable parallel dispatch across scenes in Stage 4.

### Skills (`skills/`)

| Skill | Status | Purpose |
|---|---|---|
| `vox-explainer-structure` | Keep (from initial scaffold) | The 5-beat pedagogy. Universal across engines. |
| `choosing-the-tool` | Update | Frame the choice as Manim (math) vs HyperFrames (everything else). Remove Remotion. |
| `manim-essentials` | Keep | Manim Community Edition conventions. |
| `hyperframes-essentials` | New | When to use which HyperFrames adapter (GSAP, Tailwind, Lottie). Notes that we delegate to HyperFrames' own `/hyperframes` skill for deep questions. |
| `narration-writing` | New | How to write narration that TTSes well: scene markers (`[SCENE: name]`), pacing punctuation, what to avoid (markdown, parentheticals). |
| `voice-driven-timing` | New | How word-level timestamps derive scene boundaries. Documents the marker algorithm. |
| `using-claude-memory` | New | How the director should read `~/.claude/projects/.../memory/` — what to look for (audience, expertise, examples), what to ignore (in-progress task state), and the privacy rule (never embed raw memory content in storyboard or narration). |

The `remotion-engineer` agent and `remotion-essentials` skill from the initial scaffold are deleted.

### Helper scripts (`scripts/`)

Node ESM (`.mjs`) since HyperFrames is Node.

- `scripts/narrate.mjs` — TTS provider abstraction. Reads `narration.txt`, calls Cartesia or ElevenLabs based on which key is set, writes `audio.mp3` + `word-timestamps.json`.
- `scripts/timestamps-to-scenes.mjs` — Parses `word-timestamps.json`, locates `[SCENE: name]` marker positions (recorded during the strip-before-TTS step), emits `scenes.json` with start/end times per scene.
- `scripts/register-manim-asset.mjs` — Given a Manim MP4 and a scene window, copies it into the HyperFrames project's `public/` and writes the asset reference into the appropriate HTML composition.
- `scripts/staleness.mjs` — Small mtime-comparison helper used by re-entry commands.
- `scripts/capture-fixture.mjs` — Dev helper for recording a real TTS response into `tests/fixtures/` (scrubs voice IDs, request IDs).

## Data flow

### Artifacts and schemas

**`audience-brief.md`** — narrative markdown, ~10–20 lines:
```markdown
## Audience brief: <slug>
- **Expertise level:** ...
- **Likely confusion:** ...
- **Preferred framing:** ...
- **Tone:** ...
- **Memory hints used:** [list of memory file names cited; no raw content]
```

**`storyboard.md`** — the human-readable plan. Five scenes (hook, tension, metaphor, reveal, recap), each with engine, visual intent, and verbatim narration:
```markdown
## Storyboard: <slug>
**The ONE thing:** ...
**Estimated runtime:** m:ss

### Scene 1 — Hook (engine: hyperframes)
**Visual intent:** ...
**Narration:** "..."
```

**`narration.txt`** — clean TTS input, derived from `storyboard.md`. Only narration text plus `[SCENE: name]` markers — no markdown, no scene headers, no parentheticals:
```
[SCENE: hook] Why does measuring one particle...

[SCENE: tension] You might think the particles are sending signals...
```

**`word-timestamps.json`** — normalized TTS output:
```json
{
  "audio_duration_s": 152.3,
  "provider": "cartesia",
  "voice_id": "...",
  "words": [
    {"text": "Why",      "start": 0.42, "end": 0.61, "is_marker": false, "scene": "hook"},
    {"text": "[SCENE:",  "start": 0.30, "end": 0.30, "is_marker": true,  "scene": "hook"},
    {"text": "does",     "start": 0.62, "end": 0.79, "is_marker": false, "scene": "hook"}
  ]
}
```

Markers carry zero-duration synthetic timestamps placed immediately before the first real word of their scene.

**`scenes.json`** — derived, the contract for Stage 4:
```json
{
  "total_duration_s": 152.3,
  "scenes": [
    {
      "index": 1,
      "name": "hook",
      "engine": "hyperframes",
      "intent": "...",
      "narration": "Why does measuring one particle...",
      "start_s": 0.42,
      "end_s": 8.15,
      "duration_s": 7.73
    }
  ]
}
```

### Scene-marker algorithm

The hardest piece. Narration arrives at TTS as plain text — `[SCENE: name]` would either get read aloud or pause-collapsed, neither helpful. Solution: strip markers *before* TTS, but record their position in word-index space.

```
Step 1 — Tokenize narration.txt into TEXT and MARKER tokens.
Step 2 — Build two outputs in one pass:
   - clean_text: TEXT contents joined with spaces (this is what TTS sees)
   - marker_positions: [{scene_name, word_index_in_clean_text}, ...]
Step 3 — Send clean_text to provider. Receive normalized words[].
Step 4 — For each marker_position {scene, word_index}:
   scene.start_s = words[word_index].start
   scene.end_s   = words[next_marker_word_index - 1].end
        (or words[last].end for the final scene)
Step 5 — Emit scenes.json with engine + intent merged from storyboard.md.
```

Edge cases:
- Marker with no trailing words → error, before TTS.
- Duplicate marker names → error, before TTS.
- TTS word-count differs from expected → fall back to content matching with edit-distance ≤ 1. If still misaligned, write `narrate-debug.json` with side-by-side sequences and abort.

### Provider abstraction

`scripts/narrate.mjs` has one adapter per provider, both emitting the same normalized `word-timestamps.json` shape.

**Cartesia** — `POST https://api.cartesia.ai/tts/bytes`, returns audio bytes + `word_timestamps: [{word, start, end}]`. Direct map; no transformation.

**ElevenLabs** — `POST /v1/text-to-speech/{voice_id}/with-timestamps`, returns audio + `alignment: {characters, character_start_times_seconds, character_end_times_seconds}`. Collapse character timestamps into word timestamps by detecting whitespace boundaries; punctuation attaches to the preceding word.

**Provider selection priority:**
1. Explicit `--provider cartesia|elevenlabs` flag.
2. `VIDEO_GEN_TTS_PROVIDER` env var.
3. Presence of key: `CARTESIA_API_KEY` is preferred when both are set, with a warning printed.

### Stage 4 dispatch

Stage 4 owns project setup *before* dispatching scene engineers:

```
Setup (runs once at start of Stage 4):
  1. If hyperframes/ does not exist: `npx hyperframes init hyperframes` to scaffold the project.
  2. Copy <slug>/audio.mp3 → <slug>/hyperframes/public/audio.mp3.
  3. Create hyperframes/public/manim-clips/ (empty).
  4. Write the top-level composition file that references audio.mp3 as the master audio
     and lays out all scenes on the timeline aligned to scenes.json timestamps.

Per-scene dispatch (stateless, parallelizable):
for scene in scenes.json.scenes:
  if scene.engine == "manim":
    dispatch manim-engineer({scene, target_duration: scene.duration_s, out: manim-clips/{index}-{name}.mp4})
    after render: copy MP4 → hyperframes/public/manim-clips/; write asset stub into scene HTML
  if scene.engine == "hyperframes":
    dispatch hyperframes-engineer({scene, target_duration: scene.duration_s, out: hyperframes/src/scenes/{index}-{name}.html})
```

Each engineer receives one scene object only. They never see other scenes or the full storyboard. The top-level composition file (written during setup) is what stitches everything together — engineer outputs are *referenced by* it, not coordinated by it.

## Error handling

### Preflight

The first lines of each command. Not a separate tool — inlined per command.

| Stage | Preflight |
|---|---|
| 1+2 | Memory dir readable (optional — if missing, skip silently and note in `audience-brief.md`). |
| 3 | `narration.txt` exists; chosen provider's TTS key is set. If neither, point at `/video-gen-setup`. |
| 4 | `scenes.json` exists; `hyperframes --version` succeeds; if any scene is Manim, `manim --version` succeeds and `kpsewhich` (LaTeX) is detectable. |
| 5 | `hyperframes/` project exists; `audio.mp3` is in `hyperframes/public/`. |

Missing tools cause immediate non-zero exit with the exact install command.

### TTS errors (Stage 3)

| Error | Action |
|---|---|
| 401 | Print which key (env var name or config file path) is in use. Never print the key value. |
| 402 / 429 | Print provider message verbatim. No silent retry — TTS is expensive. |
| Network / timeout | Retry ≤ 2 times with exponential backoff (2s, 8s). Then fail. |
| Audio duration > 5 min | Warn; ask confirm. Provider-specific limits documented in the script. |
| Word count mismatch after marker stripping | Fall back to edit-distance matching. If still misaligned, write `narrate-debug.json` and abort. |

`audio.mp3` and `word-timestamps.json` are written only after success — no partial writes.

### Manim render failures (Stage 4)

- Always run `manim --dry-run scene.py SceneName` *before* the real render. Catches Python/import/syntax errors in ~1s.
- If dry-run passes but real render fails, capture stderr to `manim-clips/<scene>.error.log`. Do not auto-retry.
- Duration check: rendered MP4 must be ≥ `scene.duration_s × 0.95`. If shorter, pad with `self.wait()` and re-render. If longer by >10%, prompt user (storyboard or scene needs adjustment).

### HyperFrames render failures (Stage 5)

- Capture stderr to `.video-gen/<slug>/render.error.log`.
- Do not attempt automatic fixes. Suggest invoking HyperFrames' own `/hyperframes-cli` skill for debugging.

### Staleness rules

Re-entry commands use mtime comparison (no content hashes, no metadata files):

```
storyboard.md newer than narration.txt:
  → /narrate prompts: "Storyboard changed. Regenerate narration.txt?"
narration.txt newer than audio.mp3:
  → /narrate runs TTS.
audio.mp3 newer than scenes.json:
  → /narrate re-derives scenes.json (no TTS cost).
scenes.json newer than hyperframes/src/scenes/<scene>.html:
  → /animate warns about stale scenes, asks confirm before regenerating.
hyperframes/src/scenes/*.html newer than out/video.mp4:
  → /render runs.
```

### User cancellation

- Stage 3: if interrupted mid-call, money may be spent for nothing. Document; recommend letting it finish.
- Stage 4: per-scene files are atomic. Re-running `/animate` re-renders only missing scenes.
- Stage 5: HyperFrames writes to `.tmp.mp4` first, renames on success — interrupted renders don't corrupt a previous good MP4.

### Out of scope

- Disk full / permission errors (let OS errors propagate).
- HyperFrames internal bugs (their issue tracker).
- LaTeX install issues (Manim's docs).
- User typos in `storyboard.md` (caught at the checkpoint).

## Testing strategy

Four layers; only Layer 1 gates CI.

### Layer 1 — Unit tests (CI)

`node:test` runner, no extra deps. Under 2 seconds total.

| Module | Test cases |
|---|---|
| Marker parser (`narrate.mjs`) | Empty narration; single scene; 5 scenes; consecutive markers (error); marker with no trailing words (error); duplicate marker names (error). |
| Timestamp → scenes (`timestamps-to-scenes.mjs`) | Happy path; word-count match by exact text; word-count match with edit-distance ≤ 1; full mismatch produces debug JSON; final scene reaches end of audio. |
| Provider normalization (`narrate.mjs` adapters) | Cartesia fixture → unified shape; ElevenLabs character-alignment fixture → unified shape; unicode; punctuation attached to preceding word. |
| Staleness (`staleness.mjs`) | Newer/older/missing/equal mtime. |
| Provider selection | Explicit flag wins; env var wins over presence-of-key; both keys → warn + use first; neither → exit with setup hint. |

### Layer 2 — Fixture-based integration tests (local)

Real TTS provider responses captured once, committed as fixtures, frozen thereafter:

```
tests/fixtures/cartesia/{response-happy, response-long, response-unicode, response-quota-error}.json
tests/fixtures/elevenlabs/{response-happy, response-long, response-unicode, response-401}.json
```

Tests exercise `narrate.mjs` against fixtures only (no network). `scripts/capture-fixture.mjs` is used to record new fixtures when adding edge cases.

### Layer 3 — Manim/HyperFrames smoke tests (manual, pre-release)

Documented as `tests/SMOKE.md`. Two passes (one per TTS provider), ~15 minutes:

1. Clean test dir, both TTS keys exported, Manim + HyperFrames installed.
2. `/explain "pythagorean theorem"` → approve storyboard verbatim.
3. Verify: 5 scenes; scene 3 chose Manim.
4. Approve narration; verify audio plays cleanly, word-timestamps.json has expected count ± 5.
5. Approve animation preview; verify Manim scene plays in its window.
6. `/render`; verify out/video.mp4 plays end-to-end with synced audio.

### Layer 4 — Agent evaluation (manual, periodic)

Five canonical topics in `tests/agent-evals/topics.md`. Run `/storyboard <topic>` for each (no TTS, no render). Reviewer scores 1–5 on: 5-beat structure present, engine choices defensible, narration sounds Vox-like, ONE-thing sentence is clear. Diagnostic only; not pass/fail. Run after any director-agent prompt change.

### What we don't test

- Claude's responses themselves (defeats the point — agent-eval layer instead).
- End-to-end in CI (slow, costs money, requires external tools).
- HyperFrames internals.

### Commands

```bash
npm test               # Layer 1 (CI)
npm run test:fixtures  # Layers 1 + 2 (no network)
# Layers 3 + 4 are manual checklists
```

## Open items deferred to implementation plan

- Exact internal structure of the HyperFrames composition file (depends on what `hyperframes init` actually produces — needs hands-on inspection before implementation).
- Concurrency limit for parallel Manim renders (CPU-bound; default to 2 in the implementation plan, tunable via env var or flag).
- Whether to emit a transcript file (`transcript.srt` or `.vtt`) alongside the final video for accessibility. Word-level timestamps already exist; adding this is cheap if desired.
- Where the `<slug>` is derived from: user-supplied topic verbatim with naive slugification, or director-chosen short slug after Stage 1?

## Scope assessment

This spec covers a single coherent feature: a five-stage pipeline that turns a topic into a video. Components are deliberately small (3 agents, 7 skills, 6 commands, 5 helper scripts). The pipeline boundaries align with future REPL stages (Approach C in the brainstorm) if v2 expands in that direction. Appropriate for a single implementation plan.
