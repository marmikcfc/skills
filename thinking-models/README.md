# thinking-models

40 mental models packaged as invokable Claude skills. Each is a `SKILL.md` with a process, examples, a template, and a verification checklist.

**Start with [`thinking-model-router`](./skills/thinking-model-router)** when you don't know which model fits — it routes by domain + problem type. If you already know the model, invoke it directly.

## Families

- **Decision & analysis** — first-principles, second-order, inversion, pre-mortem, kepner-tregoe, reversibility, regret-minimization, opportunity-cost
- **Cognitive & behavioral** — bayesian, debiasing, dual-process, bounded-rationality, socratic, probabilistic, steel-manning
- **Systems & strategy** — **`thinking-systems`** *(expanded)*, feedback-loops, archetypes, ooda, leverage-points, theory-of-constraints, cynefin
- **Problem-solving & innovation** — occams-razor, map-territory, circle-of-competence, triz, five-whys-plus, scientific-method, thought-experiment
- **Estimation & risk** — fermi-estimation, margin-of-safety, lindy-effect, via-negativa, red-team
- **Product & innovation** — jobs-to-be-done, effectuation
- **Meta** — model-router, model-selection, model-combination
- **Opinions** — **`forming-opinions`** *(authored for this pack)* — surface your gut reaction, audit it for motivated reasoning, assign a credence, write the falsifier. The convergent counterpart to the `creativity` pack.

## `thinking-systems`

The one skill in this pack with a full resource tree rather than a single `SKILL.md`. It scales from a cross-service incident to an industry-wide capital cycle on the same six steps:

```
SKILL.md                      router + Meadows' 12 leverage points + validation
resources/
  template.md                 fill-in worksheet — simple to moderate systems
  methodology.md              10 archetypes, technical dynamics, delays, tipping points
  large-systems.md            supply chains, capital cycles, markets: three-ledger
                              method, tier stacks, constraint migration, circular financing
  examples/
    incident-debugging.md     cross-service latency incident (loop gain, retry storm)
    ai-supply-chain.md        ten-tier physical + capital chain
    nvidia-cash-flow.md       firm-level cash circularity and its terminating loop
  evaluators/
    rubric_systems_thinking_leverage.json   10 weighted criteria, loops and leverage
    rubric_large_system_map.json            10 weighted criteria, scale and quantification
```

What it adds over a stock systems-thinking prompt: an explicit **quantification step** (loop dominance is an arithmetic question, not a narrative one), the **three-ledger separation** of physical / financial / informational flows, and **constraint migration** as the central dynamic of any chain.

## Attribution

The 39 `thinking-*` skills are imported from **[tjboudreaux/cc-thinking-skills](https://github.com/tjboudreaux/cc-thinking-skills)** (MIT). Only the `skills/` were vendored; the upstream eval/analysis harness was not.

`thinking-systems` was rebuilt on the workflow, resource layout and rubric of **[lyndonkl/claude](https://github.com/lyndonkl/claude/tree/main/skills/systems-thinking-leverage)** `systems-thinking-leverage` — that repo states no license, so treat the derivation as attribution rather than a license grant. `rubric_systems_thinking_leverage.json` is carried over unchanged; the technical-dynamics section retains the original engineering patterns from this pack; the quantification step, `large-systems.md`, the three worked examples and `rubric_large_system_map.json` are new. `forming-opinions` is original to this pack, grounded in a layered model of how humans form and update opinions (predictive-processing, dual-process, motivated reasoning, identity-protective cognition, and the ethics of belief).
