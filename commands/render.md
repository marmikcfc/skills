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
