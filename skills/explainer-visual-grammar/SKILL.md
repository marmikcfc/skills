---
name: explainer-visual-grammar
description: Build an explainer video in the production style of a known creator by mixing screen modes in measured proportions. Covers what material each mode requires (constructed animation, hand annotation, screen capture, cited document, stock footage, talking head), measured mode mixes for 3Blue1Brown / Caleb Writes Code / Economics Explained, and the rules for assembling a shot list in each style. Use when deciding what actually goes on screen shot by shot, or when asked to make something "in the style of" one of these creators.
---

# Explainer visual grammar

Measured from **504 classified frames across 18 videos** (3Blue1Brown 6, Caleb
Writes Code 7, Economics Explained 5). Frames were sampled at scene-change
boundaries and classified into production modes by a fixed taxonomy.

**No creator has one style.** That is the central finding. Each works a
*repertoire* of modes and varies the mix per video. Style is the **proportion and
sequencing**, not a single look.

## The mode vocabulary

A mode is defined by *what you must make or source* to fill the screen:

| Mode | What it costs you |
|---|---|
| `CONSTRUCT` | Purpose-built animation — Manim, motion graphics, a diagram authored for this video |
| `ANNOTATE` | Hand-drawn marks layered on a canvas that already had content |
| `CAPTURE` | Screenshot or screen recording of real software, a site, a repo |
| `DOCUMENT` | A paper/article/report shown as *evidence for a claim* |
| `FOOTAGE` | Borrowed real-world video or stills — stock, archival, news |
| `TALKING_HEAD` | A person on camera |
| `TITLE` | Text-dominant card |
| `BRAND` | Sponsor or channel promotion |

`CAPTURE` vs `DOCUMENT` is the distinction people collapse and shouldn't: is the
software **the subject**, or is the page **proof of an assertion**?

## Measured mode mixes

Share of non-blank frames:

| Mode | 3Blue1Brown | Caleb Writes Code | Economics Explained |
|---|---|---|---|
| CONSTRUCT | **50%** | 28% | 11% |
| CAPTURE | — | **35%** | 5% |
| FOOTAGE | 9% | 5% | **65%** |
| ANNOTATE | 11% | 14% | 1% |
| DOCUMENT | 3% | 12% | 11% |
| TALKING_HEAD | 15% | 1% | 7% |
| BRAND | 8% | 4% | 1% |
| **Anchor carry-over** | **39%** | **42%** | **9%** |

**Anchor carry-over is the most useful single number** — the share of frames where
something from the previous frame is still on screen in the same place. It is a
proxy for whether the video *builds* or *cuts*. 3b1b and Caleb build; Economics
Explained replaces the screen almost every time.

Two things worth noting that contradict the obvious reading:

- **Caleb is primarily a screen-capture creator, not a whiteboard one.** Hand
  annotation is 14% across seven videos. It reaches 56% in exactly one of them.
- **A quarter of 3b1b's frames are talking-head plus sponsor**, not mathematics.

## Per-video spread — the range is the point

| Creator | Range across videos |
|---|---|
| 3Blue1Brown | CONSTRUCT 7%→75%; one video is 69% FOOTAGE; another 41% TALKING_HEAD |
| Caleb | CAPTURE 0%→51%; ANNOTATE 0%→56% |
| Economics Explained | FOOTAGE 47%→84% — **much tighter** |

So: **Economics Explained runs one recipe consistently. The other two switch recipe
by video type.** If you are imitating a creator, pick which of their recipes you're
imitating; the channel average is not a style anyone actually executes.

## The recipes

### 3Blue1Brown

- **Deep explainer** (the flagship): CONSTRUCT ~55–65%, BRAND/TALKING_HEAD ~20–25%
  concentrated at the end, ANNOTATE for asides. Long — cut rate is low.
- **Puzzle / short**: CONSTRUCT 75%+, almost nothing else, high cut rate.
- **Art or history piece**: mostly FOOTAGE and DOCUMENT — photographs of the
  artefact, scanned articles. Very little constructed animation.

Anchoring device: a recurring character/glyph pair holds screen position while the
content above it swaps. Colour carries persistent meaning across scenes.

### Caleb Writes Code

- **Product/news breakdown** (most common): CAPTURE ~40–50%, CONSTRUCT ~20–30%,
  DOCUMENT for the source paper.
- **Paper deep-dive**: ANNOTATE up to 56% — a single anchor diagram held in place
  for ~20 consecutive frames while colour-coded annotation accretes around it.
  Content accumulates *within a section*, then resets between topics.
- **Ranking/benchmark piece**: CONSTRUCT-led charts, DOCUMENT ~30%.

Emphasis: magenta handwritten overlay on top of machine-rendered diagrams; colour
per model/tier held consistently.

### Economics Explained

One recipe: FOOTAGE 47–84%, with CONSTRUCT and DOCUMENT punctuating. Anchor
carry-over 9% — nothing persists, the video is a cut sequence.

The load-bearing device is the **cited document with a yellow highlight** on the
specific sentence being claimed. Across the sample, document frames are rarely bare;
they carry a yellow (occasionally green or cyan) emphasis bar.

## Generation rules

**1. Pick the recipe, not the creator.** Decide which of their video types you're
making, then take that recipe's mix.

**2. Set the anchor rate first — it dictates engine.**
- High (≈40%): one element holds position across many shots, content accretes
  around it. HyperFrames sub-composition persisting across scene slots.
- Low (≈10%): every shot replaces the last. A cut list of clips.

**3. Budget modes as a shot count.** For an N-shot video, multiply N by the mix.
A 30-shot Caleb-style breakdown ≈ 12 CAPTURE, 8 CONSTRUCT, 4 DOCUMENT, 4 ANNOTATE,
2 TITLE. Fill that budget rather than improvising per scene.

**4. Never leave a DOCUMENT bare.** If a document is on screen it is evidence, so
emphasise the exact span that supports the claim. Yellow is the observed default.

**5. Assign colour meaning once, then hold it.** All three attach fixed meaning to
specific hues and keep it for the whole video.

**6. Quarantine BRAND.** Where sponsor material exists it sits in a contiguous block
at the end, never interleaved with explanation.

**7. Match mode to engine:**

| Mode | Engine |
|---|---|
| CONSTRUCT (math, coordinates, continuous transform) | **Manim** |
| CONSTRUCT (charts, kinetic type, layout) | **HyperFrames** |
| ANNOTATE | **HyperFrames** — SVG stroke reveal over a persistent sub-composition |
| CAPTURE | Real screen recording. Do not synthesise a fake UI |
| DOCUMENT | Real source + highlight overlay. **Never generate this** |
| FOOTAGE | Licensed stock, or **fal** `video` for ambient shots only |
| TALKING_HEAD | Recorded presenter — see `talking-head-composite` |

**8. Two hard limits on generation.** A `DOCUMENT` must be a real source; a
generated one fabricates evidence. A `CAPTURE` must be a real interface; a
generated one misrepresents a product. Use `fal` for ambient b-roll, texture, and
establishing shots — not for anything that reads as a record.

## Method and its limits

Frames were sampled at scene-change boundaries — not uniformly — on the reasoning
that an explainer's teaching moves happen at cuts. Classification was done by
subagents against a fixed taxonomy, then aggregated.

Known limits, so the numbers aren't over-trusted:
- Frames per video were **capped at 48**, so cut-rate figures are a floor, not a
  true rate, for longer videos.
- Short videos fell back to uniform sampling; consecutive frames there may be
  mid-animation rather than distinct shots.
- Two 3b1b videos may have swapped labels in one classifier's output; creator-level
  totals are unaffected, per-video rows for those two are lower confidence.
- **Everything here is visual.** No audio was analysed — nothing in this skill
  describes music, pacing, pauses, or how visuals time against narration.

## Related

- `voice-3b1b`, `voice-caleb-writes-code`, `voice-economics-explained` — narration
- `explainer-structure` — beat structure · `choosing-the-tool` · `provider-config`
