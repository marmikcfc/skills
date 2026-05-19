---
description: Plan and generate a Vox-style explainer video about a topic
argument-hint: <topic to explain>
---

You are helping the user create a short Vox-style animated explainer video about: **$ARGUMENTS**

Follow this pipeline. Do NOT skip steps — the value of a Vox-style video comes from doing the pedagogy work *before* the code work.

## Step 1 — Choose the tool

Decide whether this topic is better served by **Manim** (math, equations, geometry, graphs, abstract proofs) or **Remotion** (text/UI, comparisons, timelines, data viz with imagery, anything narrative-heavy). If unsure, invoke the `choosing-the-tool` skill.

State your choice and one sentence on why before continuing.

## Step 2 — Storyboard (delegate to explainer-director)

Use the `explainer-director` subagent to produce a structured storyboard following the Vox pattern:
1. **Hook** (5–10s) — a question, paradox, or surprising claim
2. **Tension** (10–20s) — why the obvious answer is incomplete
3. **Visual metaphor** (30–60s) — the core idea made spatial / tangible
4. **Reveal** (20–40s) — the insight, with the metaphor paying off
5. **Recap** (5–10s) — one-sentence takeaway the viewer leaves with

Return the storyboard to the user and pause for approval before generating code.

## Step 3 — Generate code

Once the storyboard is approved:
- For Manim: delegate to the `manim-engineer` subagent
- For Remotion: delegate to the `remotion-engineer` subagent

The subagent should produce a runnable project (or a single scene file if a project already exists in the cwd).

## Step 4 — Render

Provide the exact command to render (e.g. `manim -pql scene.py Explainer` or `npx remotion render`). Do not auto-run rendering — it can take minutes and the user should kick it off when ready.

## Constraints

- Keep total runtime under 3 minutes unless the user asks for longer.
- Default aspect ratio 16:9 unless the user requests vertical/square.
- Prefer **one strong visual metaphor** over many weak ones. Vox-style restraint > maximalism.
