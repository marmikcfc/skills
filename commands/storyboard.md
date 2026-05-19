---
description: Storyboard a Vox-style explainer video without generating code yet
argument-hint: <topic>
---

Produce a Vox-style storyboard for: **$ARGUMENTS**

Invoke the `explainer-director` subagent. Do not generate any Manim or Remotion code in this command — just return the storyboard. The user will iterate on the storyboard before any code is written.

Output format:
```
# Storyboard: <title>
Runtime estimate: <e.g. 2:15>
Recommended tool: <manim | remotion> — <one-sentence why>

## Scene 1 — Hook (0:00–0:08)
Visual: ...
Narration: "..."

## Scene 2 — Tension (0:08–0:25)
...

[continue through all 5 Vox beats]

## Open questions
- ...
```
