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
