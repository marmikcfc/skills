# Mapping Large Systems

Supply chains, capital cycles, markets, industries, national infrastructure. Systems with many firms, physical constraints, money moving in the opposite direction to goods, and capital markets in the loop.

Use this instead of `template.md` sections 1–3 when the system qualifies. Everything in `methodology.md` still applies on top.

## When a System Is "Large"

Any two of these and you're here:

- **Three or more tiers of independent actors** with their own objectives (supplier → manufacturer → integrator → operator → end customer)
- **Money and material move in opposite directions** along the same chain
- **Physical constraints bind** — fab capacity, packaging throughput, grid interconnect, rare inputs, land, water
- **Capital markets are inside the loop** — valuation affects the ability to raise, which affects capacity, which affects the results that drive valuation
- **Delays exceed one year** at some tier, so the system is always responding to conditions that no longer hold
- **No single actor sees the whole chain**, so decisions are locally rational and globally destructive

## Workflow

```
Large System Mapping Progress:
- [ ] Step 1: Define tiers and boundary
- [ ] Step 2: Map the three ledgers
- [ ] Step 3: Map actors and incentives
- [ ] Step 4: Quantify each tier and find the constraint
- [ ] Step 5: Identify loops (physical, capital, expectation)
- [ ] Step 6: Match to industrial archetypes
- [ ] Step 7: Rank leverage and build the monitoring set
```

---

## 1. Tiers and Boundary

### Build the Tier Stack

List the chain from primary input to end demand. For each tier, name who operates it. Be concrete — "compute" is not a tier, "advanced packaging (CoWoS-class)" is.

```
Tier 0   Primary inputs        energy, minerals, water, land
Tier 1   Capital equipment     lithography, deposition, test
Tier 2   Fabrication           leading-edge wafer capacity
Tier 3   Specialized inputs    HBM, substrates, optics
Tier 4   Assembly              advanced packaging, integration
Tier 5   Product               accelerators, systems
Tier 6   Integration           OEM/ODM racks, networking
Tier 7   Deployment            datacenter shell, power, cooling
Tier 8   Operation             cloud and hosting operators
Tier 9   Consumption           model developers, inference serving
Tier 10  End demand            applications, users, willingness to pay
```

For each tier, record five things:

| Field | Question |
|---|---|
| **Operators** | Who runs this tier? How concentrated? |
| **Capacity** | Throughput per period, in this tier's native unit |
| **Lead time to expand** | How long from decision to added capacity? |
| **Stock held here** | Inventory, backlog, installed base, work in progress |
| **Margin / take rate** | What share of chain value is captured here, and why? |

The margin column matters more than it looks: **value concentrates at whichever tier is most constrained and least substitutable.** Track how that has moved historically and you have a leading indicator for where it moves next.

### Boundary at Scale

Three boundary decisions dominate the analysis:

1. **How far upstream?** Stop where the input becomes genuinely commodity and unconstrained. If a tier can double output within your time horizon, it's exogenous.
2. **How far downstream?** You must reach actual end demand — the point where someone pays for a final benefit rather than for capacity. Chains that stop at an intermediate buyer can't distinguish real demand from inventory build.
3. **Where does the capital boundary sit?** If the actors' investment decisions depend on their ability to raise, capital markets are inside your system, not outside it.

**The most common large-system error:** drawing the boundary around one firm. The loop governing that firm's revenue usually closes through its customers' customers' economics. A firm-level map produces a firm-level story and misses the cycle entirely.

---

## 2. The Three Ledgers

A large system is three superimposed networks. They share nodes, run in different directions, and — critically — have **different delays**. Most industrial pathologies live in the mismatch.

### Ledger 1 — Physical

**Direction:** upstream → downstream. **Unit:** things per period.

What moves: wafers, dies, modules, racks, megawatts, units installed.
What accumulates: work in progress, inventory at each tier, installed base.
**Delay driver:** cycle time and lead time. Slow, and largely fixed by physics and construction.

### Ledger 2 — Financial

**Direction:** downstream → upstream (payment), plus injections from capital markets. **Unit:** currency per period, and currency held.

What moves: revenue, cost of goods, capex, prepayments, dividends, buybacks, equity and debt raises.
What accumulates: cash, receivables, payables, purchase commitments, debt, accumulated depreciation.
**Delay driver:** payment terms, revenue recognition, depreciation schedules. Medium speed, set by contract and accounting rules — which means it's a *rules-level* lever, not a physical one.

### Ledger 3 — Informational

**Direction:** mostly downstream → upstream, but it also loops through public expectations. **Unit:** orders, forecasts, guidance, prices, sentiment.

What moves: orders, forecasts, backlog signals, price signals, guidance, analyst expectations.
What accumulates: backlog, order book, committed capacity, belief.
**Delay driver:** reporting cadence and perception. **Fastest of the three ledgers, and the least accurate** — which is exactly why it destabilizes the other two.

### Why Separating Them Matters

| Pathology | Mechanism |
|---|---|
| **Bullwhip** | Ledger 3 moves in days; Ledger 1 responds over quarters. Small end-demand changes amplify into large upstream order swings. |
| **Phantom demand** | An order in Ledger 3 is not a unit in Ledger 1 and not cash in Ledger 2. Double-ordering across suppliers inflates the order book without inflating demand. |
| **Margin without cash** | Ledger 2 revenue recognized while Ledger 1 goods sit in channel inventory and Ledger 2 cash hasn't arrived. Growth on paper, strain in fact. |
| **Circular revenue** | Ledger 2 flows out to a customer and returns as that customer's purchase. The chain looks like demand; it's the same money going in a circle. |
| **Capacity overbuild** | Ledger 3 backlog is read as Ledger 1 demand, capacity is built for it, and the backlog was double-counted. |

**Practical rule:** draw the three ledgers as three separate diagrams over the *same* tier stack, then explicitly mark every point where they couple. The coupling points are where the interesting loops close.

---

## 3. Actors and Incentives

Large systems are not mechanisms; they're populations of optimizers. Model each actor's objective, because your intervention changes their payoff and they will respond.

| Actor | Optimizes for | Time horizon | Can't see | Behavior under stress |
|---|---|---|---|---|
| | | | | |

- **Optimizes for** — the revealed objective, not the stated one.
- **Time horizon** — mismatched horizons across tiers create the cycle. A tier with a 3-year build time and a customer with a 3-month planning cycle will always be wrong.
- **Can't see** — information asymmetry is where level-6 leverage lives.
- **Under stress** — what they do when squeezed. This is where escalation, double-ordering, hoarding and order cancellation come from, and it's what turns a slowdown into a bust.

**Concentration check.** For each tier, ask: how many suppliers, how many buyers? A tier with one supplier and many buyers behaves nothing like a tier with many of both. Note where a single actor's decision *is* the system's behavior.

---

## 4. Quantification and the Constraint

### Unit Discipline

Every tier gets a capacity in its native unit, plus a conversion to a **common downstream unit** so tiers are comparable. Pick the unit the end customer actually buys — deployed compute, delivered megawatts, units in service.

```
Tier capacity (native)  →  conversion factor  →  capacity in common unit
2.4M wafer starts/yr    →  ~X dies/wafer × yield  →  Y accelerators/yr equivalent
```

State every conversion factor explicitly with its source. Conversion factors are where errors hide, because they look like arithmetic and are actually assumptions.

### The Numbers Table

Every stock and flow in the map goes in one table:

| Item | Type | Value | Unit | Basis | Confidence | As of |
|---|---|---|---|---|---|---|
| | stock/flow | | | how derived | H/M/L | date |

**Non-negotiable columns:** basis, confidence, and date. Numbers in fast-moving industrial systems decay in months. An undated figure is a liability — it will be reused long after it's false. If you are estimating rather than sourcing, say so in the basis column and mark confidence Low.

### Derived Quantities

Compute these; they carry more signal than the raw levels:

- **Residence time** = stock ÷ outflow. How long inventory sits, how long a unit stays in service. Sets the delay each stock imposes.
- **Coverage** = stock ÷ consumption rate. Months of inventory, years of reserve, quarters of backlog.
- **Capacity utilization** = throughput ÷ capacity. Approaching 1.0 means queueing and price power; well below means a glut is arriving.
- **Growth vs. capacity growth** = demand growth rate ÷ capacity growth rate. Above 1 for long means shortage; below means the bust is scheduled.
- **Capex ÷ depreciation.** Above 1 means the asset base is expanding; the ratio's *turn* leads the earnings turn by roughly the depreciation life.
- **Backlog ÷ quarterly revenue.** Rising backlog coverage means either genuine demand or double-ordering. It cannot tell you which — pair it with a cancellation-terms check.
- **Replacement cycle** = installed base ÷ annual retirement. Determines the floor under demand once growth stops.

### Conservation Checks

Your map is wrong if it leaks. Verify:

- **Units:** produced = installed + in channel inventory + retired. Anything unaccounted is an error or a hidden stock.
- **Money:** what leaves one actor arrives at another. Follow it all the way; if it vanishes, you're missing a node.
- **Capacity:** downstream throughput cannot exceed upstream throughput for long. Persistent excess means you've mis-sized a tier or missed an inventory drawdown.

### Finding the Binding Constraint

Chain throughput = **min(capacity across all tiers)**, converted to the common unit.

Method:
1. Convert every tier's capacity to the common unit
2. The smallest is the binding constraint
3. Verify with symptoms: the constraint tier runs near 100% utilization, holds pricing power, has a queue in front of it, and is the tier everyone complains about
4. Check that inventory accumulates *upstream* of it and starvation appears *downstream*

**Constraint migration.** This is the single most important dynamic in a supply chain, and it's why static maps go stale:

```
Relieve constraint at tier N → throughput rises → the next-smallest tier binds
→ value and pricing power migrate to tier N+1 → capital chases tier N+1
→ tier N+1 expands → constraint migrates again
```

Consequences for your analysis:
- **Leverage sits at the current constraint.** Interventions anywhere else are invisible.
- **Value capture follows the constraint.** Margin migrates with it, usually before the market notices.
- **Forecast the next constraint**, not the current one. By the time capacity arrives at tier N, the problem is at N+1. The tier with the longest expansion lead time (grid interconnect, new fabs) is the favorite to bind last and longest.
- **Re-run the constraint analysis every time capacity lands.**

---

## 5. Loops in Large Systems

Three families. Map all three; a physical-only map cannot explain a capital cycle.

### Physical Loops

**R — Capacity begets capability:** more installed capacity → better product/service → more demand → more investment → more capacity. Delay: the expansion lead time.

**B — Constraint:** demand → utilization approaching capacity → lead times stretch and prices rise → demand rationed. Delay: short, this is the fastest brake in the system.

**B — Obsolescence and retirement:** installed base ages → efficiency falls behind new generations → retirement or relegation. Delay: the useful life. This loop sets the replacement floor and is usually mis-modeled — assumed lives are an assumption, not an observation.

### Capital Loops

**R — Profit to capacity:** revenue → cash → capex and supplier prepayments → capacity → revenue. Delay: capex lead time plus the depreciation schedule. This is the engine of every industrial boom.

**B — Depreciation drag:** capex → asset base → depreciation charge → reported margin falls → investment appetite falls. Delay: the depreciation life. Because the drag arrives *years* after the spend, the boom always overshoots.

**B — Customer return on capital:** customer buys capacity → must earn a return on it → if realized revenue per unit of deployed capacity falls below total cost of ownership, purchasing stops. **This is the loop that terminates capex booms**, and it operates with a delay of one to two investment cycles. Model it explicitly by computing the customer's unit economics, not the seller's.

**R — Circular / vendor financing:** supplier invests in or extends credit to customers → customers buy the supplier's product → supplier books revenue → funds more investment. Reinforcing, and it inflates apparent demand. See §6.

**B — Competitive entry:** high margin at the constrained tier → attracts entrants and substitutes → capacity added → margin compresses. Delay: the entry lead time, which at a technically hard tier can be many years — which is exactly why margins persist there.

### Expectation Loops (Reflexivity)

The loop that runs through belief. Expectations are not merely a readout of the system; they change it.

**R — Reflexive financing:** results beat expectations → valuation rises → cost of capital falls → more capacity funded → more results. And symmetrically in reverse, which is why these systems turn faster on the way down.

**R — Narrative to allocation:** a compelling story → capital allocation → visible activity → the story is confirmed → more capital. Activity is not the same as return, and this loop cannot distinguish them.

**B — Reality check:** eventually realized cash flows are compared to the capital deployed. Delay: long — as long as capital is available, this loop stays dormant. When it engages, it engages fast.

**Practical marker:** whenever you draw an expectation loop, mark what would make it engage the reality check. That trigger is your most valuable monitoring indicator.

---

## 6. Capital Structures Worth Modeling Explicitly

### Circular Financing

**Structure:** Supplier S invests in (or lends to, or takes equity in, or guarantees leases for) customer C. C uses the funds to buy S's product. S books revenue and reports demand growth.

**Why it's a reinforcing loop:** revenue → cash and valuation → capacity to invest more → more customer purchasing power → more revenue.

**Why it's dangerous:** it decouples reported demand from *independently funded* demand. The loop can sustain itself as long as S's cash and valuation hold, and it unwinds abruptly when either falls, because C had no independent funding source.

**How to analyze it — do not just flag it, size it:**

1. **Separate the demand into three buckets:** funded by the supplier, funded by third-party capital, funded by end-customer cash flow. Estimate each as a share of revenue.
2. **Compute the circularity ratio:** supplier-funded purchases ÷ total revenue. Track its trend, which matters more than its level.
3. **Trace how many hops the circle takes.** A one-hop circle (S funds C, C buys from S) is visible. A three-hop circle routed through an intermediary, a leasing vehicle or a joint venture is the same structure and much harder to see. Follow the money to where it originates outside the system.
4. **Test the unwind:** if S stopped all customer investment tomorrow, what share of revenue would persist? That's the unfunded base.
5. **Watch for the accounting boundary:** consolidated? equity method? off balance sheet? The structure's economics are identical regardless; only the visibility changes.

**Archetype match:** Shifting the Burden. Supplier financing is the symptomatic solution to the customer's funding gap; the fundamental solution is customers generating enough end-user revenue to self-fund. Every period the symptomatic solution runs, the fundamental capability looks less necessary — until it's needed.

### Capex, Depreciation and the Cycle

The capex → depreciation delay is why capital-intensive industries oscillate.

```
Demand signal → capex commitment → [build delay 1–3 yr] → capacity online
    → supply exceeds demand → prices fall
    → meanwhile depreciation from the boom-era capex [4–6 yr] hits the P&L
    → reported margins collapse → capex cut hard → [build delay]
    → shortage returns
```

**Model explicitly:**
- Useful life assumed vs. useful life observed. Optimistic lives flatter current earnings and defer the drag; a change in assumed life is a signal worth tracking on its own.
- The gap between cash capex (now) and the depreciation charge (spread over years). A business growing capex faster than depreciation shows better earnings than cash — sustainable while growing, painful when growth stops.
- Whether the asset's *economic* life matches its accounting life. In fast-moving technology, obsolescence usually beats wear, and the economic life is shorter than the schedule assumes.

### Working Capital and Commitments

Often the earliest visible signal, because it moves before revenue does:

- **Inventory** by tier — where in the chain is it accumulating? Accumulation upstream of the constraint is normal; accumulation *downstream* means demand is softening.
- **Days of inventory** and its trend — compare to the shipping lead time; excess is unsold, not in transit.
- **Receivables and concentration** — who owes, and can they pay? Concentration means a customer-level risk is a system-level risk.
- **Purchase commitments and supply prepayments** — capacity locked in ahead of demand. This is a *bet on a forecast*. If demand softens, it converts to write-downs, and it is the mechanism that turns a demand slowdown into a reported loss.
- **Channel vs. end inventory** — units sold into the channel are revenue for the seller and inventory for someone else. If you only count sell-in, you will miss a demand turn entirely.

### Backlog Discipline

Backlog is the most-abused number in large-system analysis.

Before using it, establish:
- **Cancellable or not?** Non-cancellable backlog is close to demand. Cancellable backlog is closer to sentiment.
- **Deposit-backed?** Money committed is a far stronger signal than intent.
- **Duplicate-adjusted?** Under shortage, buyers order the same unit from multiple suppliers and cancel the losers. Aggregate industry backlog then exceeds real demand, sometimes by a lot.
- **Dated?** Backlog stretching over multiple years is not comparable to backlog inside one quarter.

**Never treat backlog as demand.** Treat it as a Ledger 3 quantity with its own inflation dynamics, and cross-check against Ledger 1 (units actually shipped and installed) and Ledger 2 (cash received).

---

## 7. Data Discipline

Large-system maps fail on data quality more often than on structure.

- **Date every number.** In fast-moving industries a six-month-old capacity figure can be off by a large multiple.
- **Separate sourced from estimated.** Mark each. Never let a Fermi estimate acquire the authority of a reported figure through repetition.
- **Prefer physical units over currency** where possible. Currency figures blend price and volume; physical units don't, and the two often move in opposite directions.
- **Distinguish announced from operational.** Announced capacity, planned datacenters and signed agreements are Ledger 3. They become Ledger 1 only on delivery, at a historically variable conversion rate. Track the announcement-to-operational ratio itself.
- **Check whether an actor's incentive shapes the number** they publish. Capacity and backlog figures are frequently strategic communications.
- **State the error bars that matter.** Some numbers can be off 2x without changing the conclusion; others flip it at ±10%. Say which is which, and spend your accuracy budget on the second kind.

---

## 8. Industrial and Market Archetypes

These supplement the ten general archetypes in `methodology.md` §2.

### Bullwhip

**Pattern:** Small variation in end demand amplifies into progressively larger order swings upstream.

**Mechanism:** Each tier orders to cover expected demand *plus* safety stock *plus* pipeline fill, and each responds to its immediate customer's orders rather than to end demand. The delays compound the error.

**Signature:** Upstream order volatility several times end-demand volatility; alternating shortage and glut.

**Leverage:** (6) Share true end-demand data across tiers. (9) Shorten the information delay. (5) Change the ordering rule to smooth rather than chase.

### Capacity Boom-Bust

**Pattern:** Shortage → high prices → everyone invests → capacity arrives simultaneously after the build delay → glut → prices collapse → investment stops → shortage returns.

**Mechanism:** A long build delay plus many actors independently reading the same signal. Nobody is irrational; the structure is.

**Signature:** Synchronized capacity announcements; utilization and price moving together and then collapsing together.

**Leverage:** (9) Reduce the build delay. (6) Publish aggregate capacity-under-construction so actors can see the total, not just their own. (5) Commit capital against end demand, not against price.

### Double Ordering / Phantom Demand

**Pattern:** Under allocation, buyers order more than they need from multiple suppliers, expecting partial fills. Aggregate order books exceed real demand. When supply catches up, orders evaporate.

**Signature:** Industry backlog growing faster than any plausible end-demand growth; lead times stretching without a matching rise in end consumption.

**Leverage:** (5) Deposits and non-cancellable terms. (6) Allocation based on verified historical consumption. Analytically: always cross-check backlog against end-demand growth.

### Circular Financing

Covered in §6. **Signature:** the supplier's investing cash flow correlating with its own revenue growth; customer concentration rising alongside supplier-provided funding.

**Leverage:** analytically, separate funded from unfunded demand and track the ratio; structurally, (6) disclosure of related-party revenue.

### Commoditize Your Complement

**Pattern:** An actor drives the price of a complementary good toward zero because demand for its own product rises as the complement gets cheaper.

**Signature:** A well-funded actor giving away something others sell.

**Leverage:** for the complement's producer, differentiate or move to the constrained tier. For the analyst, expect margins in commoditized complements to compress regardless of demand growth.

### Standards Lock-In

**Pattern:** An ecosystem forms around one interface → tooling, skills and code accumulate → switching cost rises → the standard's owner captures value disproportionate to its technical lead.

Reinforcing, with the accumulated *stock* of tooling and expertise as the moat — which is why the lead outlives technical parity by years.

**Signature:** Competitors matching on hardware specs while losing on adoption.

**Leverage:** (4/5) Open interfaces and portability layers erode the switching-cost stock — slowly, because you're draining a stock, not changing a flow.

### Physical Limits to Growth

**Pattern:** An exponential digital or economic process hits a physical input that grows linearly at best — power generation, grid interconnect, water, land, skilled labor.

**Signature:** The constraint migrating out of the industry entirely and into infrastructure with decade-scale lead times and non-market permitting processes.

**Leverage:** anticipate it far earlier than feels reasonable — the lead time on the physical input, not on your own build, sets the horizon. (3) Efficiency as an explicit goal changes the demand slope, which beats any supply-side push against a hard limit.

### Reflexivity

**Pattern:** Expectations change the fundamentals they claim to measure. Belief → capital → capacity → activity → apparent confirmation → more belief.

**Signature:** Valuation supporting capex that supports revenue that supports valuation, with no independent end-demand anchor.

**Leverage:** analytically, find the exogenous anchor — the end-user revenue that isn't produced by the loop — and track it. Its growth rate versus the loop's growth rate is the whole question.

---

## 9. Scenario and Stress Testing

Large systems have irreducible uncertainty. Don't produce a point forecast; produce a structure plus the conditions under which it behaves differently.

**Build 3 scenarios:**

| | Continuation | Constraint shift | Cycle turn |
|---|---|---|---|
| **Premise** | Current dominant loop persists | The binding constraint moves to a new tier | The terminating balancing loop engages |
| **Which loop dominates** | | | |
| **Leading indicators** | | | |
| **What breaks first** | | | |
| **Timing** | | | |

**Stress tests to run on any large map:**

1. **Demand shock, −30%.** Where does inventory accumulate? Which tier's purchase commitments become write-downs? Who cancels first?
2. **Constraint relief.** The binding tier doubles capacity. Where does the constraint move? Where does margin go?
3. **Capital withdrawal.** Funding stops. Which actors were dependent on external capital rather than operating cash? Which loops break immediately?
4. **Substitution.** A credible alternative appears at the highest-margin tier. How fast can it scale, given *its* upstream constraints?
5. **Demand doubles.** Which tier binds first? What's the maximum rate of expansion given the longest lead time in the chain?

The stress tests are usually more informative than the base case, because they reveal which loops were load-bearing.

---

## 10. Pitfalls at Scale

**Mapping one firm and calling it the system.** The governing loop closes through customers' customers. Map the chain, then locate the firm in it.

**Backlog treated as demand.** See §6. This single error has powered most capex-cycle misjudgements.

**Announced treated as operational.** Announcements are Ledger 3. Track the historical conversion rate from announced to delivered before believing any pipeline.

**Double-counting circular revenue.** The same money going around a loop is counted at each pass. Follow it back to where it enters the system from outside.

**Run-rate treated as a stock.** An annualized run-rate is a flow. "$X billion business" derived from one quarter times four is a projection with a flow's volatility, not a level.

**Ignoring the depreciation delay.** Capex hits cash now and earnings later. Analysis on current earnings misses a drag that is already contractually scheduled.

**Assuming a fixed constraint.** The constraint migrates. A map built on today's bottleneck expires when that bottleneck is relieved — sometimes within one planning cycle.

**Modeling actors as passive.** Every actor in a large system is adapting, including to your intervention. Double-ordering, hoarding and cancellation are *responses*, not anomalies.

**Confusing utilization with health.** High utilization can mean strong demand or an inability to expand. Pair it with lead times and pricing to distinguish.

**Precision without accuracy.** A model with four significant figures built on an unverified conversion factor. State error bars, and place your effort where the conclusion is sensitive.

**Forecasting the level instead of the turn.** Levels are easy and useless; the useful output is the condition under which the dominant loop hands off. Deliver thresholds, not point estimates.

---

## 11. Deliverable Structure

For a large-system map, `systems-map-<subject>.md` should contain:

1. **Scope** — tier stack, boundary decisions with rationale, time horizon, the question being answered
2. **Tier table** — operators, capacity, expansion lead time, stocks held, margin capture
3. **Three ledgers** — physical, financial, informational maps over the same tiers, with coupling points marked
4. **Actor table** — objectives, horizons, blind spots, stress behavior, concentration
5. **Numbers table** — every stock and flow with unit, basis, confidence and date; derived ratios
6. **Constraint analysis** — capacities in a common unit, the binding tier, evidence, and the predicted next constraint
7. **Loop inventory** — physical, capital and expectation loops, labeled, with delays, and a dominance call with its threshold
8. **Archetype matches** — which patterns are running, and what each predicts
9. **Leverage ranking** — candidates classified 1–12, feasibility-discounted, with the actor who holds each lever
10. **Scenarios and stress tests** — three scenarios plus the five stress tests
11. **Monitoring set** — the specific observable indicators for each dominance threshold, with cadence
12. **Falsifiers** — what would show this map is wrong, and what you'd expect to see first

**Framing note:** a map of a commercial or financial system is an analytical model, not a forecast and not investment advice. State the epistemic status plainly, mark the confidence on every load-bearing number, and give the reader the falsifiers so they can check it themselves rather than trusting it.
