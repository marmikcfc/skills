# Advanced Systems Methodology

For systems with nested loops, recognizable archetypes, significant delays, or multiple stakeholders. Read after Step 2 of the main workflow when `template.md` proves too thin.

## Workflow

```
Advanced Methodology Progress:
- [ ] Step 1: Advanced causal loop techniques
- [ ] Step 2: Match to an archetype
- [ ] Step 3: Analyze multi-loop interaction and dominance
- [ ] Step 4: Model delays and tipping points
- [ ] Step 5: Apply archetype-specific interventions
- [ ] Step 6: Test with behavior-over-time and scenarios
```

---

## 1. Advanced Causal Loop Techniques

### Link and Loop Polarity

**Link polarity:** `+` = same direction, `−` = opposite direction.

**Loop polarity** from the count of negative links around the closed path:
- Even number of `−` (0, 2, 4…) → **Reinforcing (R)** — amplifies change
- Odd number of `−` (1, 3, 5…) → **Balancing (B)** — resists change, seeks a goal

```
Quality →(+)→ Satisfaction →(+)→ Referrals →(+)→ Customers →(+)→ Revenue →(+)→ Quality investment →(+)→ Quality
```
Six positive links, zero negative → **Reinforcing**. Growth *or* collapse — reinforcing loops run in both directions, which is why they're dangerous, not just desirable.

```
Inventory →(−)→ Gap vs. target →(+)→ Order rate →(+)→ Inventory
```
One negative link → **Balancing**. Seeks the target inventory level.

### Nested Loops

Real systems layer loops. Find the primary loop, then the secondary loops that modulate it.

**Product development:**
- **R1 (growth):** Better product → more users → more revenue → more investment → better product
- **B1 (quality gate):** Feature count →(+)→ complexity →(+)→ defects →(−)→ satisfaction →(−)→ revenue

R1 drives growth; B1 caps it whenever quality slips. The high-leverage move isn't "work harder on R1" — it's strengthening B1's *information flow* so complexity becomes visible before it converts to defects.

### Variable Typology

| Type | Behavior | Leverage |
|---|---|---|
| **Exogenous** | External, uncontrollable | Low — you adapt, not intervene |
| **Stock** | Accumulates, slow to move | High effect but long delay |
| **Flow** | Rate of change | Medium, faster to move |
| **Policy** | The rule setting a flow | **Highest** — changes the rate permanently |

Strategic implication: intervene on policies, not on stocks. Draining a stock is a one-time gain; changing the policy that fills it is a permanent one.

### Boundary Stress Test

Once drawn, attack the boundary:
- Which external variable, if it moved 2x, would break the map? That's a candidate to bring inside.
- Does any loop exit and re-enter the boundary? If so, you have a hidden feedback path you're not modeling.
- Whose behavior did you model as fixed that is actually responsive to your intervention? Adaptive actors turn balancing loops into escalation.

---

## 2. System Archetypes Library

Archetypes are recurring structures that appear across unrelated domains. Recognizing one gives you a predicted failure mode and a known high-leverage intervention for free.

They are lenses, not laws. If your system doesn't fit cleanly, don't force it — and note that several archetypes commonly coexist.

### 1. Fixes That Fail

**Pattern:** Quick fix relieves the symptom → unintended consequence worsens the underlying problem → need for the fix grows.

**Structure:** B loop (fast): problem → fix → relief. R loop (slow, delayed): fix → side effect → problem.

**Example:** Crunch to hit a date → features ship → technical debt → development slows → more crunch needed next time.

**Warning sign:** A solution that works but needs reapplying at increasing frequency.

**Leverage:** Address the root cause; make the delayed side effect visible on the same timescale as the relief.

### 2. Shifting the Burden

**Pattern:** An easy symptomatic solution is chosen over a hard fundamental one → capability for the fundamental solution atrophies → dependence on the symptomatic one deepens.

**Structure:** B1 (fast): problem → symptomatic solution → relief. B2 (slow): problem → fundamental solution → lasting fix. R (addiction): use of symptomatic solution → atrophy of fundamental capability.

**Example:** Hire contractors instead of building internal capability → internal capability decays → more contractor dependence.

**Warning sign:** "We can't function without [the workaround]."

**Leverage:** Invest in the fundamental solution *while* tapering the symptomatic one. Cutting the crutch cold turkey fails — the capability isn't there yet.

### 3. Eroding Goals

**Pattern:** Performance gap → pressure → lower the goal rather than raise performance → gap closes → lowered expectation becomes the new normal.

**Example:** Velocity declines → reduce sprint commitment → "more realistic" → capability erodes further.

**Warning sign:** "Let's be realistic" as a recurring refrain; targets that only ever move down.

**Leverage:** Anchor the goal to an external standard — customer need, market benchmark, physics — not to internal capability. Make the erosion itself visible and costly.

### 4. Escalation

**Pattern:** A's action threatens B → B retaliates → A feels more threatened → spiral. Two reinforcing loops feeding each other.

**Example:** Team A adds an abstraction layer to isolate itself from Team B → B does the same → integration cost explodes.

**Warning sign:** Arms-race dynamics, tit-for-tat, defensive engineering.

**Leverage:** Unilateral de-escalation, backed by a paradigm shift from competitive to cooperative. Requires someone to absorb short-term loss.

### 5. Success to the Successful

**Pattern:** A and B compete for a shared resource → A gains a small edge → resource flows to A → A's edge compounds → B starves.

**Example:** The winning product gets more investment, more features, more marketing, more success; the other is starved and declines faster than its merits warrant.

**Warning sign:** "Back the winners" producing a monoculture; option value quietly destroyed.

**Leverage:** Structural diversification — minimum allocation per option, an explicit exploration budget, protected funding for the challenger.

### 6. Tragedy of the Commons

**Pattern:** Shared resource → each actor rationally maximizes individual use → resource depletes → all suffer.

**Example:** Shared codebase → each team adds dependencies → build time and complexity explode → everyone slows.

**Warning sign:** Externalities nobody owns; prisoner's-dilemma payoffs.

**Leverage:** Three options in ascending durability — (6) make total usage visible to every user; (5) add quotas or pricing; (4) enable collective governance.

### 7. Limits to Growth

**Pattern:** A reinforcing loop drives growth → growth consumes a limiting resource → a balancing loop engages → growth slows or reverses.

**Example:** Viral growth → support overwhelmed → poor experience → negative word of mouth → growth reverses.

**Warning sign:** S-curve flattening; "growing pains"; the same team saying yes to everything.

**Leverage:** Identify the limit *before* you hit it and invest in expanding it ahead of demand. Pushing harder on the growth loop after the limit binds does nothing but raise pressure.

### 8. Growth and Underinvestment

**Pattern:** Growth → capacity strain → investment deferred to protect margin → performance degrades → demand falls → the shortfall appears to justify the underinvestment.

**Example:** Customer growth → need more support staff → hire slowly for cost control → service quality drops → churn rises.

**Warning sign:** Chronic capacity shortage; "doing more with less"; standards quietly slipping.

**Leverage:** Invest ahead of demand, triggered by a *leading* indicator. The trap is that the evidence justifying investment only arrives after the damage.

### 9. Accidental Adversaries

**Pattern:** A's actions inadvertently harm B → B takes protective action that harms A → both conclude the other is hostile.

**Example:** Engineering optimizes for architectural soundness → Product complains everything takes too long → Engineering cuts corners under pressure → Product complains about bugs.

**Warning sign:** Silos blaming each other while each behaves rationally within its own metrics.

**Leverage:** Make the interdependence visible; install joint success metrics; the conflict is structural, not personal.

### 10. Rule Beating

**Pattern:** A rule is created to serve a goal → the rule becomes the target → behavior optimizes the rule at the goal's expense.

Goodhart's Law: when a measure becomes a target, it ceases to be a good measure.

**Example:** "Close 10 tickets/day" → easy tickets closed, hard ones deferred → customer problems persist while the metric improves.

**Warning sign:** The metric improves and the outcome doesn't. Teaching to the test.

**Leverage:** Tie measurement to outcomes rather than outputs; use multi-dimensional metrics so gaming one degrades another.

---

## 3. Technical System Dynamics

The archetypes above are structural. These are their specific expressions in distributed software — fast loops, seconds to minutes, where the same math produces failures with their own names.

### Cascading Failure

```
Component fails → dependents overload → they fail → load concentrates on survivors
        ↑                                                        │
        └────────────────────────────────────────────────────────┘
```
Reinforcing loop with near-zero delay. **Mitigation:** circuit breakers (cut the loop), bulkheads (partition it), graceful degradation (reduce the gain).

### Retry Storm

```
Service slow → clients retry → more load → service slower → more retries
```
Reinforcing. The retry policy is the loop gain. **Mitigation:** exponential backoff with jitter, retry budgets, load shedding at the server. This is a *rules* intervention (level 5), which is why it works where capacity increases (level 12) don't.

### Thundering Herd

```
Cache expires simultaneously → all requests hit the backend at once → overload
```
A synchronized flow spike caused by correlated timing. **Mitigation:** jittered TTLs, request coalescing, cache warming. The fix is de-correlation, not capacity.

### Queue Backup

```
Arrival rate > processing rate → queue grows → memory pressure → OOM
```
A pure stock-and-flow problem. Residence time = queue depth ÷ processing rate, and it grows without bound whenever the inequality holds — capacity added downstream doesn't help until the rates cross. **Mitigation:** backpressure, rate limiting, bounded queues (fail fast rather than fail late).

### Resource Contention

```
Multiple processes → same resource → lock contention → serialization
                                                → throughput collapses despite idle CPU
```
Non-linear: throughput rises with concurrency until the contention threshold, then falls. **Mitigation:** sharding, optimistic locking, resource isolation.

### Metastable Failure

The system has two stable states — healthy and collapsed — and a trigger can push it from one to the other, where it stays even after the trigger is removed. Retry storms and cache stampedes both create these. **Mitigation:** you cannot recover by removing the trigger; you must break the sustaining loop (shed load, flush queues, cold-start with limits).

**The general lesson:** in fast technical loops the leverage is almost always in *rules* (retry policy, admission control, timeouts as budgets) and *information flows* (backpressure signals), not in *parameters* (bigger instances, higher limits). Parameters raise the threshold; rules change the dynamic.

---

## 4. Multi-Loop Interaction

### Loop Dominance

In a multi-loop system, three questions:
1. **Which loop is dominant now** — explains ~80% of the observed behavior?
2. **Which dominates next**, after the current one hits its limit?
3. **What shifts dominance** — the trigger condition?

**Startup lifecycle:**
- Early: R (product-market fit → growth) dominant
- Scale: B (operational complexity → slowdown) takes over
- Mature: B (market saturation → plateau) dominates

**Intervention timing:** strengthen the *next* dominant loop before the handoff. Building operational capability during the growth phase feels premature and is exactly correct.

### Conflict vs. Synergy

**Conflict** — loops oppose. R1 (ship fast) vs. B1 (maintain quality). Resolution is rarely to pick one; it's a higher-order goal that integrates both (sustainable velocity), i.e. a level-3 intervention.

**Synergy** — loops compound. R1 (learning improves skill) + R2 (skill improves confidence). Leverage: activate both at once; the combined gain is multiplicative.

### Archetype Combinations

Real systems stack archetypes.

**Fixes That Fail + Shifting the Burden:** the quick fix becomes the standing symptomatic solution; the fundamental capability atrophies; dependence deepens. *Example:* manual workarounds prevent automation investment → more manual work → less time for automation. *Intervention:* ring-fence capacity for fundamental solutions (dedicated team, protected 20% time) so the fundamental loop can't be starved by the urgent one.

**Limits to Growth + Growth and Underinvestment:** growth hits a limit, and the response is to defer the investment that would relieve it. This is the standard failure mode of scaling infrastructure.

**Success to the Successful + Rule Beating:** the winner is chosen by a proxy metric, then compounds on the strength of a measurement error.

---

## 5. Delays and Tipping Points

### Delay Types

| Type | Description | Example | Character |
|---|---|---|---|
| **Physical** | Material transport, construction, cycle time | Shipping, fab throughput, building | Predictable, plannable |
| **Information** | Data collection and reporting lag | Metrics lag, survey cycles | Reducible with instrumentation |
| **Decision** | Analysis and approval cycles | Committee review, board approval | Process improvement opportunity |
| **Perception** | Time to *recognize* change occurred | "This isn't working" | **Most dangerous** |

Perception delays are worst because people conclude the intervention failed before its effects manifest — then reverse it, and the effect never arrives.

**Mitigation:** state the expected delay up front, publish leading indicators that move sooner, and pre-commit to a review date placed *after* the delay.

### Tipping Points

A threshold where a small additional change causes a large, often irreversible state shift.

**Approach warnings:**
- Non-linear acceleration — the rate of change is itself increasing
- Rising variance — the system wobbles more around its mean
- Slower recovery from perturbations — resilience declining (critical slowing down)
- Bifurcation signs — the system oscillating between two attractors

**Example — team morale.** Stable state: high morale, productive. Tipping point: a key person leaves and others start questioning. New stable state: low morale, attrition spiral. Returning to the prior state costs far more than preventing the shift.

**Strategies:** build buffers before the threshold; monitor leading indicators; install circuit breakers that intervene automatically on approach.

### Stock-Induced Oscillation

```
Stock accumulates → corrective action → [delay] → overcorrection → stock depletes → opposite action → repeat
```

**Hiring example:** backlog builds over 3 months → hiring burst → 6-month ramp delay → meanwhile the backlog cleared → overstaffed → layoffs → backlog builds again.

The oscillation is caused by the *delay*, not by bad judgment. Fixes, in order of leverage:
1. Reduce the information delay (real-time backlog visibility)
2. Smooth the flow adjustment (steady hiring, not bursts)
3. Increase the buffer (less sensitivity to fluctuation)

---

## 6. Intervention Strategies by Archetype

| Archetype | Low leverage — avoid | High leverage — prioritize |
|---|---|---|
| Fixes That Fail | Apply the fix harder | Address root cause; surface the side effect on the same timescale as the relief |
| Shifting the Burden | Cut the crutch cold turkey | Build the fundamental capability while tapering the crutch |
| Eroding Goals | Accept the lower standard | Anchor goals externally; make erosion visible and costly |
| Escalation | Match the escalation | Unilateral de-escalation; cooperative paradigm |
| Success to the Successful | Back the winner harder | Enforced diversification; protected exploration budget |
| Tragedy of the Commons | Appeal to altruism | Make usage visible; add quotas or pricing; enable governance |
| Limits to Growth | Push growth harder | Identify and expand the limit ahead of demand |
| Growth and Underinvestment | Cut cost to protect margin | Invest ahead of demand on a leading indicator |
| Accidental Adversaries | Optimize local metrics | Joint metrics; make interdependence visible |
| Rule Beating | Add more rules and enforcement | Measure outcomes not outputs; multi-dimensional metrics |

### Tactics by Leverage Level

**Level 12 — Parameters (weak).** Adjust numbers. Useful for temporary relief and for testing a hypothesis cheaply. Limitation: competitors match, effects fade, the structure reasserts itself.

**Level 9 — Delays (medium).** Speed up feedback. Useful when the system is stable and slow to learn. Limitation: too-fast feedback destabilizes — you get overreaction and oscillation.

**Level 6 — Information flows (strong).** Show consequences to whoever can act on them. Useful when information asymmetry is driving locally-rational, globally-bad decisions. Limitation: visibility without authority produces frustration, not change.

**Level 5 — Rules (strong).** Change incentives and constraints. Useful when behavior is misaligned with the goal. Limitation: rules get gamed — see Rule Beating.

**Level 3 — Goals (very strong).** Redefine what the system is for. Useful when the current goal produces perverse outcomes even under perfect execution. Limitation: high resistance, because goals are entangled with identity.

**Level 2 — Paradigms (strongest practical).** Shift the mental model the whole structure rests on. Useful for genuine transformation. Limitation: slowest, requires accumulated evidence and usually a crisis.

### Sequencing

**Phase 1 — Stabilize.** Stop the bleeding. Strengthen the balancing loops that prevent collapse. Cut the destabilizing delays.

**Phase 2 — Improve.** Optimize within the current structure: information flows, parameters, flow rates.

**Phase 3 — Transform.** Redesign stock-flow structure, change goals, shift paradigms.

*Turnaround example:* (1) stop the cash burn and the churn-driving defects; (2) speed up deployment and customer feedback; (3) shift the operating goal from "ship features fast" to "solve customer problems sustainably."

Attempting Phase 3 during a Phase 1 crisis fails — the system has no slack to absorb a paradigm change.

---

## 7. Modeling Techniques

### Behavior Over Time (BOT) Graphs

Plot key variables against time before theorizing about structure. The shape of the curve constrains what structure can be producing it.

| Observed shape | Implied structure |
|---|---|
| Linear growth | Constant flow, no feedback |
| Exponential growth or decay | Dominant reinforcing loop |
| S-curve | Reinforcing loop meeting a limit |
| Oscillation | Balancing loop with a delay |
| Overshoot and collapse | Reinforcing growth + hard limit + delay + eroding resource base |
| Steady state | Balanced flows, or a strong balancing loop |

This is the most reliable diagnostic in systems work: **match the curve to the reference mode, infer the structure, then verify.** It runs the analysis backwards from evidence rather than forwards from assumption.

### Scenario Planning

1. Identify the key uncertainties — which exogenous variables could plausibly move a lot?
2. Build 2–4 scenarios from combinations of those uncertainties.
3. Map which loops dominate in each scenario — often different archetypes activate.
4. Design either a *robust* strategy (works across all scenarios) or an *adaptive* one (explicit pivot points with trigger conditions).

*Example:* High-demand scenario → Limits to Growth activates → invest in capacity ahead. Low-demand scenario → Eroding Goals activates → defend quality standards. Robust strategy: flexible capacity plus quality processes that scale both directions.

### Participatory Modeling

For multi-stakeholder systems where actors hold different paradigms:
1. Each stakeholder draws their own view of the system
2. Integrate into a unified map — the disagreements reveal the blind spots
3. Mark where loops conflict and where they align
4. Design interventions that work across views

The output is as much a shared mental model as a map, which is what makes the intervention stick.

---

## 8. Advanced Leverage Tactics

### Counterintuitive Interventions

**Slow down to speed up.** Reduce deployment frequency → time for quality → fewer rollbacks → faster net progress. A balancing loop strengthening a reinforcing one.

**Weaken feedback to enable change.** Reduce real-time monitoring during experimentation → tolerate failure → learning increases. Too-strong balancing loops prevent exploration.

**Add delay strategically.** A cooling-off period before decisions reduces impulsive action. Delay is usually harmful, but here it damps an oscillation.

**Reduce efficiency to increase resilience.** Slack capacity buffers shocks and speeds recovery. The "waste" raises long-run throughput. Systems run at 100% utilization have queue times approaching infinity.

### Adaptive Leverage

Leverage points move as the system evolves.

| Stage | Where leverage sits |
|---|---|
| Early | Goals and paradigms — defining what the thing is |
| Growth | Stock-flow structure — scaling the architecture |
| Maturity | Information and rules — optimizing operations |
| Decline | Goals — pivot or exit |

Re-run the leverage analysis periodically. Yesterday's high-leverage point is today's solved problem.

---

## 9. Pitfalls

**Paralysis by analysis** — *Fix:* time-box; start with 3–5 variables; iterate.

**Missing the dominant loop** — *Fix:* ask which single loop explains 80% of behavior; if you can't say, you haven't sized them.

**Ignoring paradigms** — *Fix:* ask "what belief has to be true for this structure to look sensible to the people inside it?"

**Overcomplicating** — *Fix:* a map nobody can hold in their head changes nothing. Add complexity only where it changes a decision.

**Confusing archetype with reality** — *Fix:* archetypes are lenses. Don't force-fit; note when nothing matches.

**Static thinking** — *Fix:* use BOT graphs; model how the structure itself evolves.

**Intervening without testing** — *Fix:* pilot small, instrument, adapt. Systems punish confident large moves.

**Modeling actors as passive** — *Fix:* the people in the system respond to your intervention. Assume adaptation, and check whether it turns your balancing loop into an escalation.
