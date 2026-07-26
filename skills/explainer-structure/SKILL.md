---
name: explainer-structure
description: Plan the narrative structure of a short explainer video — the 5-beat hook/tension/metaphor/reveal/recap shape, the role of the central metaphor, and what makes an explainer land instead of meander. Use for any explainer regardless of visual style or engine. This is STRUCTURE only; visual aesthetic is a separate decision.
---

# Explainer structure

A short explainer is not a lecture compressed in time. It's a *narrative* that
smuggles understanding past the viewer's defenses. Five beats. Skip one and it
falls apart.

> **This skill is structure, not style.** The 5-beat shape works rendered as
> kinetic motion graphics, sparse constructed diagrams, illustrated systems, or
> plain clean typography. For the punchy editorial look specifically, apply
> `vox-style` *on top of* this — it is an independent decision, and most
> explainers should not use it. For how the narration reads, that's a third
> independent axis: `voice-3b1b`, `voice-gaurav-sen`, or
> `explaining-technical-concepts`.

## The 5 beats

### 1. Hook (5–10s)
A question, a paradox, or a surprising claim. Never open with "Today we'll talk
about X" — the viewer needs a reason to keep watching before you've earned trust.

Works:
- "Why does ice float when literally everything else gets denser when it cools?"
- "You can fit a million Earths inside the sun. But that's not the weird part."
- "There's a number bigger than infinity. And another one bigger than *that*."

Kills hooks: announcing the topic, defining the term, "let's explore", "have you
ever wondered".

### 2. Tension (10–20s)
Why the obvious answer is wrong or incomplete. The pivot from curiosity to
*investment* — the viewer now has a stake, because they've been shown a gap in
their own understanding.

Shape: "You'd think X. But actually Y. And that doesn't even explain Z."

### 3. Central metaphor (30–60s)
The single biggest difference between explainers that work and ones that don't.
Externalize the abstract idea into something spatial, comparative, or animated.
**The metaphor IS the explanation** — narration just labels what's already visible.

Good: compound interest as a snowball; recursion as Russian dolls; a neural net as
voting committees; entropy as a shuffled deck.

Bad metaphors are decorative — the visual sits *next to* the explanation instead of
being it. Test: **mute the narration. Does the visual still teach?**

### 4. Reveal (20–40s)
The "ohhh". The metaphor pays off, the tension resolves. This is where learning
actually happens. Pace it slowly — give the insight room to land.

### 5. Recap (5–10s)
One sentence the viewer leaves with. If they remember only this, did you do your
job? Cut everything that doesn't support it.

## The ONE thing rule

Before drafting any storyboard, write the single sentence the viewer should leave
with. Every beat must serve it. A beat that's interesting but doesn't serve the ONE
thing is a different video — save it.

## Pacing

- **90 seconds to 3 minutes** for a single concept. Longer usually means multiple
  concepts; split it.
- **Hook + tension under 30 seconds.** Retention curves drop steeply in the first 30s.
- **The metaphor is the longest beat.** The reveal only lands if the setup earned it.
- **End on a beat, not a fade.** The last word should land on a frame the viewer can
  sit with for a second or two.

## Failure modes

| Failure | Looks like | Fix |
|---|---|---|
| Wikipedia voice | Opens with definitions; reads like an article | Open with a question or paradox |
| Metaphor as garnish | Visual is pretty but carries no meaning | Make the visual the explanation; cut the verbal one |
| Too many ideas | Three concepts in two minutes | Pick one; the rest are sequels |
| No tension | "Here's how X works" → list of facts | Find the misconception and dismantle it |
| Fade-out ending | "…and that's how X works" | End on the ONE sentence; let it sit |

## Adapting the shape

The 5 beats are a default, not a law:

- **Long-form (8–20 min, YouTube):** the shape nests. Each chapter gets its own
  hook→tension→reveal; the recap of one becomes the hook of the next.
- **Short-form (under 60s, TikTok/Reels):** compress to hook → metaphor → reveal.
  Tension folds into the hook and the recap is often just the last frame.
- **Codebase / architecture explainers:** the "metaphor" beat is frequently a real
  traced request rather than an analogy. Concrete beats clever.

## When this applies

- Planning any short explainer, regardless of engine (Manim, HyperFrames, slides)
- Reviewing a draft storyboard for whether it will land
- Deciding whether a topic is one video or several
