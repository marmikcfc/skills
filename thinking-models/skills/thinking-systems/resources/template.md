# Systems Map Template

Fill-in worksheet for simple to moderate systems: roughly 3–10 variables, one organization or codebase, a handful of loops. For multi-firm, multi-tier or capital-heavy systems, use `large-systems.md` instead — it supersedes sections 1–3 here.

## Workflow

```
Template Progress:
- [ ] Step 1: Define boundary and variables
- [ ] Step 2: Draw the causal loop diagram
- [ ] Step 3: Analyze stocks, flows and delays
- [ ] Step 4: Size the loops
- [ ] Step 5: Rank leverage points
- [ ] Step 6: Design intervention and check quality
```

---

## 1. System Definition

### System Boundary

**Inside the system** (components you're analyzing and can influence):

> [List key components, actors, processes within scope]

**Outside the system** (external forces you can't control but that drive the system):

> [List external factors and constraints]

**Why this boundary?**

> [Pragmatic rationale — what makes this a useful scope for *intervention*?]

**Boundary check:** does the loop that produces the symptom close entirely inside your boundary? If it closes through something you placed outside, either widen the boundary or accept that you are treating a symptom.

### Key Variables

**Stocks** — accumulations, nouns, measured at a point in time:

| Stock | Current level | Unit | Why it matters |
|---|---|---|---|
| e.g. Bug backlog | 340 | issues | Drives firefighting load |
| e.g. Technical debt | ~High | est. eng-weeks | Slows every future change |
| | | | |

**Flows** — rates, verbs, measured per unit time:

| Flow | Current rate | Unit | Changes which stock | Direction |
|---|---|---|---|---|
| e.g. Bug introduction | 30 | issues/sprint | Bug backlog | Inflow ↑ |
| e.g. Bug resolution | 22 | issues/sprint | Bug backlog | Outflow ↓ |
| | | | | |

**Net change per period:** [inflow − outflow, per stock]. If non-zero, the stock is on a trajectory — say where it lands and when.

**System goals:**
- Stated goal: [what it claims to optimize]
- Revealed goal: [what the incentives actually optimize]
- Whose goals dominate: [which stakeholder's objective wins when they conflict]

The gap between stated and revealed goal is often the whole problem.

### Time Horizon

**Analysis timeframe:** [weeks–months / quarters–year / years]

**Why:** [what you're trying to influence within this period]

**Loops excluded by this horizon:** [any loop whose delay exceeds your horizon — name it, so you know what you're ignoring]

### Problem Statement

**Symptom** (observable, with a metric):

> [e.g. "Deploy failure rate rose from 4% to 18% over two quarters"]

**Pattern** (behavior over time, not a single event):

> [e.g. "Each hardening push drops it to ~6% for a month, then it climbs back"]

**Hypothesis** (a loop that would produce that pattern):

> [e.g. "Failures → hardening sprint → feature work delayed → pressure to ship → checks skipped → failures"]

---

## 2. Causal Loop Diagram

### Loops Identified

**Reinforcing Loop R1: [name]**

```
[A] --(+)--> [B] --(+)--> [C] --(+)--> [A]
```

- **Description:** [what it amplifies]
- **Negative links:** [count — must be even for R]
- **Effect if dominant:** [growth or collapse, and toward what]
- **Loop time:** [how long for one full cycle]

*Example:* `Engaged engineers →(+)→ Code quality →(+)→ Fewer incidents →(+)→ Time for craft →(+)→ Engaged engineers` — virtuous cycle, ~2 quarters per turn.

**Balancing Loop B1: [name]**

```
[A] --(+)--> [Gap vs. goal] --(+)--> [Corrective action] --(−)--> [A]
```

- **Description:** [what it resists, what goal it defends]
- **Negative links:** [count — must be odd for B]
- **Goal it seeks:** [the target level it stabilizes around]
- **Loop time incl. delay:** [how long before the correction lands]

*Example:* `Workload →(+)→ Stress →(+)→ Sick days →(−)→ Workload` — stabilizes, but at a bad equilibrium.

Add R2, B2, … as needed. Most real systems need at least one R and one B; a map with only R loops is missing the limit, and a map with only B loops can't explain growth.

### Diagram

**Notation:**
- `→` with `+` — same direction (A up → B up)
- `→` with `−` — opposite direction (A up → B down)
- `R#` / `B#` — reinforcing / balancing loop labels
- `[~~ 3mo ]` — a delay, with its length

```
        +
    A -----> B
    ^        |
    |        | +
    |        v
    +        C
    |        |
    |        | −  [~~ 3mo ]
    |        v
    D <----- E

R1: A → B → C → A     (reinforcing, ~6wk/turn)
B1: C → E → D → A     (balancing, ~3mo delay)
```

**Your diagram:**

```
[Draw here]
```

### Loop Interaction

| Loop pair | Relationship | Which dominates now | What flips it |
|---|---|---|---|
| R1 vs B1 | conflict / synergy | [R1 or B1] | [threshold or trigger] |
| | | | |

---

## 3. Stock-Flow Analysis

For each major stock:

**Stock: [name]** — current level [X] [unit]

**Inflows:** [name] at [rate/period] · [name] at [rate/period]
**Outflows:** [name] at [rate/period] · [name] at [rate/period]

**Net:** [+/− per period] → **State:** accumulating / depleting / stable

**Residence time** = stock ÷ outflow = [X] [time units]
*This is how long a unit sits in the stock, and therefore the minimum delay this stock imposes on the system.*

**Delays:**
- From [action] to [stock change]: [quantified lag] — type: [physical / information / decision / perception]

**Trajectory:** [at the current net rate, where is this in 1 / 3 / 12 periods?]

**Implication:** [what breaks when it gets there]

*Worked example — technical debt.* Inflows: quick fixes 20/sprint + shortcut features 10/sprint = 30/sprint. Outflows: refactoring 5/sprint + root-cause fixes 3/sprint = 8/sprint. Net +22/sprint, accumulating. Residence time = 400 ÷ 8 = 50 sprints — debt effectively never leaves. In 6 months debt slows delivery ~50%, which increases quick-fix pressure, closing R1.

---

## 4. Sizing the Loops

Before ranking interventions, establish which loop actually runs the system.

| Loop | Gain per turn | Turn time | Effective strength | Dominant? |
|---|---|---|---|---|
| R1 | [e.g. ×1.3] | [6 wk] | [high] | yes |
| B1 | [e.g. −15%] | [3 mo, delayed] | [medium, lagging] | not yet |

**Dominance call:** [which loop explains ~80% of the observed behavior, and why]

**Flip threshold:** [the condition under which the other loop takes over — this becomes a monitoring indicator]

**Confidence:** [high / medium / low] — [what you'd need to measure to raise it]

---

## 5. Leverage Point Ranking

### Candidate Interventions

List every place you could intervene, not just the first idea.

| Intervention | Which loop it changes | Mechanism | Level (1–12) | Feasibility | Expected impact |
|---|---|---|---|---|---|
| | | | | H/M/L | H/M/L |
| | | | | | |
| | | | | | |
| | | | | | |

**Meadows' hierarchy for classification:**

| Level | Point | | Level | Point |
|---|---|---|---|---|
| 12 | Parameters *(weakest)* | | 6 | Information flows |
| 11 | Buffers | | 5 | Rules |
| 10 | Stock-flow structure | | 4 | Self-organization |
| 9 | Delays | | 3 | Goals |
| 8 | Balancing loop strength | | 2 | Paradigms |
| 7 | Reinforcing loop strength | | 1 | Transcending paradigms *(strongest)* |

### Recommended

**Primary intervention: [name]**
- **Level:** [1–12] — [why it's that level, not a neighboring one]
- **Mechanism:** [which loop, strengthened/weakened/redirected, and how]
- **Why higher leverage than the alternatives:** [reasoning]
- **Resistance:** [who pushes back, through which loop]
- **Time to visible impact:** [accounting for the delays you quantified]
- **Success metrics:** leading — [x]; lagging — [y]

**Supporting intervention 1: [name]** — level [n], complements primary by [how]

**Supporting intervention 2: [name]** — level [n], complements primary by [how]

### Deprioritized

| Intervention | Level | Why it's low leverage | Better alternative |
|---|---|---|---|
| e.g. +10% budget | 12 — parameter | Temporary; competitors match | Change the hiring goal from "fill seats" to "build capability" |
| | | | |

---

## 6. Intervention Strategy

**Sequencing:**
1. [action, timing]
2. [action, timing]
3. [action, timing]

**Rationale:** [why this order — what depends on what]

**Predicted outcomes:**
- Short-term (1–3 mo): [which loops activate; will it get worse before better?]
- Medium-term (3–12 mo): [momentum, delays completing, resistance emerging]
- Long-term (1+ yr): [new equilibrium, new limits]

**Risks and unintended consequences:**

| Risk | Mechanism (which loop) | Likelihood | Mitigation |
|---|---|---|---|
| | | H/M/L | |
| | | | |

**Monitoring:**
- Check-in cadence: [weekly / monthly / quarterly]
- Watch: [stock levels] · [flow rates] · [dominance-flip thresholds] · [resistance signals]
- Adaptation triggers: [conditions under which you change course]
- **Falsifiers:** [what observation would show this map is wrong?]

---

## Quality Checklist

**Definition**
- [ ] Boundary stated with rationale; symptom-producing loop closes inside it
- [ ] Stocks (nouns) and flows (verbs) distinguished, each with a unit
- [ ] Net change computed per stock
- [ ] Stated vs. revealed goal compared
- [ ] Time horizon set; loops excluded by it are named

**Loops**
- [ ] At least one R and one B loop
- [ ] Polarity marked on every link; negative-link count matches loop type
- [ ] Loops labeled and named
- [ ] Delays quantified and typed
- [ ] Loop interactions mapped, not loops in isolation

**Stocks and flows**
- [ ] Inflows and outflows listed for each major stock
- [ ] Residence times computed
- [ ] Trajectories projected
- [ ] Map conserves — nothing appears or vanishes

**Sizing**
- [ ] Dominant loop identified with reasoning
- [ ] Flip threshold stated
- [ ] Confidence stated

**Leverage**
- [ ] Multiple candidates, not just the first idea
- [ ] Each classified 1–12 with rationale
- [ ] Primary is level 1–7, or the reason it can't be is stated
- [ ] Feasibility vs. leverage traded off explicitly
- [ ] Each intervention linked to a specific loop and mechanism

**Strategy**
- [ ] Outcomes derived from loop dynamics, not optimism
- [ ] Delays reflected in the timeline
- [ ] Second-order effects traced through other loops
- [ ] Resistance named with its mechanism
- [ ] Leading and lagging indicators separated
- [ ] Falsifiers stated

**Minimum standard:** score with `evaluators/rubric_systems_thinking_leverage.json`. Average ≥ 3.5/5, and no critical criterion below 3.

---

## Common Mistakes

**Treating symptoms, not structure** — "add more people" (level 12) instead of "eliminate the low-value work" (level 3/5). *Fix:* for every symptom ask "what loop produces this?"

**Ignoring delays** — "we tried it for two weeks and it didn't work" when the mechanism takes two quarters. *Fix:* quantify the delay first, then set the review date after it.

**Single-loop thinking** — seeing growth (R) and missing the limit (B), or vice versa. *Fix:* every R hits a B eventually. Find it before it finds you.

**Stock/flow confusion** — "morale is flowing", "our run-rate is $4B" treated as a level. *Fix:* stocks are levels at a point in time; flows are rates per period. An annualized run-rate is a flow, not a stock.

**Unsized loops** — two opposing loops drawn, no statement of which wins. *Fix:* Step 4 is not optional once money or capacity is involved.

**Low-leverage defaults** — tweaking parameters when goals or rules need changing. *Fix:* classify 1–12 and justify anything above 8.

**Unexamined second-order effects** — "speed up releases" → tech debt → slower releases. *Fix:* trace every intervention through every other loop on the map.
