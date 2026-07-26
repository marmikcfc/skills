# video-gen

A Claude Code plugin for generating short animated videos for almost any communication use case: hard-concept explainers, deep-research videos, product launches, demos, codebase walkthroughs, and animated story/book-summary videos. Description in, MP4 out — via a 5-stage pipeline you can checkpoint, edit, and resume.

## What it does

```
/generate "why does ice float"                       # hard-concept explainer
/generate "deep research video on AI agents in 2026" # research synthesis
/generate "launch video for my CLI tool, Acme"       # product launch
/generate "what The Beginning of Infinity says"      # book/idea story
/generate "how auth works in this codebase"          # codebase walkthrough
```

The director picks the right **narrative structure** (explainer = 5-beat pedagogy, research = question→evidence→synthesis, launch = 4-beat problem→reveal→CTA, story = premise→conflict→takeaway, etc.) and **visual style** (MinutePhysics/3Blue1Brown clarity, Kurzgesagt-like illustrated systems, punchy Vox-style motion graphics, or a clean on-brand look) for what you asked for. These are independent choices — not every video is a Vox-style explainer.

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
/plugin marketplace add marmikcfc/skills
/plugin install video-gen@skills
```

Restart Claude Code so the plugin's commands, skills, and agents load, then run the one-time setup:
```
/video-gen-setup
```

`/video-gen-setup` verifies HyperFrames and stores your TTS key (Cartesia or ElevenLabs) in `~/.config/video-gen/keys.json` (chmod 600) — the key is never written into the repo or a video.

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
| `video-director` agent | Memory-aware storyboarding; picks structure + visual style + narration voice |
| `manim-engineer` agent | Math scene → Manim Python |
| `hyperframes-engineer` agent | Narrative scene → HyperFrames HTML |
| Structure skills | `explainer-structure` (5-beat explainer), `research-video-structure` (research synthesis), `animated-story-structure` (book/idea story), `launch-video-structure` (4-beat launch) |
| Style skills | `vox-style` (kinetic motion graphics) — optional, default is clean/on-brand |
| Composite / footage | `talking-head-composite` (presenter + generated visuals; cut/stack/pip/split, 16:9 + 9:16) |
| Audio | `soundtrack` (music bed, ducking against word timings, SFX) |
| Providers | `provider-config` (incl. **fal.ai gateway** — one key for tts/align/image/music/video/avatar/lipsync; browse with `scripts/fal-models.mjs`)
| Providers (detail) | `provider-config` (capability→provider config; swap or add any model vendor) |
| Voice skills | `voice-3b1b` (discovery-order narration), `voice-gaurav-sen` (contract-first), `explaining-technical-concepts` (neutral, L0→L3 depth tiers), `voice-extractor` (build a profile from samples) |
| Craft skills | `choosing-the-tool`, `manim-essentials`, `narration-writing`, `voice-driven-timing`, `soundtrack`, `using-claude-memory` |
| Composition contract | delegated to HyperFrames' own `hyperframes-core` / `hyperframes-animation` skills — we keep no local copy |

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
