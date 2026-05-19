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
