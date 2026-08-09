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
