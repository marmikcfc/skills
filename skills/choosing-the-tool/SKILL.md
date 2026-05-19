---
name: choosing-the-tool
description: Use when deciding between Manim and Remotion for an explainer video. Maps topic characteristics to the right tool and explains the trade-offs.
---

# Manim vs Remotion: when to use which

Both can make a good explainer video. They optimize for different content shapes. Pick wrong and you'll fight the tool the whole way.

## Manim (Python)

**Strengths**
- Math typesetting via LaTeX is unbeatable
- Geometric construction, transforms, parametric curves
- Coordinate systems, graphs, axes — built in
- Smooth interpolation between mathematical objects (e.g. morphing one equation into another)

**Weaknesses**
- Anything text-heavy or UI-flavored fights you
- No native HTML/image composition workflow
- Iteration loop is slower (re-render to see changes)
- Layout is positional/imperative — no flexbox equivalent

**Use Manim when the video is about:**
- Equations, proofs, derivations
- Geometry, topology, linear algebra
- Functions, graphs, calculus
- Algorithms expressed mathematically (Fourier, gradient descent)
- Anything where the core object IS a mathematical structure

## Remotion (React + TypeScript)

**Strengths**
- Anything you can render in a browser, you can put in a video
- Real-time preview (Remotion Studio) — iterate in seconds
- Flexbox / CSS / web fonts / SVG just work
- Easy to integrate real imagery, video clips, audio
- TypeScript catches errors before render

**Weaknesses**
- LaTeX-quality math requires extra effort (KaTeX or images)
- Imperative timing via frame numbers can get fiddly
- Render is slower than Manim's low-quality preview

**Use Remotion when the video is about:**
- History, current events, social/policy topics (Vox's bread and butter)
- Software, APIs, UI walkthroughs
- Data viz mixed with imagery, charts, maps
- Anything text-driven or comparison-heavy
- Topics where photos, logos, or real screenshots matter

## The deciding question

> "Is the core thing I'm animating a *mathematical object* or a *narrative composition*?"

- Mathematical object → Manim
- Narrative composition → Remotion

If you're explaining the Mandelbrot set, that's a mathematical object — Manim. If you're explaining why housing in San Francisco is expensive, that's a narrative composition with charts and maps — Remotion.

## Edge cases

- **Code walkthroughs:** Remotion (easier to render code with syntax highlighting).
- **Statistics / probability with formulas:** Manim if formulas dominate; Remotion if it's mostly charts and intuition.
- **ML/AI concepts:** Depends on the angle. Gradient descent visualized as a ball on a surface → Manim. "How ChatGPT works" with UI mockups → Remotion.
- **Physics:** Manim is the safer bet; Remotion can work for non-quantitative physics history/concept videos.

## What if I want both?

You can render Manim clips and import them as `<Video>` assets into a Remotion composition. This is overkill for most short explainers but works for hybrid documentaries (e.g. a Vox-style narrative with a 30-second Manim insert for the math beat).
