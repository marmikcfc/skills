---
name: talking-head-composite
description: Build a video that mixes presenter footage with generated visuals — Manim scenes, HyperFrames animation, or AI-generated clips — using cut, stack, PiP, or split layouts, targeted at YouTube long-form and TikTok/Reels. Use when someone has (or will record) talking-head footage and wants animated explanation cut with it, a "face + b-roll" explainer, a split-screen or picture-in-picture explainer, or one recording repurposed for both 16:9 and 9:16.
---

# Talking-head composite

A presenter on camera **plus** generated visuals, in one timeline. The face carries
trust and pacing; the animation carries the thing the face can't show.

## What this is not

| If you want | Use |
|---|---|
| Plain subtitles burned onto existing footage | HyperFrames `/embedded-captions` |
| Designed **graphic cards** over footage that plays untouched | HyperFrames `/talking-head-recut` |
| Music-driven cutting | HyperFrames `/music-to-video` |
| No presenter at all | `explainer-structure` + `/animate` |

The distinction from `/talking-head-recut` is real and worth getting right: that
skill overlays *designed cards* while **the clip plays untouched**. This skill
**cuts the footage** and composites *generated motion* — Manim, HyperFrames scenes,
or AI-generated video — as a co-equal visual track.

## The four modes

### Mode 1 — `cut` (sequential)
Full-frame presenter, then full-frame animation, alternating.

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│  ○ face  │──▶│ ANIMATION│──▶│  ○ face  │
└──────────┘   └──────────┘   └──────────┘
```
**Best for:** YouTube long-form. Highest production ceiling — each medium gets the
whole frame. **Cost:** every cut is a re-engagement risk; the animation must earn
the face's absence.
**Rule:** cut *on* a sentence boundary, never mid-clause. You have word timings —
use them.

### Mode 2 — `stack` (head top, visual below)
Presenter occupies the top band, generated visual the bottom.

```
┌──────────┐  9:16          ┌──────────────┐  16:9
│  ○ face  │  ~35% height   │  ○ face │ viz│  (becomes side-by-side;
├──────────┤                └──────────────┘   stacking wastes a
│  ANIM    │  ~65%                             landscape frame)
└──────────┘
```
**Best for:** TikTok/Reels/Shorts. The face keeps the retention hook alive while
the visual does the work, with no cut to lose people at.
**Rule:** the presenter band is a *fixed* crop for the whole video. A band that
resizes per scene reads as broken.

### Mode 3 — `pip` (picture-in-picture)
Animation full-frame, presenter in a corner inset.

**Best for:** long stretches where the visual is the content and the face is
continuity — code walkthroughs, dense diagrams.
**Rule:** pick one corner and keep it. Inset ~18–22% of frame width; below ~15%
the face stops reading as a person.

### Mode 4 — `split` (equal halves)
Both get half the canvas at equal weight. Best for direct comparison — presenter
reacting to a chart in real time. Weakest default; prefer `stack` unless the
symmetry is meaningful.

## Choosing

```
Is the visual the content, and the face continuity? ───────▶ pip
Is this vertical short-form? ──────────────────────────────▶ stack
Is this long-form where the animation deserves the frame? ─▶ cut
Genuinely comparing two things side by side? ──────────────▶ split
```

Modes may be **mixed within one video** — `cut` for the body with a `pip` cold open
is a strong long-form pattern. Declare the mode per scene in the storyboard, the
same way `engine` is declared.

## Aspect strategy: shoot once, publish twice

The single highest-leverage decision, and it happens at record time:

- **Frame the presenter for a 9:16 safe area even when shooting 16:9.** Keep the
  head and shoulders inside the centre ~56% of a landscape frame; then a vertical
  crop needs no reframing and no head-chopping.
- **Never put essential information in the outer 22% of a 16:9 frame** if a
  vertical cut is planned.
- **Author two compositions, not one auto-crop.** Same scenes, same audio, two
  `data-width`/`data-height` roots and two layout modes (`cut` → `stack` is the
  usual mapping). Auto-cropping a landscape composite to vertical produces the
  classic half-a-face-and-a-cropped-diagram result.

| Target | Canvas | Default mode | Runtime |
|---|---|---|---|
| YouTube long-form | 1920×1080 | `cut`, occasional `pip` | 6–20 min, chapters |
| YouTube Shorts / TikTok / Reels | 1080×1920 | `stack` | 20–60s |
| Instagram feed | 1080×1350 | `stack` (shallower band) | 30–90s |

## Pipeline integration

Footage is another engine at the scene level, alongside `manim` and `hyperframes`:

1. **Storyboard** — each scene declares `engine` *and* `layout` (`cut`/`stack`/`pip`/`split`)
   and `presenter: true|false`.
2. **Narration** — if the presenter is reading the script, their recorded audio
   *is* the narration track; run alignment (the `align` capability) over the
   recording rather than TTS. If narration is TTS and the presenter is silent
   b-roll, the normal `/narrate` path applies.
3. **Animate** — generated scenes build as usual. Footage enters the composition as
   a `<video>` under the same rules as a Manim clip: namespaced id, `muted`
   `playsinline`, and audio on a separate `<audio>` element.
4. **Verify** — `npx hyperframes check`, plus snapshot one frame per layout mode.

Presenter audio is the one case where a `<video>`'s own audio matters. Extract it
to a separate `<audio>` element rather than unmuting the video — HyperFrames
requires audio on its own element, and it also lets you duck music against it.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Cuts feel jarring | Cutting mid-clause | Cut on sentence boundaries from word timings |
| Vertical crop chops the head | Auto-cropped from landscape | Author a second composition |
| Presenter band jitters | Layout re-derived per scene | Fix the crop once for the whole video |
| Face feels bolted on | `pip` used for the whole runtime | Use `cut`; let the face own the frame sometimes |
| Audio doubles/echoes | Video unmuted *and* an `<audio>` present | Video always muted; audio on its own element |
| Talking head with nothing to show | Animation added because it "should have visuals" | If the visual doesn't carry meaning, stay on the face |
