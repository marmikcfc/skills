# skills

A Claude Code marketplace hosting five independent plugins — **65 skills** for making videos, thinking clearly, generating ideas, pressure-testing product ideas, and growing on X.

Each plugin is self-contained and installs on its own. Install only what you want.

## Install

```bash
# In Claude Code — add the marketplace once
/plugin marketplace add marmikcfc/skills

# then install whichever plugins you want
/plugin install video-gen@skills
/plugin install thinking-models@skills
/plugin install creativity@skills
/plugin install x-growth@skills
/plugin install proven-better-new@skills
```

Restart Claude Code so commands, skills, and agents load.

| Plugin | Skills | What it is |
|---|---|---|
| **[video-gen](./video-gen)** | 20 | Description in, MP4 out. A 5-stage animated-video pipeline you can checkpoint, edit, and resume. |
| **[thinking-models](./thinking-models)** | 40 | Mental models as invokable skills — for deciding, debugging, estimating, and stress-testing beliefs. |
| **[creativity](./creativity)** | 3 | Divergent idea generation that fights mode-collapse and anchoring. |
| **[x-growth](./x-growth)** | 1 | X/Twitter growth through researched, gated replies. |
| **[proven-better-new](./proven-better-new)** | 1 | Pressure-test a product idea with Mark Pincus's Proven-Better-New framework. |

---

## video-gen — 20 skills

Generate short animated videos: explainers, research syntheses, product launches, demos, codebase walkthroughs, animated stories. Requires a one-time `/video-gen-setup`.

**Surface:** `/generate` (full pipeline) · `/storyboard` · `/narrate` · `/animate` · `/render` · `/video-gen-setup` · agents `video-director`, `manim-engineer`, `hyperframes-engineer`

The pipeline treats **narrative structure**, **visual style**, and **narration voice** as three independent choices — so a research video can borrow an explainer's visual grammar without inheriting its script shape.

| Group | Skills |
|---|---|
| **Structure** — how the script is shaped | `explainer-structure` (5-beat hook→tension→metaphor→reveal→recap), `research-video-structure` (thesis→evidence→implications), `launch-video-structure` (problem→why-now→reveal→CTA), `animated-story-structure` (book/idea/parable → narrative arc) |
| **Voice** — how the narration sounds | `voice-3b1b` (discovery-order, visual-first), `voice-gaurav-sen` (contract-first systems explainer), `voice-caleb-writes-code` (deictic, accumulating diagram), `voice-economics-explained` (documentary register, sourced claims), `voice-extractor` (derive a reusable voice profile from samples) |
| **Look** — how it reads on screen | `vox-style` (kinetic typography, flat illustration), `explainer-visual-grammar` (screen modes in measured proportions, from 504 classified frames) |
| **Craft** — writing and timing | `narration-writing` (scene markers, TTS pacing, pronunciation), `voice-driven-timing` (word timestamps → scene boundaries), `explaining-technical-concepts` (engineering audiences at any depth), `using-claude-memory` (personalize without leaking memory) |
| **Production** — engines and assets | `choosing-the-tool` (Manim vs HyperFrames per scene), `manim-essentials`, `soundtrack` (music beds, ducking, stingers), `talking-head-composite` (presenter footage + generated visuals), `provider-config` (swap TTS/image/music/video/LLM providers) |

## thinking-models — 40 skills

Each skill is a process with examples, a template, and a verification checklist.

**Start with [`thinking-model-router`](./thinking-models/skills/thinking-model-router)** when you don't know which model fits — it routes by domain and problem type. If you already know the model, invoke it directly.

| Family | Skills |
|---|---|
| **Decision & analysis** | `thinking-first-principles`, `thinking-second-order`, `thinking-inversion`, `thinking-pre-mortem`, `thinking-kepner-tregoe`, `thinking-reversibility`, `thinking-regret-minimization`, `thinking-opportunity-cost` |
| **Cognitive & behavioral** | `thinking-bayesian`, `thinking-debiasing`, `thinking-dual-process`, `thinking-bounded-rationality`, `thinking-socratic`, `thinking-probabilistic`, `thinking-steel-manning` |
| **Systems & strategy** | `thinking-systems`, `thinking-feedback-loops`, `thinking-archetypes`, `thinking-ooda`, `thinking-leverage-points`, `thinking-theory-of-constraints`, `thinking-cynefin` |
| **Problem-solving** | `thinking-occams-razor`, `thinking-map-territory`, `thinking-circle-of-competence`, `thinking-triz`, `thinking-five-whys-plus`, `thinking-scientific-method`, `thinking-thought-experiment` |
| **Estimation & risk** | `thinking-fermi-estimation`, `thinking-margin-of-safety`, `thinking-lindy-effect`, `thinking-via-negativa`, `thinking-red-team` |
| **Product** | `thinking-jobs-to-be-done`, `thinking-effectuation` |
| **Meta** | `thinking-model-router`, `thinking-model-selection`, `thinking-model-combination` |
| **Opinions** | `forming-opinions` — surface the gut reaction, audit it for motivated reasoning, assign a credence, write the falsifier |

## creativity — 3 skills

| Skill | What it does |
|---|---|
| **`creative-generation`** | The orchestrator. Runs several *distinct* generators — cross-domain analogical transfer, conceptual blending, remote association, constraint injection, abductive gap-finding — then converges on mechanism-distinct candidates. Optimizes the *set* for spread rather than the single most-likely answer, which is what fights mode-collapse. |
| **`constraint-based-creativity`** | Turns limitations into fuel: resource/format/rule/perspective constraints, limitation sprints, the subtraction game, format flips. |
| **`creativity-sampler`** | Probability-weighted options across typicality zones (conventional → wild card), surfacing the hidden assumptions behind the "obvious" choice. Best at a decision point. |

## x-growth — 1 skill

| Surface | What it does |
|---|---|
| `/x-growth-setup` | One-time install and auth for [`twitter-cli`](https://github.com/public-clis/twitter-cli) (reads browser cookies, no API keys). |
| **`x-reply-strategist`** | Profile niche → search posts → monitor → brief → research → form an opinion (steelman + strawman + web evidence) → draft replies. Never drafts a reply until you've seen the briefing and picked a post. |

## proven-better-new — 1 skill

| Surface | What it does |
|---|---|
| **`proven-better-new`** (`/proven-better-new <idea>`) | Pressure-tests a product/startup idea with Mark Pincus's Proven-Better-New framework: proven business model + mechanics (evidence-grounded via web research), a Better checklist gated on 10/10 user consensus, and a New bet checked against the MVP trap with 2-4 backup bets required. |

---

## How they compose

The packs are built to be used together, not in isolation:

```
creativity          → generate widely, mechanism-diverse       (divergent)
thinking-models     → evaluate, decide, commit with a credence (convergent)
   └─ forming-opinions is the hinge between the two
x-growth            → uses forming-opinions to earn a reply worth posting
video-gen           → uses explaining-technical-concepts + a voice profile to earn a script
```

Generate widely with `creative-generation`, then pick and stand behind a choice with `forming-opinions`.

## Structure

```
.
├── .claude-plugin/marketplace.json   # lists the five plugins below
├── video-gen/          # plugin — skills/ commands/ agents/ scripts/ tests/
├── thinking-models/    # plugin — skills/
├── creativity/         # plugin — skills/
├── x-growth/           # plugin — skills/ commands/
└── proven-better-new/  # plugin — skills/
```

Every plugin carries its own `.claude-plugin/plugin.json`. See each plugin's README for detail and attribution — several skills are imported from other MIT-licensed packs and credited there.

## License

MIT
