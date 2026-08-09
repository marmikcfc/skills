# Agent evaluation topics

Run `/storyboard <topic>` for each (no TTS, no render). Reviewer scores 1–5 on:
- 5-beat structure present
- Engine choices defensible
- Narration sounds Vox-like
- ONE-thing sentence is clear

Diagnostic only; not pass/fail. Run after any director-agent prompt change.

## Canonical topics

1. **"Why does ice float?"** — Expected: hyperframes-heavy, soft science.
2. **"How does gradient descent work?"** — Expected: manim-heavy on metaphor and reveal scenes.
3. **"What is a hash table?"** — Expected: hyperframes with one manim scene for collision math.
4. **"Bayes' theorem"** — Expected: manim-dominant.
5. **"Why is San Francisco expensive?"** — Expected: hyperframes only, no manim.

## Scoring template

```
Topic: <topic>
Date: <YYYY-MM-DD>
Reviewer: <name>

| Criterion | Score (1-5) | Notes |
|---|---|---|
| 5-beat structure present | | |
| Engine choices defensible | | |
| Narration sounds Vox-like | | |
| ONE-thing sentence is clear | | |
```
