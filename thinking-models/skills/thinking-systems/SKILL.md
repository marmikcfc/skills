---
name: thinking-systems
description: Maps a system's structure — actors, stocks, flows, feedback loops, delays, constraints — then ranks where to intervene using Meadows' leverage hierarchy. Use when a fix in one place breaks another, when behavior is emergent and no single component explains it, when past solutions worked briefly then failed, or when mapping something large and interconnected (an incident across services, an org dynamic, a supply chain, a company's cash-flow circularity, a market). Triggers on systems thinking, leverage points, feedback loops, causal loop diagrams, stocks and flows, second-order effects, bottlenecks, supply chain, capital cycle.
---

# Systems Thinking & Leverage Points

## Core Principle

The behavior of a system cannot be understood by analyzing components in isolation. Structure drives behavior. Find the structure — loops, delays, stocks, constraints — and you find where to push.

This skill scales. The same six steps map a retry storm across three services and the global AI compute supply chain. What changes is the depth of each step and which resource you load.

## Workflow

Copy this checklist and track your progress:

```
Systems Thinking & Leverage Progress:
- [ ] Step 1: Scope the system
- [ ] Step 2: Map the structure
- [ ] Step 3: Find the loops
- [ ] Step 4: Quantify
- [ ] Step 5: Rank leverage points
- [ ] Step 6: Stress-test and deliver
```

**Step 1: Scope the system** — Boundary (in/out and why), time horizon, and problem stated as symptom → pattern → hypothesis. See [System Definition](#system-definition).

**Step 2: Map the structure** — Actors, stocks (accumulations), flows (rates), and the connections between them. Route by scale:

| System looks like | Load |
|---|---|
| 3–8 variables, one org or codebase, 1–2 obvious loops | [resources/template.md](resources/template.md) |
| Nested loops, an archetype, org/behavioral dynamics | [resources/methodology.md](resources/methodology.md) |
| Multiple firms, tiers, money and material moving in opposite directions, physical or capital constraints | [resources/large-systems.md](resources/large-systems.md) |

**Step 3: Find the loops** — Mark polarity on every link, close the loops, label them R1/B1, note delays with quantified lag. See [Loop Discipline](#loop-discipline). Check for a matching archetype in [resources/methodology.md](resources/methodology.md) §2.

**Step 4: Quantify** — Put numbers on the stocks and flows. Loop *dominance* is a magnitude question, not a narrative one. See [Quantification](#quantification). This step is optional for a contained bug and mandatory for anything with money or physical capacity in it.

**Step 5: Rank leverage points** — Classify every candidate intervention on Meadows' 1–12 hierarchy, then trade leverage against feasibility. See [Leverage Points Analysis](#leverage-points-analysis).

**Step 6: Stress-test and deliver** — Self-score against [resources/evaluators/rubric_systems_thinking_leverage.json](resources/evaluators/rubric_systems_thinking_leverage.json) (plus [rubric_large_system_map.json](resources/evaluators/rubric_large_system_map.json) for Step 2's third row). Then write the deliverable per [Delivery Format](#delivery-format).

**Worked examples** — read the one closest to your problem before starting:
- [resources/examples/incident-debugging.md](resources/examples/incident-debugging.md) — cross-service latency incident
- [resources/examples/ai-supply-chain.md](resources/examples/ai-supply-chain.md) — a ten-tier physical + capital supply chain
- [resources/examples/nvidia-cash-flow.md](resources/examples/nvidia-cash-flow.md) — a single firm's cash and financing circularity

## When NOT to Use

- Single-component linear bug with a clear stack trace → trace and fix it; the mapping overhead buys nothing.
- The cause is already obvious from the recent diff or one log line → fix directly.
- A contained refactor or feature with no cross-component interaction → skip.
- You need a decision in the next ten minutes and the system is unfamiliar → you will produce a plausible map with no predictive power. Say what you don't know instead.

---

## System Definition

**1. System Boundary**
- What's inside (components you're analyzing and can influence)?
- What's outside (external forces you can't control but must adapt to)?
- Why this boundary? Too narrow misses the feedback that creates the problem; too broad produces an unactionable map.

The most common boundary error at scale: drawing the boundary around one firm when the loop that governs its behavior closes through its customers' customers.

**2. Key Variables**
- **Stocks** — things that accumulate. Nouns. Measured at a point in time. Employee count, technical debt, queue depth, installed GPU base, cash, backlog, trust.
- **Flows** — rates that change stocks. Verbs with a per-time unit. Hiring rate, bug introduction rate, wafer starts/month, revenue/quarter, depreciation/year.
- **Goals** — what the system is actually optimizing, which is often not what it says it optimizes.

**3. Time Horizon**
- Short (weeks–months): flows and immediate feedback dominate.
- Long (years): stocks, delays, paradigms and structural change dominate.
- Pick the horizon *before* mapping. It determines which loops matter — a loop with a 3-year delay is invisible in a 6-month analysis and decisive in a 10-year one.

**4. Problem Statement**
- **Symptom**: the observable issue. "Customer churn is 30%/year."
- **Pattern**: the recurring dynamic over time. "Onboarding improvements work for two months, then churn returns."
- **Hypothesis**: a feedback loop that would produce that pattern. "Pressure to reduce churn → faster onboarding → users never see the depth → churn returns → more pressure."

If you can't state the pattern, you don't have a systems problem yet — you have an event. Go collect behavior over time first.

---

## Loop Discipline

**Link polarity**
- **(+)** variables move in the same direction (A↑ → B↑, A↓ → B↓)
- **(−)** variables move in opposite directions (A↑ → B↓)

**Loop polarity** — count the negative links around the closed loop:
- Even number of (−) links → **Reinforcing (R)**. Amplifies change. Produces growth or collapse.
- Odd number of (−) links → **Balancing (B)**. Resists change. Seeks a goal.

**Every loop needs four labels:** an ID (R1, B2), a name, the delay around it, and the condition under which it dominates.

**Delays are not decoration.** Quantify every one — "3–6 months", not "delayed". Four types, in ascending order of danger:

| Type | Example | Why it hurts |
|---|---|---|
| Physical | Shipping, construction, fab cycle time | Predictable, plannable |
| Information | Metrics lag, reporting cadence | Fixable with better instrumentation |
| Decision | Approval cycles, board sign-off | Process improvement opportunity |
| Perception | "This isn't working" | Most dangerous — causes abandonment before the effect arrives |

**Loop dominance** — in any multi-loop system, ask three questions:
1. Which loop explains ~80% of current behavior?
2. Which loop dominates next, after the current one hits its limit?
3. What triggers the handoff?

Intervention timing follows from this: strengthen the *next* dominant loop before the transition, not after.

---

## Quantification

A causal loop diagram without magnitudes is a story. Two loops pointing in opposite directions tell you nothing until you know which is bigger.

**Minimum quantification pass:**

1. **Unit every stock and flow.** Stocks in a quantity, flows in quantity/time. If you can't name the unit, it's not a stock or a flow — it's a vibe.
2. **Fermi-estimate rather than skip.** An order-of-magnitude number with a stated basis beats an unnumbered arrow. Mark every estimate with its confidence and vintage.
3. **Compute residence time** = stock ÷ outflow. How long does a unit sit here? This tells you the delay the stock imposes on the whole system, and it is usually the number nobody has.
4. **Check the constraint.** In a chain, throughput = min(capacity across tiers). Compute each tier's capacity in a *common* unit and find the smallest. Everything upstream of the constraint accumulates; everything downstream starves.
5. **Ratio checks.** Growth rate vs. capacity growth rate. Capex vs. depreciation. Inflow vs. outflow. Backlog vs. quarterly revenue. These ratios, not the levels, tell you where the system is heading.
6. **Sanity-check against conservation.** Money that leaves one actor arrives at another. Units shipped either sit in inventory, are installed, or were retired. If your map leaks, it's wrong.

**The dominance test:** for each pair of opposing loops, estimate the gain of each (how much does one turn of the loop amplify or damp?). State which dominates now and at what threshold the ordering flips. That threshold is your early-warning indicator.

---

## Leverage Points Analysis

**Meadows' 12 Leverage Points**, ascending in effectiveness (12 = weakest):

| # | Point | What it is | Example |
|---|---|---|---|
| 12 | Parameters | Constants, rates, numbers | Raise the timeout; +20% training budget |
| 11 | Buffers | Stock size relative to flows | Runway 6 → 12 months; larger queue bound |
| 10 | Stock-flow structure | Physical system design | Shard the database; re-site the fab |
| 9 | Delays | Length of lags | Daily feedback instead of annual reviews |
| 8 | Balancing loop strength | Power of stabilizing forces | Blameless post-mortems (weaken the fear loop) |
| 7 | Reinforcing loop strength | Power of amplifying forces | Invest in build speed → more experiments → better tools |
| 6 | Information flows | Who can see what | Show developers the tickets their code causes |
| 5 | Rules | Incentives, constraints, penalties | Bonus on team outcome, not individual metric |
| 4 | Self-organization | Power to change structure | Let teams choose their own tools |
| 3 | Goals | Purpose the system serves | "Solve user problems sustainably" over "ship fast" |
| 2 | Paradigms | The mindset the system arises from | Employees as capital investors, not costs |
| 1 | Transcending paradigms | Holding paradigms lightly | Hold growth *and* sustainability, choose contextually |

**How to use it:**
1. List *all* candidate intervention points, not the first idea.
2. Classify each 1–12 and state why it's that level.
3. Prioritize 1–7 over 8–12.
4. Then apply the feasibility discount — high leverage attracts high resistance. The best pick is usually the highest-leverage point you actually have authority over, plus a low-leverage stopgap while the high-leverage change lands.

**Leverage is not static.** As the system evolves, the leverage point moves. In a chain, it sits at the binding constraint — and when you relieve that constraint, leverage migrates to the next one. Re-run the analysis when the constraint moves.

---

## Common System Patterns

Quick recognition table. Full archetype library with structures and interventions in [resources/methodology.md](resources/methodology.md) §2; scale-specific archetypes in [resources/large-systems.md](resources/large-systems.md) §8.

| Pattern | Signature | High-leverage move |
|---|---|---|
| Fixes That Fail | Fix works, then needs repeating more often | Address root cause; surface the unintended consequence early |
| Shifting the Burden | "We can't function without [workaround]" | Invest in the fundamental fix while tapering the workaround |
| Limits to Growth | S-curve, "growing pains" | Find the limit before you hit it; expand it ahead of demand |
| Tragedy of the Commons | Shared resource degrading, nobody responsible | Make total usage visible; add quotas; enable governance |
| Growth and Underinvestment | Chronic capacity shortage, quality slipping | Invest ahead of demand on a leading indicator |
| Success to the Successful | Winner-take-all, monoculture | Enforced diversification and exploration budget |
| Rule Beating | Metric improves, outcome doesn't | Tie metrics to outcomes, not proxies; multi-dimensional |
| Escalation | Arms race, tit-for-tat | Unilateral de-escalation; shift to a cooperative paradigm |
| Bullwhip | Order swings amplify upstream | Shorten information delay; share true end-demand signal |
| Capacity Boom-Bust | Shortage → overbuild → glut → underbuild | Damp the ordering loop; commit on end-demand, not on backlog |
| Circular Financing | Supplier funds its own customers' purchases | Separate funded from unfunded demand and track both |

---

## Validation

Before finalizing, check:

**System map quality**
- [ ] Boundary explicit, with rationale for what's excluded?
- [ ] Stocks (nouns, accumulations) distinguished from flows (verbs, rates)?
- [ ] Every link has polarity; every loop is closed and labeled R#/B#?
- [ ] Delays noted with quantified lag and type?
- [ ] For each opposing loop pair, is the dominant one identified?

**Quantification** (skip only for contained technical systems)
- [ ] Every stock and flow carries a unit?
- [ ] Estimates carry a basis, a confidence, and a date?
- [ ] Residence times computed for the major stocks?
- [ ] Binding constraint identified in a common unit?
- [ ] Map conserves — no money or material appears or vanishes?

**Leverage analysis**
- [ ] Multiple candidates considered, not just the first idea?
- [ ] Each classified 1–12 with stated rationale?
- [ ] High-leverage (1–7) prioritized over parameter-tweaking?
- [ ] Leverage-vs-feasibility trade-off explicit?
- [ ] Each intervention linked to the specific loop it changes and how?

**Stress test**
- [ ] Second-order effects traced through the *other* loops?
- [ ] System resistance named — who or what pushes back, and via which loop?
- [ ] Timeline accounts for the delays you quantified?
- [ ] Leading and lagging indicators separated?
- [ ] Falsifiers stated: what observation would prove this map wrong?

**Minimum standard:** average ≥ 3.5/5 on the rubric before delivering. ≥ 4.0 for moderate systems, ≥ 4.5 for complex or high-stakes ones.

---

## Delivery Format

Write `systems-map-<subject>.md` containing:

**1. System overview** — boundary, time horizon, key stocks and flows with units, problem as symptom → pattern → hypothesis.

**2. System map** — causal loop diagram (ASCII or structured text), loops labeled R1/R2/B1/B2 with delays, stock-flow structure, and for large systems the layered tier map and the three ledgers.

**3. Quantification** — table of stocks and flows with values, units, basis, confidence, and vintage. Binding constraint. Dominance calls with thresholds.

**4. Leverage analysis** — all candidates, classified 1–12, with feasibility, ranked recommendation.

**5. Intervention strategy** — primary and supporting interventions, mechanism (which loop, how), predicted short/medium/long-term outcomes, risks and unintended consequences, resistance points.

**6. Monitoring** — leading and lagging indicators, the dominance-flip thresholds to watch, review cadence, and the falsifiers that would invalidate the model.

---

## Key Questions

- What feeds back into what?
- Where are the delays, and how long are they really?
- Which loop dominates now, and what would flip it?
- What is the binding constraint, in what unit, and where does leverage move if I relieve it?
- What happens at 10x?
- If I fix this here, what breaks over there, and after how long?
- What behavior emerges that no single actor intends?
- What would I have to observe to conclude this map is wrong?

## Red Flags

- Treating symptoms instead of structure (low leverage by construction)
- A diagram with no numbers — you cannot rank loops you haven't sized
- Linear chains (A→B→C) presented as systems analysis; no closed loop means no feedback
- Missing delays → impatience → premature abandonment of a working intervention
- Parameter-tweaking (level 12) as the primary strategy
- No unintended-consequence trace; assuming the system accepts the intervention passively
- Confusing a run-rate (flow) with a level (stock), or a backlog with demand
- One firm's map mistaken for the system's map

## Related Skills

`thinking-leverage-points` (Meadows' hierarchy in depth) · `thinking-feedback-loops` · `thinking-archetypes` · `thinking-theory-of-constraints` (constraint analysis in depth) · `thinking-second-order` · `thinking-fermi-estimation` (for Step 4)

## Meadows' Reminder

> "We can't control systems or figure them out. But we can dance with them."

Systems resist simple fixes. Effective intervention requires understanding the whole, finding leverage, and accepting that you are influencing, not controlling.
