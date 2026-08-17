# Worked Example — Firm-Level Cash Flow and Circularity

Mapping a single firm sitting at the constrained tier of a large chain. Uses NVIDIA as the worked subject because it exhibits every structure worth learning: supplier prepayments, customer concentration, vendor financing, reflexive valuation, and a depreciation drag that lands on its customers rather than itself.

> **Epistemic status.** This is an analytical framework, **not investment advice and not a forecast**. Every number is illustrative — placeholders that demonstrate the arithmetic. Replace each with a sourced, dated figure from primary filings before drawing any conclusion. The loops are durable; the magnitudes are not, and in this system the magnitudes decide the answer.
>
> **Boundary warning applies to this example itself.** A single-firm map is, by construction, the error `large-systems.md` warns about. It is valid only as a *component* of the chain map in `ai-supply-chain.md`. The loops that govern this firm close through its customers' customers. Read that example first.

---

## Step 1: Scope

**Question:** what sustains this firm's revenue growth, what would terminate it, and how much of reported demand is independently funded?

**Boundary**
- Inside: the firm; its suppliers (foundry, HBM, packaging); its direct customers (hyperscalers, neoclouds, labs); **its customers' end-market revenue**; capital markets
- Outside: consumer segments, unrelated business lines, macro rates (exogenous but influential)
- **Why customers' end revenue is inside:** the terminating loop (B3 below) runs through whether customers earn a return on what they bought. Excluding it produces a map that can only ever say "demand is strong."

**Time horizon:** 2–5 years — long enough for the customer-return loop and the depreciation drag to complete.

**Problem statement**
- **Symptom:** revenue growth far exceeding any historical semiconductor precedent
- **Pattern:** growth accompanied by rising supplier prepayments, rising customer concentration, and rising vendor-provided customer funding
- **Hypothesis:** reinforcing loops (R1, R2, R4) dominate while the balancing loops that would discipline them (B3 customer returns, B4 competitive entry) operate with multi-year delays — so the system's own feedback arrives too late to prevent overshoot

---

## Step 2: The Three Ledgers, Firm-Centered

### Ledger 1 — Physical
```
foundry wafers → HBM + packaging → dies/modules → systems (via ODM) → customer datacenters → installed base
```
Firm's stocks: die and module inventory, channel inventory at ODMs.
**Watch:** the firm's own inventory is a small part of the picture. Units sold into the channel are the firm's revenue and someone else's inventory. Sell-in ≠ sell-through; only sell-through tracks demand.

### Ledger 2 — Financial
```
customer end revenue → customers → THE FIRM → suppliers (prepayments) → capacity
        ▲                   ▲                      │
        │                   │                      ▼
        │            capital markets       cash → buybacks, investments
        │                   │
        └── vendor investment back into customers ◀┘   ← the circular path
```
Firm's stocks: cash and securities, receivables, inventory, **purchase commitments and supply prepayments**, strategic investment portfolio.

### Ledger 3 — Informational
```
customer capex plans → orders → backlog/RPO → guidance → expectations → valuation → cost of capital for customers
```
Firm's stocks: order book, backlog, and — crucially — **the market's belief about the durability of demand**, which feeds back into whether its customers can raise money to buy more.

**The key coupling:** Ledger 3 (the firm's guidance) → customer valuations → customer ability to raise → Ledger 2 (customer purchases). The firm's own narrative is an input to its own demand. That is reflexivity, and it is the structure most likely to be under-modeled.

---

## Step 3: Stocks and Flows

*All values illustrative — replace with sourced figures.*

| Item | Type | Illustrative | Unit | Why it matters |
|---|---|---|---|---|
| Cash + marketable securities | Stock | $— | $B | Funds prepayments, buybacks, investments |
| Inventory | Stock | $— | $B | Rising days = demand softening or a build-ahead |
| **Supply purchase commitments** | Stock | $— | $B | **Capacity bought against a forecast — the write-down exposure** |
| Receivables | Stock | $— | $B | Concentration = customer risk becomes firm risk |
| Strategic investment portfolio | Stock | $— | $B | The circular-financing channel |
| Backlog / contracted revenue | Stock | $— | $B | Ledger 3 — see cancellability caveat |
| Installed base of the firm's accelerators | Stock | — | units / GW | Sets the replacement floor and the customer TCO burden |
| Revenue | Flow | $—/qtr | $B/qtr | |
| Operating cash flow | Flow | $—/qtr | $B/qtr | |
| Prepayments to suppliers | Flow | $—/qtr | $B/qtr | Forward bet on demand |
| Equity investments into customers/partners | Flow | $—/qtr | $B/qtr | **The circularity numerator** |
| Buybacks | Flow | $—/qtr | $B/qtr | Cash exit; competes with capacity investment |
| Customer depreciation on the firm's product | Flow | $—/yr | $B/yr | **On the customer's P&L — the cycle terminator** |

### Derived Ratios

| Ratio | What it tells you |
|---|---|
| **Circularity share** = vendor-funded customer purchases ÷ revenue | How much demand the firm is financing |
| **Unfunded base** = revenue that persists if all vendor investment stopped | The floor under the business |
| Customer concentration (top-N ÷ revenue) | Whether one customer's decision is the firm's revenue |
| Days of inventory, and its trend | Early demand-turn signal |
| Purchase commitments ÷ next-4-quarter revenue | Forward exposure if demand turns |
| Backlog coverage + **cancellability** | Demand vs. sentiment |
| **Customer revenue per deployed unit ÷ customer TCO per unit** | **Whether the next purchase is rational for the buyer** |
| Operating cash flow ÷ net income | Earnings quality; divergence flags receivable or inventory build |

**The two that carry the analysis:** circularity share and customer unit economics. Neither is directly reported; both must be constructed. That construction *is* the work.

---

## Step 4: Loops

### R1 — Supply securing *(reinforcing, delay 12–18 mo)*
```
Demand →(+)→ revenue →(+)→ cash →(+)→ prepayments to foundry/HBM/packaging
     →(+)→ reserved capacity →(+)→ ability to fulfil →(+)→ revenue
```
Converts cash into a structural moat: capacity reserved is capacity denied to competitors. **Cost:** commitments are a bet on a forecast. If demand turns, they convert to write-downs — the same mechanism that made this loop a moat makes it the transmission channel for a downturn.

### R2 — Ecosystem lock-in *(reinforcing, multi-year)*
```
Installed base →(+)→ developer tooling & expertise (CUDA) →(+)→ switching cost
     →(+)→ share →(+)→ installed base
```
The moat is an accumulated **stock** of tooling, code and skills — which is why it outlives technical parity by years, and why competitors matching on specs still lose. Draining a stock is slow; that cuts both ways.

### R3 — Reflexive valuation *(reinforcing, fast, bidirectional)*
```
Results →(+)→ valuation →(−)→ cost of capital across the ecosystem
     →(+)→ customer ability to fund purchases →(+)→ revenue →(+)→ results
```
The firm's results lower its *customers'* cost of capital. Fast in both directions — this is why the turn, when it comes, is faster than the ascent.

### R4 — Circular financing *(reinforcing)*
```
Cash →(+)→ investment in labs/neoclouds/partners →(+)→ their purchasing power
     →(+)→ purchases of the firm's product →(+)→ revenue →(+)→ cash
```
**The structure to size, not merely to flag.** See §Circularity below.

### B1 — Supplier constraint *(balancing, fast)*
```
Demand →(+)→ packaging/HBM utilization →(+)→ allocation limits →(−)→ shipments
```
Caps upside. Also *supports* pricing — a constraint the firm doesn't fully want relieved.

### B2 — Inventory and commitment risk *(balancing, delayed, sharp)*
```
Forecast →(+)→ prepayments & commitments →(+)→ [demand softens] →(+)→ excess inventory
     →(+)→ write-downs →(−)→ margin
```
Dormant while growth holds; **abrupt** when it doesn't. Converts a demand slowdown into a reported loss, which is why the P&L turn is sharper than the demand turn.

### B3 — Customer return on capital *(balancing, delay 1–2 investment cycles)*
```
Customer buys →(+)→ deployed capacity →(+)→ TCO to recover →(+)→ required revenue per unit
     →(−)→ [if unmet for long enough] further purchases
```
**This is the loop that ends the cycle.** Not competition, not technology — the customer's inability to earn a return.

Model it from the *customer's* side:
```
Customer TCO/unit/yr = hardware amortization + power + cooling + shell + networking + ops
Customer revenue/unit/yr = AI service revenue ÷ deployed units
B3 engages when: revenue/unit < TCO/unit, sustained across a planning cycle
```
Sellers systematically under-model B3 because it appears on someone else's P&L. That asymmetry is exactly where the analytical edge is.

### B4 — Competitive entry *(balancing, delay 2–4 yr)*
```
High margin →(+)→ custom silicon programs + merchant competitors →(+)→ alternative supply →(−)→ pricing power
```
Slow, because entry requires both silicon *and* access to the same constrained tiers 3–4 — and because R2's switching-cost stock must be drained, not just matched.

### B5 — Customer vertical integration *(balancing, slow)*
Largest customers are also the most able to build in-house alternatives. Concentration therefore carries a second-order risk beyond payment: **the biggest customers have the strongest incentive and the deepest means to reduce their dependence.** Concentration and substitution risk are the same risk viewed twice.

### Dominance

| | Assessment |
|---|---|
| **Dominant now** | R1 + R2 + R3, gated physically by B1 |
| **Dominates next** | B3, then B2 mechanically follows |
| **Flip trigger** | Customer revenue/unit < TCO/unit sustained ~2–4 quarters, **or** capital markets stop funding the gap (R3 reversing) |
| **Why the overshoot is structural** | Every balancing loop (B2, B3, B4) has a delay measured in years; every reinforcing loop (R1, R3, R4) operates in quarters. The discipline is scheduled to arrive late. |

---

## Circularity: How to Size It

Do not stop at "there's circular financing." That's an observation. Sizing it is the analysis.

**1. Bucket the revenue by funding source**

| Bucket | Definition | Est. share | Durability |
|---|---|---|---|
| A — Self-funded | Customer pays from its own operating cash flow | —% | Highest |
| B — Third-party funded | Customer raised independent capital | —% | Medium — depends on R3 |
| C — Vendor funded | Purchases traceable to firm-provided capital, credit, guarantees or equity | —% | Lowest — unwinds with the firm |

**2. Circularity share** = C ÷ total revenue. **Track the trend, not the level** — a rising share while revenue grows means the marginal dollar of growth is increasingly self-financed.

**3. Count the hops.** A one-hop circle (firm invests in customer, customer buys) is visible in disclosures. Multi-hop circles — routed through a leasing vehicle, a joint venture, an anchor-tenant guarantee, or an investment in a company that is a *customer of the firm's customer* — are the same structure and much harder to see. **Follow the money back to where it enters the system from outside.** If you can't find an external origin, it's circular regardless of how many entities it passed through.

**4. Unwind test.** If all vendor investment stopped today, what share of revenue persists? That's bucket A + the durable part of B. This is the floor, and it's the number worth having.

**5. Watch the accounting boundary.** Consolidated, equity-method, or off balance sheet changes the *visibility*, not the economics. Never let accounting treatment determine your structural map.

**Archetype match — Shifting the Burden.** Vendor financing is the symptomatic solution to the customer funding gap; the fundamental solution is customers generating enough end-user revenue to self-fund. Each period the symptomatic solution runs, the fundamental capability looks less urgent — and the dependency deepens. The archetype's standard prediction applies: **cutting it abruptly fails**, because the fundamental capability hasn't been built. It has to be tapered while end-market revenue grows into it.

---

## Step 5: Leverage and Monitoring

### Leverage — by holder

| Intervention | Level | Holder | Effect |
|---|---|---|---|
| Raise prices | 12 | Firm | Extracts more from the constraint; accelerates B4 |
| Prepay more supply capacity | 11 | Firm | Deepens the moat; raises B2 exposure |
| Expand packaging/HBM capacity | 10 | Suppliers | Relieves B1; migrates the constraint downstream |
| Diversify the customer base | 11 | Firm | Reduces concentration and B5 exposure |
| Taper vendor financing while end demand grows | 5 | Firm | The archetype-correct exit from R4 |
| Disclose related-party revenue | 5 | Regulators | Makes R4 measurable from outside |
| Invest in customers' end-market demand | 3 | Firm + ecosystem | Addresses B3 at the root — grows the anchor |
| Efficiency as an explicit goal | 3 | Firm + labs | Improves customer TCO, directly weakening B3 |

**Note what the highest-leverage moves have in common:** they all work on the *customer's* economics, not the firm's. When the terminating loop runs through your buyer's return on capital, your leverage is in your buyer's P&L.

**For an analyst, leverage is informational** — construct the three quantities the reporting doesn't give you:
1. Circularity share and its trend
2. Customer revenue per deployed unit vs. TCO per unit
3. Sell-through vs. sell-in

### Monitoring Set

| Indicator | Type | Signal |
|---|---|---|
| Customer revenue/unit ÷ TCO/unit | **Leading** | B3 charging — the primary trigger |
| Circularity share, trend | **Leading** | Growth quality |
| Days of inventory, firm and channel | Leading | Demand turn, ahead of revenue |
| Purchase commitments ÷ forward revenue | Leading | Write-down exposure |
| Customer concentration | Leading | Single-decision risk + B5 |
| Backlog cancellability terms | Leading | Whether backlog is demand or sentiment |
| Customer capex guidance revisions | Leading | Upstream of the firm's own revenue |
| Operating cash flow ÷ net income | Leading | Earnings quality |
| Gross margin trend | Lagging | B4 arriving |
| Revenue growth | Lagging | Confirms what the above already said |

**The ordering is the point.** By the time the lagging indicators move, the loops have already handed off.

### Stress Tests

1. **Customer capex −30%:** commitments → write-downs (B2 fires); channel inventory builds; the least-capitalized customers cancel first.
2. **Capital markets close:** R3 reverses; buckets B and C of revenue compress; bucket A is the floor.
3. **A large customer's in-house silicon succeeds:** B5 — model the lead time honestly, gated by that customer's own access to tiers 3–4.
4. **Constraint relief at packaging:** B1 loosens, volumes rise, pricing power falls — **good for revenue, bad for margin.** Be explicit that these move in opposite directions.
5. **Efficiency doubles output per unit:** B3 relaxes (customer economics improve) while unit demand may fall. Sign is ambiguous — the same open question as in the chain map.

### Falsifiers

The map is wrong if:
- Customer end-market revenue grows **ahead** of deployed capital → B3 is not charging, and the "capital-funded overbuild" reading fails
- Circularity share **falls** while revenue grows → demand is independently funded; R4 is not load-bearing
- Margin **holds** after B1 relief → pricing power comes from R2 lock-in rather than scarcity, which makes B4 far slower than modeled
- Concentration **falls** while growth continues → single-customer risk and B5 are overstated

---

## Transferable Lessons

1. **A firm-level map is only valid inside a chain-level map.** The loop that governs this firm's revenue closes through its customers' customers' revenue. Draw the chain first.
2. **Find the terminating loop, and note whose P&L it lives on.** Here it's the customer's return on capital — invisible in the firm's own reporting, which is precisely why it's under-modeled.
3. **Size circularity; don't just flag it.** Bucket the revenue by funding source, count the hops, run the unwind test. "There's circular financing" is a talking point; "bucket C is X% and rising" is analysis.
4. **Compare the clock speeds of opposing loops.** Reinforcing loops in quarters, balancing loops in years, means overshoot is structural — not a failure of anyone's judgment.
5. **Constraint relief is not unambiguously good.** It raises volume and cuts pricing power. Whenever an intervention has opposite signs on two loops, say so rather than netting it into a single verdict.
6. **Accounting treatment changes visibility, not economics.** Map the structure; let the disclosure question come second.
