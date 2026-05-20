# video-gen

A Claude Code plugin for generating short animated videos — explainers, product launches, demos, codebase walkthroughs. Description in, MP4 out — via a 5-stage pipeline you can checkpoint, edit, and resume.

## What it does

```
/generate "why does ice float"                       # an explainer
/generate "launch video for my CLI tool, Acme"       # a product launch
/generate "how auth works in this codebase"          # a codebase walkthrough
```

The director picks the right **narrative structure** (explainer = 5-beat pedagogy, launch = 4-beat problem→reveal→CTA, etc.) and **visual style** (punchy Vox-style motion graphics, or a clean on-brand look) for what you asked for. These are independent choices — not every video is a Vox-style explainer.

Runs five stages:
1. **Brief** — director reads your Claude memory, gathers source material (a codebase, a product page), asks 1–2 questions, picks structure + style.
2. **Storyboard** — beat-by-beat plan with per-scene engine (Manim vs HyperFrames).
3. **Narrate** — Cartesia or ElevenLabs TTS with word-level timestamps. Scenes' timing is derived from those timestamps.
4. **Animate** — engineer subagents generate Manim Python or HyperFrames HTML, parallelized per scene.
5. **Render** — HyperFrames composes audio + visuals into a single MP4.

You approve cheap artifacts (storyboard, voice) before expensive ones (animation, render). You can edit any artifact and re-run from that stage.

## Install

```bash
# In Claude Code
/plugin marketplace add marmikcfc/video-gen
/plugin install video-gen@video-gen
```

Then one-time setup:
```
/video-gen-setup
```

## Requirements

- **Node.js ≥22** + **FFmpeg** (HyperFrames requirements)
- **[HyperFrames](https://github.com/heygen-com/hyperframes)** — `npm i -g hyperframes` (or via its skills package)
- **Manim Community Edition + LaTeX** — only when a video uses math scenes
- **TTS API key** — Cartesia or ElevenLabs

## Surface

| Surface | What it is |
|---|---|
| `/generate <description>` | Full 5-stage pipeline |
| `/storyboard <description>` | Stages 1+2 only |
| `/narrate` | Re-run Stage 3 |
| `/animate` | Re-run Stage 4 |
| `/render` | Re-run Stage 5 |
| `/video-gen-setup` | One-time setup |
| `video-director` agent | Memory-aware storyboarding; picks structure + style |
| `manim-engineer` agent | Math scene → Manim Python |
| `hyperframes-engineer` agent | Narrative scene → HyperFrames HTML |
| Structure skills | `vox-explainer-structure` (5-beat explainer), `launch-video-structure` (4-beat launch) |
| Style skills | `vox-style` (kinetic motion graphics) — optional, default is clean/on-brand |
| Craft skills | `choosing-the-tool`, `manim-essentials`, `hyperframes-essentials`, `narration-writing`, `voice-driven-timing`, `using-claude-memory` |

## Working directory

Each video gets its own directory under cwd: `.video-gen/<topic-slug>/`. State on disk — no hidden state, no in-memory persistence. You can inspect, edit, archive, or commit anything in there.

## Privacy

The plugin reads your Claude memory (`~/.claude/projects/.../memory/`) to personalize narration tone and framing. **It never embeds raw memory content in the storyboard, narration, or final video.** Memory references are listed by filename in `audience-brief.md` for traceability.

## Testing

```bash
npm test               # Layer 1 unit tests (fast, CI)
npm run test:fixtures  # Layers 1 + 2 (still fast, no network)
```

Layers 3 (smoke) and 4 (agent evals) are manual checklists in `tests/SMOKE.md` and `tests/agent-evals/`.

## License

MIT
