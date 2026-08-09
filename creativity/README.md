# creativity

Divergent idea-generation skills. Where `thinking-models` helps you *evaluate and decide*, these help you *generate and diversify* — the two are complementary halves of one loop.

## Skills

- **[`creative-generation`](./skills/creative-generation)** *(authored for this pack)* — the orchestrator. Runs several **distinct** generators (cross-domain analogical transfer, conceptual blending, remote association, constraint injection, abductive gap-finding), then converges on mechanism-distinct candidates. Optimizes the *set* (mechanistic spread), not the single most-likely answer — which is exactly what fights LLM mode-collapse. Use it when your first ideas all feel samey.
- **[`constraint-based-creativity`](./skills/constraint-based-creativity)** *(imported)* — turns limitations into creative fuel: resource/format/rule/perspective constraints, limitation sprints, the subtraction game, format flips. One of the generators `creative-generation` calls in its diverge phase.
- **[`creativity-sampler`](./skills/creativity-sampler)** *(imported)* — a probability-weighted option generator that fights anchoring/typicality bias by sampling across typicality zones (conventional → wild card) and surfacing hidden assumptions. Best at a decision point.

## How they fit together

```
creative-generation (orchestrator)
├── Phase 3 generator → constraint-based-creativity
├── Phase 3 generator → creativity-sampler
└── Phase 5 converge  → forming-opinions (thinking-models) to commit
```

Use `creative-generation` for a wide, mechanistically-diverse sweep; reach for `constraint-based-creativity` or `creativity-sampler` directly for a quick single-method pass.

## Attribution

- `constraint-based-creativity` — imported from **[lyndonkl/claude](https://github.com/lyndonkl/claude)** (`--skill constraint-based-creativity`), including its `resources/` (template, methodology, examples, rubric).
- `creativity-sampler` — imported from **[whynowlab/stack-skills](https://github.com/whynowlab/stack-skills)** (upstream name `swing-options`, MIT). Renamed to `creativity-sampler`; the `name:` field and a few sibling-skill references were updated to fit this pack. Body otherwise verbatim, including the original bilingual (EN/KO) triggers.
- `creative-generation` is original to this pack, grounded in the science of novelty generation (structure-mapping/analogy, conceptual blending, Geneplore generate-then-explore, first-principles decomposition).
