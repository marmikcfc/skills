---
description: Run Stage 4 (scene animation) — derives scenes.json, scaffolds the HyperFrames project, dispatches engineer agents per scene, verifies the assembled composition
---

Run Stage 4 of the video-gen pipeline.

> **Composition syntax is not defined here.** HyperFrames owns the authoring
> contract and versions it. Read the `hyperframes-core` skill before writing any
> composition HTML; this file defines only *our* project layout and the
> Manim↔HyperFrames seam. Never paraphrase the contract — defer to it.

# Preflight

- Find working dir as in `/narrate`.
- Verify `word-timestamps.json` exists (Stage 3 must have run).
- Verify `npx hyperframes --version` works. If not: `npm i -g hyperframes`, then exit.
- If any scene in `storyboard.md` uses `engine: manim`, verify `manim --version`
  and `kpsewhich latex` both succeed.

# Step 1 — Derive scenes.json

If `scenes.json` is missing or stale relative to `word-timestamps.json` or `storyboard.md`:

1. Parse `storyboard.md` with `parseStoryboard()` from `scripts/lib/storyboard.mjs`,
   then `toSceneMetadata()`. **Print every returned warning** — the parser never
   throws, so a silent run means the storyboard was well-formed, and warnings are
   the only signal that a scene is missing an engine or narration.
2. Read `word-timestamps.json`'s `marker_positions` and `words`.
3. Run `deriveScenes()` then `mergeStoryboardMetadata()` from `scripts/lib/timestamps-to-scenes.mjs`.
4. Write `scenes.json`.

Each scene carries `{index, name, start_s, end_s, duration_s, engine, intent, narration}`.

# Step 2 — Scaffold the HyperFrames project

If `<workdir>/hyperframes/` doesn't exist:

```bash
cd <workdir> && npx hyperframes init hyperframes --non-interactive --example blank
```

**Verified scaffold layout** (`hyperframes init`, CLI 0.7.x) — do not invent paths:

```
<workdir>/hyperframes/
├── index.html            ← the MAIN composition. NOT src/main.html.
├── hyperframes.json      ← paths config: blocks=compositions, assets=assets
├── package.json          ← pins the CLI version; keep the pin
├── compositions/         ← sub-compositions (one per scene)
│   └── components/
└── assets/               ← media. NOT public/.
```

Then create our asset locations and copy narration audio:

```bash
cd <workdir>/hyperframes
mkdir -p assets/manim compositions
cp <workdir>/audio.mp3 assets/narration.mp3
```

# Step 3 — Write the main composition (`index.html`)

Read `hyperframes-core` for the authoritative attribute contract. Our layout
requirements on top of it:

**Root.** `data-composition-id="main"`, `data-duration` = the last scene's `end_s`,
`data-width`/`data-height` per target aspect (16:9 → 1920×1080).

**Narration audio.** One `<audio>` on a high track, spanning the timeline:

```html
<audio id="narration" src="assets/narration.mp3"
       data-start="0" data-duration="<total_s>" data-track-index="10" data-volume="1"></audio>
```

**Each HyperFrames scene** mounts as a sub-composition at its absolute offset:

```html
<div data-composition-id="s<NN>-<name>"
     data-composition-src="compositions/<NN>-<name>.html"
     class="clip" data-start="<start_s>" data-duration="<duration_s>"
     data-track-index="1"></div>
```

**Each Manim scene** is a `<video>` — at root, or inside the scene sub-comp when
its own timeline must animate it (see rule 2):

```html
<video id="s<NN>-manim" class="clip" src="assets/manim/<NN>-<name>.mp4"
       data-start="<start_s>" data-duration="<duration_s>" data-track-index="1"
       muted playsinline></video>
```

Manim MP4s are **silent** — all narration comes from the single `<audio>`.
Never add an `<audio>` for a Manim clip.

## What `check` rejects — verified on a real render

These four came out of an actual `hyperframes check` run, in the order it raised
them. Read `hyperframes-core/references/sub-compositions.md` for the shapes; this
list is only what to confirm before you run `check`:

- [ ] Each scene file's root element (**inside** `<template>`) carries its own
      `data-composition-id`, `data-width`, `data-height`.
- [ ] The host mount `<div>` *also* carries `data-width`/`data-height`, and its
      `data-composition-id` matches the scene file's.
- [ ] `index.html` registers its own `window.__timelines["main"]`, not just the
      scenes'. A main composition with no timeline fails lint.
- [ ] Every `<style>` and `<script>` a scene needs is **inside** its `<template>`.
      The runtime clones only template contents; `<head>` is discarded.

## Four rules that fail silently if broken

These are the seam's real failure modes. Every one is silent: no error, wrong output.

1. **Namespace every id `s<NN>-*`.** Duplicate `<video>`/`<img>` ids across files
   render **blank**, and `lint` does not catch cross-file duplicates. Scene agents
   run in parallel and cannot see each other's ids, so the prefix is the only thing
   preventing collision.
2. **A sub-composition timeline cannot animate host-root elements.** If a Manim
   `<video>` lives at root, its motion must be authored on the main timeline at
   *global* time. To drive it with scene-local time, put the `<video>` inside the
   scene's sub-comp instead.
3. **Do not nest timed media in a timed wrapper**, and never call `play()`,
   `pause()`, or seek — HyperFrames owns playback.
4. **Match fps.** Render Manim at the composition's fps (default 30). A 60fps
   Manim clip in a 30fps render is decimated 2:1 with no warning.

# Step 4 — Dispatch engineer agents per scene

For each scene in `scenes.json`, parallelizing where possible:

- `engine == "manim"` → dispatch `manim-engineer` with the scene object and
  `out_path = assets/manim/<NN>-<name>.mp4`, at **30fps, 1920×1080, no preview
  flag**. After it returns, place the file with `registerManimAsset()`.
- `engine == "hyperframes"` → dispatch `hyperframes-engineer` with the scene and
  `out_path = compositions/<NN>-<name>.html`, telling it its id prefix is `s<NN>-`.

Pass every agent: the scene object, its id prefix, target fps, and canvas
dimensions. A stateless agent cannot infer these.

# Step 5 — Verify the assembly (required)

Assembly is where mixed-engine videos break, so never hand back an unverified project:

```bash
cd <workdir>/hyperframes
npx hyperframes check
```

Then confirm the seam specifically:

- Every `assets/manim/*.mp4` referenced in `index.html` exists on disk.
- No duplicate ids across files:
  ```bash
  grep -ho 'id="[^"]*"' index.html compositions/*.html | sort | uniq -d
  ```
  Any output is a bug — those elements render blank.
- For a mixed-engine video, snapshot mid-Manim-scene and confirm the panel isn't black:
  ```bash
  npx hyperframes snapshot . --time <mid_of_a_manim_scene>
  ```

If `check` fails, fix it before reporting success. A passing `check` is the minimum
bar for calling this stage complete.

# Step 6 — Preview hint

> "Scenes generated and `check` passed. Preview with `cd <workdir>/hyperframes && npx hyperframes preview`. Run `/render` when satisfied."

# Failures

- **Manim render failure:** capture stderr to `assets/manim/<scene>.error.log`, do not auto-retry.
- **`hyperframes init` failure:** surface the error; check Node >= 22 and FFmpeg.
- **Black panel where a Manim clip belongs:** almost always a duplicate id (rule 1)
  or a missing file. Check those two before debugging anything else.
- **Manim clip shorter than its slot:** the last frame freezes for the remainder.
  Re-render with `self.wait()` padding rather than shortening the scene.
