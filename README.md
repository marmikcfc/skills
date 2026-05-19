# video-gen

A Claude Code plugin for generating Vox-style animated explainer videos. Topic in, MP4 out — via a 5-stage pipeline you can checkpoint, edit, and resume.

## What it does

```
/explain "why does ice float"
```

Runs five stages:
1. **Context** — director reads your Claude memory, asks 1–2 audience questions.
2. **Storyboard** — Vox-style 5-beat plan with per-scene engine (Manim vs HyperFrames).
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
| `/explain <topic>` | Full 5-stage pipeline |
| `/storyboard <topic>` | Stages 1+2 only |
| `/narrate` | Re-run Stage 3 |
| `/animate` | Re-run Stage 4 |
| `/render` | Re-run Stage 5 |
| `/video-gen-setup` | One-time setup |
| `explainer-director` agent | Memory-aware Vox storyboarding |
| `manim-engineer` agent | Math scene → Manim Python |
| `hyperframes-engineer` agent | Narrative scene → HyperFrames HTML |
| Skills | `vox-explainer-structure`, `choosing-the-tool`, `manim-essentials`, `hyperframes-essentials`, `narration-writing`, `voice-driven-timing`, `using-claude-memory` |

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
