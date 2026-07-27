---
name: explainer-visual-grammar
description: Choose and execute a complete explainer video style — how narration, visuals, and chaptering work together to build an idea in the viewer's head. Covers three measured grammars (constructed-object / accumulating-whiteboard / evidence-collage) and maps each to concrete engines (Manim, HyperFrames, talking head, fal AI generation). Use when planning a video's look and structure together, deciding which engine renders which scene, or asking how a creator makes their explanations land.
---

# Explainer visual grammar

Derived from frame-level analysis of three creators plus stylometry over 30 videos,
367 min of runtime, 92k words (3Blue1Brown, Economics Explained, Caleb Writes Code).

## The core finding

**The pronoun profile predicts the visual grammar.** They are not independent
choices — measured across the three corpora, how the narrator addresses the viewer
determines what the screen has to do:

| | `I`/1k | `we`/1k | `you`/1k | Visual consequence |
|---|---|---|---|---|
| **3Blue1Brown** | 8.6 | 6.5 | **22.2** | "You and I build this" → an object is *constructed* on screen |
| **Caleb Writes Code** | 5.0 | **9.1** | 7.0 | "Look at what we have" → a board *accumulates* and is pointed at |
| **Economics Explained** | **0.96** | 3.5 | 4.8 | Narrator absent → *evidence* must speak; sourced footage and documents |

If narration says *you*, the screen owes the viewer something to do. If narration
says *we*, the screen owes a shared artifact to point at. If narration says neither,
the screen owes proof.

Picking a look without matching the pronoun profile is why videos feel "off" in a
way people can't name.

---

## Grammar 1 — Constructed object (3Blue1Brown)

**Thesis:** the viewer should feel they could have discovered it. So the screen
*builds* a mathematical object step by step; narration labels what is already visible.

**Measured:** 22.0 words/sentence · CV 0.61 · 32% conjunction openers ·
analogy 3.6/1k (3× the others) · **4.4 sections/video**

**Visual vocabulary** (from frames):
- Black canvas, LaTeX-typeset math, semantic colour that persists (a concept keeps
  its colour across scenes)
- **Side-by-side comparison circles** — two labelled discs contrasting a pair of
  ideas. Recurs constantly; it is the signature composition
- 3D bar landscapes for distributions; camera moves *through* them
- Embedded prose panels for asides — a paragraph typeset on canvas, not spoken
- **Character proxies** (the pi-creatures) standing in for the audience: they react,
  get confused, ask the question the viewer is forming
- Sponsor/interview footage strictly quarantined at the end, never mid-explanation

**Chaptering:** ~4 sections. Concrete instance → play → generalise → name it →
open question.

**Engines:** Manim for anything with a coordinate system, equation, or continuous
transform. HyperFrames for title cards, prose panels, and the outro. Talking head
only in the sponsor segment. **Do not** use AI video generation — invented imagery
contradicts the "this is exactly true" contract of a constructed object.

---

## Grammar 2 — Accumulating whiteboard (Caleb Writes Code)

**Thesis:** the diagram *is* the argument. Nothing is erased; by the end the whole
model is on one board and the viewer can see how the parts connect.

**Measured:** 23.4 words/sentence · CV 0.52 · **51.4% conjunction openers** (the
highest of any corpus measured) · `we` 9.1/1k · **5.0 sections/video** · 8–13 min

**The deictic signature:** `as you can see` at **62×** the comparison rate,
plus `look at the` and `you can see`. The narration *points*. This only works
because the referent is still on screen — which is exactly why nothing gets erased.

**Visual vocabulary** (from frames):
- Pure black canvas, handwritten-style vector strokes, hand-drawn arrows
- **Persistent spatial anchor:** one glyph (the model stack) holds its position for
  the whole video; everything else accretes around it
- Colour as semantics, applied consistently: green = new/benefit, magenta/pink =
  cost/problem, yellow = label, blue = named concept
- Hand-drawn country outlines, stick figures, small icon glyphs for actors
- **Cuts to the real artifact** — the actual paper figure or screenshot — when a
  claim needs external authority, then straight back to the board
- Bracket-and-label annotation: `[` grouping several items, labelled to one side

**Chaptering:** 5 sections, each adding a region to the board rather than replacing it.

**Engines:** HyperFrames for the whole board — SVG stroke-reveal is exactly this.
Manim only where a real algorithm needs animating. Talking head is absent (voice
only). **fal image generation** is a poor fit; the hand-drawn consistency is the
brand, and generated art breaks it.

---

## Grammar 3 — Evidence collage (Economics Explained)

**Thesis:** the narrator is a documentarian, not a teacher. Claims are carried by
*sourced material*, and the viewer is persuaded by accumulating proof.

**Measured:** 19.6 words/sentence · CV 0.55 · **MATTR 0.75** (widest vocabulary
measured) · `I` **0.96**/1k — effectively absent · 21 min avg · **5.0 sections**

**Visual vocabulary** (from frames):
- Sourced footage: news, archival, street scenes — slow Ken Burns push, never static
- **Browser windows floating on dark background** showing the actual article, with
  the key sentence **highlighted in yellow**. This is the single most repeated
  device and the load-bearing one: the claim is *shown*, not asserted
- Source attribution in the corner of every borrowed clip
- Black-and-white archival for historical context; colour for present day
- Animated maps with routes/flows for trade and supply
- Occasional data chart, but far less than the genre suggests

**Chaptering:** 5 sections. Situation → mechanism → complication → consequence →
outlook. Long-form (15–30 min) with chapter markers.

**Engines:** **fal video generation is the natural fit here** — b-roll that would
otherwise need licensing. HyperFrames for the document-highlight device, maps, and
charts. Manim is wrong for this register. Talking head optional.

> **Sourcing caution.** This grammar depends on real documents and real footage.
> Generating synthetic "news article" imagery would fabricate evidence — don't.
> Use fal for *ambient* b-roll (city scenes, abstract texture), never for anything
> that reads as a document, a quote, or a record.

---

## Choosing

```
Is the subject exactly true and constructible (math, algorithm, proof)?
    → Constructed object.  Manim-led.
Is the subject a system whose parts must be seen together (architecture, model)?
    → Accumulating whiteboard.  HyperFrames-led.
Is the subject contested, real-world, and needs proof (economics, news, policy)?
    → Evidence collage.  Sourced footage + document highlight.
```

Then **match the narration pronoun profile to the grammar** — that is the step
people skip, and it is what makes a style read as coherent.

## Engine map

| Element | Engine | Notes |
|---|---|---|
| Equations, coordinate systems, continuous transforms | **Manim** | The only engine that does this well |
| Persistent board, stroke reveal, annotation, labels | **HyperFrames** | SVG + GSAP; the accumulating grammar is native here |
| Document highlight, maps, charts, lower-thirds | **HyperFrames** | |
| Ambient b-roll, texture, establishing shots | **fal** (`video`) | Never for documents or records |
| Reference stills, icons, illustration | **fal** (`image`) | Check it doesn't break a hand-drawn look |
| Presenter, credibility, sponsor read | **Talking head** | See `talking-head-composite` |
| Narration + word timings | **fal** / cartesia / elevenlabs | See `provider-config` |

## How the screen builds thought alongside narration

Common to all three, and the actual transferable craft:

1. **One idea per visual state.** A state changes only when the idea does.
2. **Show before naming.** All three put the object on screen before the term.
3. **Persistence is pedagogy.** What stays on screen is what the viewer is expected
   to hold in mind. Caleb never erases; 3b1b keeps colour identity; EE keeps the
   highlighted quote up while narrating past it.
4. **The screen carries the load the words can't.** If narration and visual say the
   same thing, one is redundant — usually the visual.
5. **Give the eye somewhere to go before the ear needs it.** The visual lands
   ~0.5–1s ahead of the sentence that explains it.
6. **Evidence needs a source; construction needs a derivation.** Both are the same
   move: showing your work.

## Related

- `voice-3b1b`, `voice-caleb-writes-code`, `voice-economics-explained` — narration
- `explainer-structure` — the beat structure underneath any grammar
- `choosing-the-tool`, `talking-head-composite`, `provider-config` — execution
