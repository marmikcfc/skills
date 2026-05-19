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
