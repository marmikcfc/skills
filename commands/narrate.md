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
