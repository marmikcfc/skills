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
