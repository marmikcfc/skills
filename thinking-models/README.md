# thinking-models

40 mental models packaged as invokable Claude skills. Each is a `SKILL.md` with a process, examples, a template, and a verification checklist.

**Start with [`thinking-model-router`](./skills/thinking-model-router)** when you don't know which model fits — it routes by domain + problem type. If you already know the model, invoke it directly.

## Families

- **Decision & analysis** — first-principles, second-order, inversion, pre-mortem, kepner-tregoe, reversibility, regret-minimization, opportunity-cost
- **Cognitive & behavioral** — bayesian, debiasing, dual-process, bounded-rationality, socratic, probabilistic, steel-manning
- **Systems & strategy** — systems, feedback-loops, archetypes, ooda, leverage-points, theory-of-constraints, cynefin
- **Problem-solving & innovation** — occams-razor, map-territory, circle-of-competence, triz, five-whys-plus, scientific-method, thought-experiment
- **Estimation & risk** — fermi-estimation, margin-of-safety, lindy-effect, via-negativa, red-team
- **Product & innovation** — jobs-to-be-done, effectuation
- **Meta** — model-router, model-selection, model-combination
- **Opinions** — **`forming-opinions`** *(authored for this pack)* — surface your gut reaction, audit it for motivated reasoning, assign a credence, write the falsifier. The convergent counterpart to the `creativity` pack.

## Attribution

The 39 `thinking-*` skills are imported from **[tjboudreaux/cc-thinking-skills](https://github.com/tjboudreaux/cc-thinking-skills)** (MIT). Only the `skills/` were vendored; the upstream eval/analysis harness was not. `forming-opinions` is original to this pack, grounded in a layered model of how humans form and update opinions (predictive-processing, dual-process, motivated reasoning, identity-protective cognition, and the ethics of belief).
