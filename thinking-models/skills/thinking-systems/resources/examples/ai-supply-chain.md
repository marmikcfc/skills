# Worked Example — The AI Compute Supply Chain

A ten-tier system with physical constraints, multi-year delays, capital markets inside the loop, and no actor able to see the whole chain. This example demonstrates the full `large-systems.md` method.

> **Epistemic status.** This is a *structural* map. Every number below is illustrative, chosen to show the arithmetic of the method — orders of magnitude, ratio checks, constraint comparison — not to state current fact. Figures in this industry decay within months. **Before using this map for any decision, replace every number with a sourced, dated figure and re-run the constraint analysis.** The structure and the loops are durable; the numbers are not.

---

## Step 1: Tiers and Boundary

**Question being answered:** where is the binding constraint on AI compute deployment, where does it move next, and what would terminate the current investment cycle?

**Boundary**
- **Upstream limit:** primary energy and grid interconnect. Everything above that (fuel markets, mining) grows slowly and is treated as exogenous.
- **Downstream limit:** end-user and enterprise revenue for AI-delivered services — the point where someone pays for a benefit rather than for capacity. **This boundary is non-negotiable.** A map that stops at "hyperscaler capex" cannot distinguish demand from inventory build, and that distinction is the entire question.
- **Capital boundary:** capital markets are *inside* the system. Several tiers fund expansion from raises rather than operating cash flow, so the cost of capital is an endogenous variable.
- **Time horizon:** 3–7 years, set by the longest expansion lead time in the chain (grid interconnect).

**Tier stack** — *all figures illustrative*

| # | Tier | Operators | Concentration | Expansion lead time | Stock held here |
|---|---|---|---|---|---|
| 0 | Primary power + grid | Utilities, IPPs, grid operators | Regional monopolies | **3–7 yr** (interconnect) | Generation capacity, queue position |
| 1 | Semi capital equipment | A handful of toolmakers; EUV is single-source | **Extreme** | 12–24 mo | Tool backlog |
| 2 | Leading-edge fabrication | 2–3 credible operators | Extreme | **24–36 mo** | Wafer WIP, capacity |
| 3 | High-bandwidth memory | 3 suppliers | High | 12–24 mo | HBM inventory, qualified capacity |
| 4 | Advanced packaging | Foundries + OSATs | High | **12–18 mo** | Packaging throughput |
| 5 | Accelerator vendors | 1 dominant + challengers + in-house silicon | High | 6–12 mo (design-limited) | Die inventory, backlog |
| 6 | Systems / networking | ODMs, OEMs, optics, switching | Moderate | 6–12 mo | Rack inventory |
| 7 | Datacenter shell + power gear | Developers, colo, transformer/turbine makers | Moderate; **gear is tight** | **18–36 mo** | Shell capacity, gear backlog |
| 8 | Cloud + hosting operators | Hyperscalers, neoclouds | Moderate | Follows tier 7 | Installed base, contracted capacity |
| 9 | Model developers / inference | Frontier labs, open-weight ecosystem | Moderate | 3–9 mo per cycle | Model capability, serving capacity |
| 10 | Applications / end demand | Enterprises, consumers, developers | Fragmented | Continuous | **Paying users, contracted revenue** |

**Note the lead-time column.** It already tells you the answer to "where does the constraint end up": the tier that takes longest to expand will bind last and longest. Grid interconnect at 3–7 years is structurally the final constraint, and it sits outside the industry's control.

---

## Step 2: The Three Ledgers

### Ledger 1 — Physical (downstream)

```
energy → wafers → dies ─┐
                        ├→ packaged accelerators → systems → racks
        HBM ────────────┘                                      │
                                                               ▼
                                          shell + power + cooling → installed capacity
                                                               │
                                                               ▼
                                                   training runs + inference serving
```
Accumulates: WIP at each tier, channel inventory, **installed base**, retired units.
Delays: physical, 12–36 months per tier.

### Ledger 2 — Financial (upstream, plus injections)

```
end-user revenue → app cos → model labs → cloud operators → OEMs → vendors → packaging/HBM → fabs → equipment
        ▲                                                                                              │
        └───────────── capital markets inject at labs, neoclouds, DC developers, fabs ─────────────────┘
```
Accumulates: cash, receivables, purchase commitments, prepayments, debt, accumulated depreciation.
Delays: payment terms (weeks), revenue recognition (quarters), **depreciation (4–6 yr)**.

**The critical asymmetry:** capital injects in the *middle* of the chain (tiers 7–9), not at the end. Capacity can therefore be funded for years without tier-10 revenue justifying it. That is the structural precondition for an overbuild, and it's visible only once you draw Ledger 2 separately.

### Ledger 3 — Informational (upstream + through public expectation)

```
end demand signal → forecasts → orders → allocations → capacity commitments → announcements
                                                                    │
                                             public expectations ◀──┘
                                                    │
                                                    ▼
                                          valuations → cost of capital → funding
```
Accumulates: backlog, order book, announced-but-unbuilt capacity, belief.
Delays: **days to weeks** — one to two orders of magnitude faster than Ledger 1.

### Coupling Points to Watch

| Coupling | Pathology it enables |
|---|---|
| Ledger 3 orders → Ledger 1 capacity decisions | Bullwhip; capacity built for phantom demand |
| Ledger 3 announcements → Ledger 2 valuations | Reflexive funding of unbuilt capacity |
| Ledger 2 prepayments → Ledger 1 reserved capacity | Commitments that convert to write-downs on a demand turn |
| Ledger 1 installed base → Ledger 2 depreciation | The cost of the boom arrives years after the boom |

---

## Step 3: Actors and Incentives

| Actor | Optimizes for | Horizon | Can't see | Under stress |
|---|---|---|---|---|
| Fab operator | Utilization of a $B asset base | 5–10 yr | True end demand, 4 tiers away | Demands long-term commitments before expanding |
| HBM / packaging | Capacity allocation margin | 2–4 yr | Whether orders are duplicated | Allocates to biggest/most committed customer |
| Accelerator vendor | Share, ecosystem lock-in, margin | 1–3 yr | Which customer purchases are externally funded | Prioritizes strategic customers; secures supply early |
| Cloud operator | Market share of AI workloads | 3–5 yr | Competitors' true capacity plans | Over-orders to avoid being short; cancels late |
| Neocloud | Growth to justify next raise | 1–2 yr | Its own refinancing risk | Most fragile — dependent on external capital |
| Model lab | Frontier capability | 6–18 mo | Whether capability converts to willingness to pay | Raises more; compute spend is existential |
| Enterprise buyer | ROI on AI spend | 1–2 yr | Whether the capability will be cheaper in 12 months | Defers, waits for price declines |
| Capital allocator | Return vs. benchmark | Quarters | Aggregate capacity under construction | Herds — in and out |

**Horizon mismatch is the cycle generator.** Tier 2 commits on a 5–10 year view; tier 9 plans in 6-month cycles; tier 10 defers because it correctly expects prices to fall. Every actor is rational; the chain oscillates anyway.

**Concentration note:** at tiers 1–4 a single operator's decision *is* the system's behavior. There is no law of large numbers to smooth it.

---

## Step 4: Quantification and the Constraint

### Common Unit

Convert every tier to **accelerator-equivalents deployable per year**, then to **GW of IT load**, since power is the ultimate binding unit.

*Illustrative arithmetic — the method, not the answer:*

```
Tier 2 (fab):        wafer starts/yr × good dies/wafer × yield → A units/yr
Tier 3 (HBM):        HBM bit output/yr ÷ bits per accelerator  → B units/yr
Tier 4 (packaging):  packaging throughput/yr                   → C units/yr
Tier 7 (shell+power): GW available/yr ÷ kW per accelerator     → D units/yr
Tier 0 (grid):       new interconnect GW/yr ÷ kW per accelerator → E units/yr

Chain throughput = min(A, B, C, D, E)
```

State every conversion factor with its source. `bits per accelerator` and `kW per accelerator` both change generation to generation — they are assumptions wearing the costume of arithmetic, and errors there propagate into the constraint call.

### Derived Ratios That Carry the Signal

| Ratio | What it tells you |
|---|---|
| Capacity utilization at each tier | Which tier is queueing (→ near 1.0 at the constraint) |
| Demand growth ÷ capacity growth | Shortage persisting or glut approaching |
| Backlog ÷ quarterly shipments | Coverage — but see the double-ordering caveat |
| Capex ÷ depreciation, per tier | Asset base expanding or contracting; the turn leads earnings |
| Installed base ÷ annual retirement | The replacement floor under demand when growth stops |
| **Tier-10 revenue ÷ cumulative capex** | **The anchor ratio — see below** |
| Announced GW ÷ operational GW | The credibility discount on the pipeline |
| Revenue per deployed unit ÷ TCO per unit | Whether the buyer's return justifies the next purchase |

### The Anchor Ratio

The single most important number in this map: **end-user revenue (tier 10) versus cumulative capital deployed (tiers 5–8).**

Everything above tier 10 can be sustained by capital for years. Only tier 10 is exogenous to the investment loop. Track its growth rate against the capex growth rate:

- Tier-10 revenue growing **faster** than deployed capital → the buildout is being validated
- Growing **slower** for multiple periods → capacity is being funded by belief, and the reality-check loop (B5) is charging

This ratio is hard to measure and easy to skip, which is precisely why it's where the analytical edge is.

### Constraint Migration — The Central Dynamic

The observed sequence, and the structural reason for each hop:

```
Phase 1: accelerator die supply    → relieved by fab allocation           (~12 mo)
Phase 2: HBM + advanced packaging  → relieved by packaging capex          (~12–18 mo)
Phase 3: datacenter shell + power gear (transformers, turbines, cooling)  (~18–36 mo)
Phase 4: grid interconnect and generation                                  (3–7 yr)
```

Each relief moves the constraint *downstream and into slower-expanding tiers*. This is not accidental — capital flows fastest to the constraint, so the fastest-expanding constraints are relieved first, leaving the slow ones. **The terminal constraint is whichever tier has the longest lead time and the least capital-responsiveness.** Here that's grid interconnect, which is governed by permitting and regulated queues, not by willingness to pay.

**Analytical consequences:**
1. **Leverage sits at the current constraint.** Tier-5 interventions did nothing during Phase 3.
2. **Value capture migrates with the constraint** — and usually before consensus notices.
3. **Forecast the next constraint, not this one.** Capacity arriving at tier N lands into a tier N+1 bottleneck.
4. **The constraint eventually leaves the industry.** When it does, the industry's own capital cannot relieve it, and growth decouples from willingness to spend.

---

## Step 5: Loop Inventory

### Physical

**R1 — Capability flywheel** *(reinforcing, ~6–12 mo/turn)*
```
More compute →(+)→ more capable models →(+)→ more adoption →(+)→ more revenue →(+)→ more compute purchased
```
The engine. Runs until a balancing loop binds.

**B1 — Constraint brake** *(balancing, fast)*
```
Demand →(+)→ utilization →(+)→ lead times & prices →(−)→ realized deployment
```
The fastest brake. Currently binding at whichever tier Step 4 identified.

**B2 — Obsolescence** *(balancing, delay = useful life)*
```
Installed base →(+)→ age →(+)→ efficiency gap vs. new generation →(−)→ economic value of installed base
```
Sets the replacement floor — and if economic life is shorter than accounting life, quietly destroys returns while reported earnings look fine. Model economic life separately from the depreciation schedule.

**B3 — Efficiency** *(balancing on demand for units, reinforcing on demand for intelligence)*
```
Cost pressure →(+)→ algorithmic & hardware efficiency →(−)→ compute needed per unit of output
```
**Ambiguous sign, and it matters enormously.** If efficiency gains are captured as cost savings, unit demand falls. If they expand the set of economically viable applications faster than they cut per-unit consumption (Jevons), total demand *rises*. Which way this resolves is one of the two genuine uncertainties in the map. Track compute-per-useful-output and total compute consumed as separate series.

### Capital

**R2 — Profit to capacity** *(reinforcing, delay = build lead time)*
```
Revenue →(+)→ cash →(+)→ capex & prepayments →(+)→ capacity →(+)→ revenue
```

**B4 — Depreciation drag** *(balancing, delay 4–6 yr)*
```
Capex →(+)→ asset base →(+)→ depreciation charge →(−)→ reported margin →(−)→ investment appetite
```
The cost of the boom arrives years after the boom. Because of that lag, **the boom always overshoots** — the discipline signal is contractually scheduled to arrive too late.

**B5 — Buyer's return on capital** *(balancing, delay 1–2 investment cycles)*
```
Deployed capacity →(+)→ TCO to recover →(+)→ required revenue per unit
        →(−)→ [if unmet] further purchases
```
**This is the loop that terminates capex cycles.** Not competition, not technology — the buyer's inability to earn a return. Model it with the *buyer's* unit economics: revenue per deployed accelerator-year vs. its fully-loaded TCO (hardware amortization + power + cooling + shell + operations). Sellers systematically under-model this because it's not on their own P&L.

**R3 — Circular financing** *(reinforcing)*
```
Vendor/investor capital →(+)→ customer purchasing power →(+)→ vendor revenue
        →(+)→ vendor cash & valuation →(+)→ more capital deployed to customers
```
Inflates apparent demand. Size it rather than merely flagging it — see the NVIDIA example, §Circularity.

**B6 — Competitive entry** *(balancing, delay = entry lead time)*
```
High margin at the constrained tier →(+)→ entrants, custom silicon, substitutes →(+)→ capacity →(−)→ margin
```
Slow at technically hard tiers, which is exactly why margins persist there.

### Expectation

**R4 — Reflexive financing** *(reinforcing, fast)*
```
Results & announcements →(+)→ valuations →(−)→ cost of capital →(+)→ funded capacity →(+)→ results
```
Fast in both directions. It is why these systems turn down faster than they turned up.

**B7 — Reality check** *(balancing, dormant then abrupt)*
```
Cumulative capital deployed →(+)→ scrutiny of realized returns →(−)→ willingness to fund
```
Stays dormant while capital is abundant, then engages all at once. **Its trigger is the anchor ratio.**

### Dominance

| Question | Assessment method |
|---|---|
| Which loop dominates now? | R1 + R2 dominate while B1 binds physically. Compute the anchor ratio to test whether B5/B7 are charging. |
| What flips it? | Tier-10 revenue growth falling below deployed-capital growth for 2–3 periods; or buyer revenue/unit dropping below TCO/unit. |
| What to watch | The anchor ratio, buyer unit economics, and the announced-to-operational conversion rate. |

**State the dominance call explicitly with its threshold.** A map that says "there are growth loops and limiting loops" has said nothing.

---

## Step 6: Archetype Matches

| Archetype | How it appears here | Prediction |
|---|---|---|
| **Limits to Growth** | R1 growth meeting B1 physical constraint | Growth rate is set by the constraint tier's expansion rate, not by demand |
| **Growth and Underinvestment** | Power and grid under-invested relative to compute | Chronic shortage at tier 0/7; the investment case only becomes provable after the shortage bites |
| **Capacity Boom-Bust** | Many actors reading one signal through multi-year build delays | Synchronized arrival of capacity; utilization and price collapse together |
| **Double Ordering** | Allocation scarcity → orders placed at multiple suppliers | Aggregate backlog overstates demand; evaporates when supply catches up |
| **Bullwhip** | Ledger 3 in days, Ledger 1 in quarters | Upstream order volatility far exceeding end-demand volatility |
| **Success to the Successful** | Ecosystem lock-in at tier 5 | Share persists past technical parity; challengers lose on adoption, not specs |
| **Shifting the Burden** | Vendor financing substituting for end-customer revenue | Fundamental capability (tier-10 revenue) atrophies as a discipline |
| **Physical Limits to Growth** | Exponential compute against linear grid capacity | Constraint exits the industry into decade-scale infrastructure |
| **Reflexivity** | R4 funding capacity that produces the results funding it | No independent anchor except tier 10 |

---

## Step 7: Leverage, Scenarios, Monitoring

### Leverage Ranking

| Intervention | Level | Who holds it | Effect |
|---|---|---|---|
| Buy more accelerators | 12 | Operators | None if the constraint is downstream |
| Prepay to reserve packaging capacity | 11 | Vendors | Buffers *your* supply; doesn't raise chain throughput |
| Build capacity at the constraint tier | 10 | Constraint-tier operators | Raises throughput; migrates the constraint |
| Shorten permitting / interconnect queues | 9 | **Regulators** | Highest physical leverage; outside industry control |
| Publish aggregate capacity under construction | 6 | Industry bodies | Damps boom-bust by letting actors see the total |
| Share true end-demand signal across tiers | 6 | Operators + vendors | Damps bullwhip |
| Non-cancellable, deposit-backed orders | 5 | Vendors | Converts Ledger 3 noise into Ledger 2 signal |
| Disclose related-party / vendor-financed revenue | 5 | Regulators | Makes R3 measurable |
| Efficiency as an explicit design goal | 3 | Labs + vendors | Changes the demand slope — beats supply-side pushing against a hard limit |
| Shift the goal from capability to deployed value | 3 | Labs + capital | Re-anchors the system to tier 10 |

**For an analyst rather than an operator, the leverage is informational:** the highest-value work is measuring the anchor ratio, the circularity share, and the buyer's unit economics — the three quantities that determine when dominance flips and that the system's own reporting does not surface.

### Scenarios

| | Continuation | Constraint shift | Cycle turn |
|---|---|---|---|
| **Premise** | R1/R2 keep dominating; constraints relieved on schedule | Constraint moves to grid/power and stays | B5/B7 engage — returns don't justify capital |
| **Leading indicator** | Anchor ratio stable or rising | Utilization high at tier 7/0 while tiers 2–5 loosen | Anchor ratio falling 2–3 periods; buyer revenue/unit < TCO/unit |
| **Breaks first** | Nothing; growth rate-limited | Deployment timelines stretch; value migrates to power | Purchase commitments → write-downs; neoclouds refinance or fail |
| **Timing** | — | 2–4 yr | Triggered, not scheduled |

### Stress Tests

1. **Demand −30%:** inventory accumulates at tiers 5–6; purchase commitments at tiers 3–4 convert to write-downs; neoclouds (least capitalized, most dependent on external funding) fail first.
2. **Constraint relief at packaging:** throughput rises until tier 7 binds; margin migrates toward power and shell.
3. **Capital withdrawal:** actors funded by raises rather than operating cash stop immediately — identify exactly which tiers those are; that list *is* the fragility map.
4. **Credible substitute at tier 5:** scaling is limited by *its* tier 3–4 access, so share shifts far slower than benchmarks imply.
5. **Demand doubles:** maximum expansion rate is set by the longest lead time in the chain (interconnect, 3–7 yr), not by the fastest.

### Monitoring Set

| Indicator | Type | Why |
|---|---|---|
| Anchor ratio: tier-10 revenue ÷ cumulative capex | Leading | The dominance-flip trigger |
| Buyer revenue per deployed unit ÷ TCO per unit | Leading | Whether B5 is charging |
| Utilization by tier | Leading | Locates the constraint; catches migration |
| Announced ÷ operational capacity | Leading | Ledger 3 → Ledger 1 credibility |
| Backlog coverage + cancellation terms | Leading | Distinguishes demand from double-ordering |
| Inventory position by tier | Leading | Accumulation *downstream* of the constraint = demand softening |
| Capex ÷ depreciation by tier | Leading | The turn precedes the earnings turn |
| Grid interconnect queue and approval times | Leading | The terminal constraint |
| Pricing and margin by tier | Lagging | Confirms where the constraint sits |

### Falsifiers

This map is wrong if:
- Deployment growth persistently **exceeds** the constraint tier's expansion rate → a tier is mis-sized, or a substitution path exists that isn't drawn
- Tier-10 revenue grows well **ahead** of deployed capital → this is not a capital-driven overbuild and B5/B7 are not the operative risk
- Margin **stays** at a tier after its constraint is relieved → lock-in (level 4/5) matters more than constraint economics here, and the value-migration logic doesn't hold
- Efficiency gains **reduce** total compute consumed → B3 is balancing rather than reinforcing, which changes the growth path fundamentally

---

## Transferable Lessons

1. **The boundary must reach genuine end demand.** Every tier above it can be funded by capital; only tier 10 is exogenous to the investment loop.
2. **Lead times determine the terminal constraint.** Sort your tier table by expansion lead time and you have the constraint sequence before doing any other analysis.
3. **Constraints migrate, so leverage migrates.** Re-run the analysis every time capacity lands.
4. **Find the anchor ratio.** In any reflexive system, identify the one quantity generated *outside* the loop and track it against the loop's growth. That comparison is the analysis.
5. **The terminating loop is the buyer's return on capital**, not competition or technology — and it operates with a delay of one to two investment cycles, which is why the overshoot is structural rather than foolish.
6. **Ambiguous-sign loops deserve explicit uncertainty.** B3 (efficiency) can balance or reinforce. Say so, give both branches, and state the observable that distinguishes them.
