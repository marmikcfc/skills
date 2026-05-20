---
name: vox-style
description: Use when a video should have the Vox-style motion-graphics aesthetic — kinetic typography, bold restrained palette, flat animated illustration. This is a VISUAL STYLE, independent of narrative structure. Apply on top of any structure (explainer, launch, demo). Do NOT apply by default; many videos want a cleaner or on-brand look instead.
---

# Vox-style visual aesthetic

This skill defines a **look**, not a structure. It is orthogonal to the narrative skills (`vox-explainer-structure`, `launch-video-structure`). Any structure can be rendered in Vox-style — or not. Most product launches should NOT be; they want their own brand. Reach for this style when you want the punchy, editorial, social-media-explainer feel.

## What "Vox-style" actually means visually

The recognizable aesthetic from Vox, Kurzgesagt-adjacent editorial explainers, and polished YouTube essays:

1. **Kinetic typography.** Words appear, emphasize, and exit *in sync with the narration*. Key terms scale up, change color, or get underlined exactly as they're spoken. Text is a first-class animated element, not a static caption.
2. **Bold, restrained palette.** 2–3 strong colors plus near-black and off-white. High contrast. One accent color carries emphasis throughout. Never more than 3 hues competing.
3. **Flat motion graphics.** Simple geometric shapes, flat illustration, no skeuomorphism, no gradients-for-realism. Shapes slide, scale, and morph with snappy easing.
4. **Generous negative space.** One idea on screen at a time. Lots of breathing room. The eye is never confused about where to look.
5. **Snappy, eased motion.** Quick entrances (200–400ms) with ease-out, deliberate holds, quick exits. Nothing drifts slowly. Motion punctuates the narration.
6. **Heavy sans-serif type.** Bold weights for emphasis, a single clean typeface family. Think Inter, Helvetica Now, or similar.

## How to apply it per engine

### HyperFrames scenes (most Vox-style work)
- Use **GSAP timelines** to sync text animation to narration beats. Words emphasized in the narration get a scale/color pop at the corresponding timestamp.
- Tailwind for the palette: define 2–3 colors as CSS variables, reuse everywhere.
- Big type: hero words 100–160px, supporting text 48–64px.
- Animate one element at a time. Sequence with `<Series>`-style staggering.
- Flat colored shapes (`<div>` with border-radius, SVG) as visual anchors — bars, circles, arrows that grow/point.

### Manim scenes
- Manim has its own mathematical aesthetic that *already* resembles 3Blue1Brown (a cousin of the Vox look). Keep the same 2–3 color palette as the HyperFrames scenes for consistency.
- Use `Write`, `Transform`, `Indicate` to make math feel kinetic.
- Match the accent color used in HyperFrames scenes so the video feels unified across engines.

## When NOT to use Vox-style

- **Product launches with brand guidelines.** Use the company's colors, fonts, and logo treatment instead. Kinetic typography can feel gimmicky for a serious product reveal.
- **Cinematic / emotional pieces.** Vox-style is informational and punchy, not moody.
- **Minimalist demos.** Sometimes a clean screen recording with a calm voiceover beats motion graphics.

When Vox-style isn't applied, the default is **clean**: the product's own colors (or neutral grays), restrained type, simple fades, no kinetic emphasis. The director records `visual style: clean` in the brief and the engineers keep animations subtle.

## Consistency checklist

Whatever scenes use Vox-style:
- Same 2–3 colors across every scene and both engines.
- Same typeface family throughout.
- Same easing personality (snappy, ease-out).
- Same negative-space discipline (one idea per frame).

A video that's Vox-style in scene 1 and corporate in scene 3 reads as broken. Pick one style per video and hold it.
