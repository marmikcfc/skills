---
name: hyperframes-essentials
description: Use when writing HyperFrames HTML compositions for an explainer video scene. Covers HyperFrames' HTML conventions, adapter choices (GSAP, Tailwind, Lottie, CSS), and when to delegate to HyperFrames' own /hyperframes skill.
---

# HyperFrames essentials

HyperFrames turns HTML compositions into MP4 files. Animations come from declarative timeline attributes plus a chosen adapter runtime (GSAP, CSS animations, Lottie, Anime.js, Three.js, Web Animations API).

## When to use which adapter

| Adapter | Use for | Skip when |
|---|---|---|
| **GSAP** | Most explainer animations — timeline-based, complex sequencing, easing | Simple fades (CSS is enough) |
| **CSS animations** | Simple property tweens, fades, slides | Anything timeline-coordinated across elements |
| **Tailwind v4 browser-runtime** | Typography, color, spacing — the "look" | The motion itself |
| **Lottie** | Pre-made vector animations from After Effects | Anything you'd code by hand in <50 lines |
| **Anime.js** | Lightweight alternative to GSAP | If you already need GSAP elsewhere |
| **Three.js** | 3D rendering | 2D scenes (overkill) |

For Vox-style explainers, **GSAP + Tailwind** covers ~90% of needs.

## Composition file shape (per HyperFrames conventions)

HyperFrames compositions are HTML files with data attributes. Exact schema depends on the version — when in doubt:

1. Run `npx hyperframes init test-project` once and inspect the scaffold.
2. Invoke HyperFrames' own `/hyperframes` slash command in Claude Code for canonical examples.

The general shape:

```html
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="...tailwind...">
    <script src="...gsap..."></script>
  </head>
  <body>
    <div data-hf-scene data-hf-duration="8s">
      <h1 data-hf-animate="fade-in" data-hf-at="0s">Title</h1>
      <!-- ... -->
    </div>
  </body>
</html>
```

## Delegating to HyperFrames' own skill

HyperFrames ships its own Claude Code skills via `npx skills add heygen-com/hyperframes`. If you need:
- Exact attribute syntax → invoke `/hyperframes`
- CLI commands (init, preview, render) → invoke `/hyperframes-cli`
- TTS/transcription/asset prep → invoke `/hyperframes-media`
- Tailwind setup specific to HyperFrames → invoke `/tailwind`
- GSAP timeline help → invoke `/gsap`

**Our `hyperframes-engineer` agent should always invoke `/hyperframes` for the actual composition writing.** This skill (`hyperframes-essentials`) is for *deciding when and what* — it's not a replacement for HyperFrames' own knowledge.

## What to avoid

- Hardcoding pixel sizes (`width: 1920px`) — use composition variables and responsive units instead.
- Inline `<script>` for animations — declarative `data-hf-*` attributes are the idiomatic HyperFrames pattern.
- Heavy JS frameworks (React, Vue) inside a composition — HyperFrames is HTML-first by design.

## Quality bar

- The scene renders cleanly when previewed via `npx hyperframes preview`.
- Animation timing matches the scene's target duration from `scenes.json`.
- Typography is legible at 1080p (hero text 80–120px, body 40–56px).
- 2–3 colors per video, Vox-style restraint.
