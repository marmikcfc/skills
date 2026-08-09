---
name: creative-generation
description: Generate a diverse portfolio of genuinely novel ideas or hypotheses by running several DISTINCT generating mechanisms (cross-domain analogical transfer, conceptual blending, remote association, constraint injection, abductive gap-finding) and then converging on the strongest mechanism-distinct candidates. Use when brainstorming or ideating, generating hypotheses or research directions, naming product/feature/architecture options, when you need novel or non-obvious ideas, when you want options beyond the obvious, or — the key trigger — when your first batch of ideas all feel samey, derivative, or like paraphrases of each other. Optimizes the *set* (spread across mechanisms), not the single most-likely answer, which is exactly what fights LLM mode-collapse.
---

# Creative Generation

## Overview

Novelty is an engineering discipline, not a muse. The most reliable engines of genuinely new ideas are well-documented: **cross-domain analogical transfer** (import a mechanism from another field — GANs from game theory, simulated annealing from metallurgy, PageRank from citation analysis), **first-principles decomposition** (strip to irreducible truths, rebuild free of convention), and **conceptual blending / bisociation** (force two unrelated frames to collide and read off what emerges). This skill packages those engines into one loop.

The reason it's an orchestrator and not a single trick: an LLM's failure mode is **mode collapse** — it converges on the single most-probable answer and produces N near-duplicates that differ only on the surface. The cure is structural. Run *several different generators* so candidates spread across distinct *mechanisms*, and judge the **set** by its mechanistic diversity, not any single idea by its polish. Creativity here = `generate widely, then select` — two phases that must be kept separate (generate with the editor off, evaluate with it on).

**The one sentence to remember:** *Optimize the portfolio for mechanistic spread — many candidates from genuinely different generating principles — then converge; never collapse to the one obvious idea.*

## When this fires vs. when to skip

Fire it whenever the goal is *divergent*: produce options, hypotheses, angles, designs, names, strategies — anything where "more genuinely different candidates" beats "one safe answer." The strongest trigger is the smell of sameness: if your first three ideas are obviously variations on one theme, you've mode-collapsed and need this.

Skip it when the task is convergent or determined: a factual answer, a single-path implementation, or a decision where the options are already on the table (there, evaluate with `forming-opinions` instead of generating more).

## The loop

```
Creative-Generation Progress:
- [ ] 0. Frame: state the job-to-be-done + map what's already been tried
- [ ] 1. Decompose with first principles (find what's actually required)
- [ ] 2. Reframe: 3-5 different framings of the problem
- [ ] 3. Diverge: run >=3 DISTINCT generators (analogy / blend / constraint / sample / abductive)
- [ ] 4. Incubate: re-represent and regenerate from a fresh frame
- [ ] 5. Converge: cluster by mechanism, keep best per cluster, pressure-test
- [ ] 6. Deliver a portfolio spread across mechanisms (not one "best" answer)
```

### 0. Frame and reconnoiter

State the *function* required in one sentence — the job to be done, separated from any current *form*. Then **map what already exists or has been tried**, and set it aside as the "obvious/known" pile. Novelty is defined relative to this pile; without it you'll rediscover the obvious and call it new. (Use **thinking-jobs-to-be-done** to nail the function.)

### 1. Decompose with first principles

List the assumptions and "best practices" baked into the problem. Interrogate each: *law of physics/logic, or mere convention/historical accident?* Keep only the irreducible truths — the real quantities, costs, and constraints. This frees the solution space before you generate, so your ideas aren't all trapped inside the same inherited frame. Hand off to **thinking-first-principles**.

### 2. Reframe

Produce 3–5 *different* framings of the problem — each opens a different region of idea space:
- **Invert it** (solve the opposite / how would I guarantee failure?) → **thinking-inversion**
- **Change the level of abstraction** (zoom way out, or way in)
- **Restate as a contradiction** ("better X makes worse Y") → sets up **thinking-triz**
- **Change the story** ("what would make this a better experience/narrative?")

### 3. Diverge — run at least THREE distinct generators

This is the heart. Keep it loosely constrained — quantity and *mechanistic variety* over polish; suppress the editor. The point of running multiple generators is that each is blind to what the others surface, so the candidate set spreads across equivalence classes instead of clustering. Pick at least three of:

- **(a) Cross-domain analogical transfer — highest yield.** For each of several *distant* source domains (biology, physics, economics, game theory, evolution, thermodynamics, markets, ecology, immunology, linguistics), ask: *what mechanism in this domain solves a structurally analogous problem, and what would importing it look like here?* Map deep **relations**, not surface resemblance (a small body orbits a large one *because of an attractive force* — the relation is the transfer, not "it's round"). This is the move behind most breakthrough innovation.
- **(b) Conceptual blending / bisociation.** Pick two unrelated frames, find their shared generic structure, project both into a blend, and *run the blend* to read off structure present in neither input. Puns, and most scientific discoveries, are this move.
- **(c) Remote association / random entry.** Inject a random word/image/constraint and force a connection. Deliberately sample *low-probability* associations — reach past the first, dominant association to the long tail. This is the direct antidote to picking the obvious token.
- **(d) Constraint injection.** Impose a severe artificial limit (half the budget, one moving part, must work offline, 10 words, no UI). Constraints force non-obvious paths. Hand off to **constraint-based-creativity** for the full method (constraint types, limitation sprints, subtraction game, format flip).
- **(e) Probability-zone sampling.** Generate options explicitly across typicality zones (conventional → wild card), forcing at least one from the bottom zones. Hand off to **creativity-sampler**.
- **(f) Abductive gap-finding.** Surface the surprising anomalies and unexplained gaps; for each ask: *what mechanism, if true, would make this anomaly unsurprising?* Anomalies are the richest raw material for novel hypotheses. (Pairs with **thinking-scientific-method** for turning a hypothesis into a test.)
- **(g) SCAMPER / morphological.** Mechanically transform the current best (Substitute, Combine, Adapt, Modify, Put-to-other-use, Eliminate, Reverse); or decompose the design into independent dimensions and combine across them.

Aim for many candidates. Don't filter yet.

### 4. Incubate — re-represent and regenerate

Change the representation or persona and run the generators again. A fresh frame surfaces remote associations the first pass suppressed (this is what "sleeping on it" does mechanically). Pool everything against the same "already-tried" list from step 0.

### 5. Converge and select

Now switch on the editor. This is the *exploratory* phase and it's where quality enters:

- **Cluster by mechanism**, not by surface. Two ideas that *sound* different but exploit the same principle are one cluster. **Keep the best representative of each cluster; discard near-duplicates** — this is what protects diversity and defeats mode collapse.
- **Score survivors on novelty × plausibility.** Is it mechanistically distinct from the "already-tried" pile? Is it grounded enough to actually work? Pressure-test with **thinking-steel-manning** (best case for and against), **thinking-pre-mortem** (assume it failed — why?), and **thinking-bayesian** for calibrated plausibility.
- To **commit** to one, hand the finalists to **forming-opinions** — it's the disciplined way to pick and stand behind a choice without rationalizing.

### 6. Deliver a portfolio

Output N candidates **deliberately spread across distinct mechanisms and source domains**, each tagged with the generator that produced it and a one-line why-it-might-work. The single most important behavioral shift versus default LLM output: **deliver a diverse set, not the one most-likely answer.**

## Output template

```markdown
## Creative brief: [the job-to-be-done, function not form]

**Already tried / obvious (the pile to beat):** [list]
**First-principles truths:** [the irreducible requirements]
**Reframings used:** [inversion / abstraction-shift / contradiction / story]

### Candidate portfolio
| # | Candidate | Generator (mechanism) | Source domain | Why it might work |
|---|-----------|-----------------------|---------------|-------------------|
| 1 | ... | analogical transfer | immunology | ... |
| 2 | ... | conceptual blend | ... | ... |
| 3 | ... | constraint injection | — | ... |
| 4 | ... | abductive gap-finding | — | ... |

**Mechanistic spread check:** [are these genuinely different principles, or surface variants of one?]
**Top picks after pressure-test:** [1-3, with the steel-man / pre-mortem note]
```

## How this composes with other skills

`creative-generation` is the *generative* counterpart to `forming-opinions` (the evaluative one). It calls focused skills rather than re-implementing them:

| Phase | Hand off to |
|-------|-------------|
| Frame the function (0) | `thinking-jobs-to-be-done` |
| First-principles decompose (1) | `thinking-first-principles` |
| Reframe (2) | `thinking-inversion`, `thinking-triz` |
| Diverge — constraint generator (3d) | `constraint-based-creativity` |
| Diverge — sampling generator (3e) | `creativity-sampler` |
| Diverge — abductive (3f) | `thinking-scientific-method` |
| Converge / pressure-test (5) | `thinking-steel-manning`, `thinking-pre-mortem`, `thinking-bayesian` |
| Commit to one (5→) | `forming-opinions` |
| Unsure which lens | `thinking-model-router` |

## Key questions

- "What's the *function* required, stripped of the current form?"
- "Which distant domain already solved a structurally identical problem?"
- "Are my candidates different *mechanisms*, or one idea in five outfits?"
- "What did I suppress because it was low-probability — and is that where the novelty is?"
- "Am I optimizing the single best answer, or the diversity of the set?"

## Verification checklist

- [ ] The "already-tried/obvious" pile was written down before generating
- [ ] At least 3 *distinct* generators were actually run (not one generator relabeled)
- [ ] Candidates are clustered by mechanism and near-duplicates were pruned
- [ ] The final portfolio spans multiple mechanisms / source domains
- [ ] Each candidate is tagged with its generator and a plausibility note
- [ ] Generation (editor off) was kept separate from evaluation (editor on)
