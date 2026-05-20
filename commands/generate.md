---
description: Generate a short video (explainer, product launch, demo, etc.) via the full 5-stage pipeline
argument-hint: <description of the video you want>
---

Generate a short video: **$ARGUMENTS**

This produces ANY kind of short video — an explainer, a product launch, a demo, a codebase walkthrough. The director picks the right narrative structure and visual style for what you asked for; it does NOT assume everything is a Vox-style explainer.

You will orchestrate the full 5-stage pipeline with **three checkpoint pauses** for user approval. Do NOT skip checkpoints — they exist so the user doesn't burn TTS quota or render minutes on something they'd reject.

# Working directory

Slug the description for the directory name (lowercase, hyphens, alphanumeric). Working directory is `<cwd>/.video-gen/<slug>/`. Create it if missing.

# Stage 1 — Brief

Invoke the `video-director` subagent. It will:
- Read Claude memory (`using-claude-memory` skill).
- Detect sibling context plugins if present.
- Gather source material (read a codebase, fetch a product page) when relevant.
- Ask the user 1–2 questions covering audience/purpose and visual style.
- Write `audience-brief.md` in the working dir (records video type + visual style).

# Stage 2 — Storyboard

Continue with `video-director`. It picks a narrative structure (explainer = 5-beat, launch = 4-beat, etc.) and a visual style (vox-style or clean/default), then writes:
- `storyboard.md` — human-readable plan with video type, visual style, and per-scene engine choices.
- `narration.txt` — clean TTS input with `[SCENE:]` markers named per the chosen structure.

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

If the user re-runs `/generate` on the same description, detect existing artifacts in the workdir and resume from the earliest stale stage (use `scripts/lib/staleness.mjs` logic). Print which stage is being resumed.

# Failures

If any stage fails, surface the error verbatim. Do not auto-retry. Suggest the appropriate per-stage command (`/narrate`, `/animate`, `/render`) for the user to re-run after fixing.
