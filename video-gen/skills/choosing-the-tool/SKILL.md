---
name: choosing-the-tool
description: Use when deciding between Manim and HyperFrames for an explainer video scene. Maps content characteristics to the right tool and explains the trade-offs.
---

# Manim vs HyperFrames: when to use which

Each video can mix engines scene-by-scene. The director picks per scene; the user can override.

## Manim (Python + LaTeX)

**Strengths**
- Math typesetting via LaTeX is unbeatable
- Geometric construction, transforms, parametric curves
- Coordinate systems, graphs, axes — built in
- Smooth interpolation between mathematical objects (e.g. morphing one equation into another)

**Weaknesses**
- Anything text-heavy or UI-flavored fights you
- Iteration loop is slower (re-render to see changes)
- Layout is positional/imperative — no flexbox equivalent

**Pick Manim when the scene is about:**
- Equations, proofs, derivations
- Geometry, topology, linear algebra
- Functions, graphs, calculus
- Algorithms expressed mathematically (Fourier, gradient descent)
- Anything where the core object IS a mathematical structure

## HyperFrames (HTML + GSAP/Tailwind/Lottie)

**Strengths**
- Anything you can render in a browser, you can put in a video
- Real-time preview (`npx hyperframes preview`) — iterate in seconds
- Flexbox / CSS / web fonts / SVG just work
- Easy to integrate real imagery, video clips
- Built for AI agents: agents already speak HTML

**Weaknesses**
- LaTeX-quality math requires extra effort (KaTeX or images)
- Imperative timing via frame numbers can get fiddly

**Pick HyperFrames when the scene is about:**
- Hooks, tensions, recaps (narrative beats)
- History, current events, social/policy topics
- Software, APIs, UI walkthroughs
- Data viz mixed with imagery, charts, maps
- Anything text-driven or comparison-heavy

## The deciding question

> "Is the core thing in this scene a *mathematical object* or a *narrative composition*?"

Mathematical object → Manim. Narrative composition → HyperFrames.

## Typical 5-beat assignment

For a math-heavy explainer (e.g. "gradient descent"):
- Hook → HyperFrames (a question, an image)
- Tension → HyperFrames (the misconception)
- Metaphor → **Manim** (the math)
- Reveal → **Manim** (the math paying off)
- Recap → HyperFrames (one sentence)

For a narrative explainer (e.g. "why is housing expensive"):
- All 5 beats → HyperFrames

## Hybrid scenes

Manim outputs MP4 clips that HyperFrames embeds as video assets. So even a HyperFrames scene can include a Manim sub-clip if a specific visual is mathematical. Don't over-use this — single-tool per scene keeps the engineering simpler.
