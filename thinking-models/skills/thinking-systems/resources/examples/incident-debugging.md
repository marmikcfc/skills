# Worked Example — Cross-Service Incident

The small end of the scale: one organization, one codebase, loops that close in seconds. Demonstrates Steps 1–6 where quantification is light and the leverage is almost entirely in *rules*.

**Scenario:** Checkout latency p99 went from 180ms to 4.2s over 40 minutes. Three services involved. Two engineers have already "fixed" it twice and it came back worse.

---

## Step 1: Scope

**Boundary**
- Inside: checkout API, pricing service, inventory service, the shared Postgres primary, the Redis cache, client retry behavior
- Outside: the CDN, payment provider, client devices
- Why: the symptom-producing loop closes among the three services and their clients. Client retry behavior *must* be inside — that's where the amplification lives, and the first two failed fixes both placed it outside.

**Time horizon:** minutes. All loops here have sub-second delays; the only long delay is human perception.

**Problem statement**
- **Symptom:** checkout p99 180ms → 4.2s in 40 min; error rate 0.2% → 9%
- **Pattern:** two interventions (restart pricing service, scale checkout 4→12 instances) each helped for ~3 minutes, then latency returned *higher* than before
- **Hypothesis:** a fix that briefly relieves pressure while feeding a reinforcing loop — the "worked, then worse" signature of Fixes That Fail with a retry amplifier

> The pattern is doing the work here. "It got better then worse after adding capacity" already rules out a simple capacity shortfall and points at a loop with positive gain.

---

## Step 2: Map the Structure

```
┌─────────┐      ┌──────────┐      ┌───────────┐
│ Clients │─────▶│ Checkout │─────▶│  Pricing  │
└─────────┘      └────┬─────┘      └─────┬─────┘
     ▲                │                  │
     │                ▼                  ▼
     │          ┌──────────┐      ┌───────────┐
     └──retry───┤  Cache   │      │ Inventory │
                └──────────┘      └─────┬─────┘
                                        ▼
                                  ┌───────────┐
                                  │ Postgres  │
                                  └───────────┘
```

**Stocks**

| Stock | Level | Unit |
|---|---|---|
| In-flight requests at checkout | 2,400 (was ~40) | requests |
| Postgres active connections | 190 / 200 max | connections |
| Cache entries for hot SKUs | 0 (expired) | entries |

**Flows**

| Flow | Rate | Unit | Changes |
|---|---|---|---|
| Client request arrivals | 850 | req/s | in-flight ↑ |
| Checkout completions | 210 | req/s | in-flight ↓ |
| Client retries | ~600 | req/s | in-flight ↑ |

**Net on in-flight requests:** +640/s. This is the whole incident in one line — the stock cannot do anything but grow, and no amount of instance count changes an inequality between arrival and service rate.

---

## Step 3: Find the Loops

**R1 — Retry storm** *(reinforcing, delay ~2s = client timeout)*
```
Checkout slow →(+)→ client timeouts →(+)→ retries →(+)→ arrival rate →(+)→ checkout slow
```
Four positive links, zero negative → reinforcing. **Loop gain ≈ 1.7** (each timed-out request generates up to 3 retries; ~57% of requests currently time out). Gain above 1.0 means it runs away regardless of capacity.

**R2 — Connection starvation** *(reinforcing, delay ~0)*
```
In-flight ↑ →(+)→ DB connections held →(+)→ connection wait time →(+)→ request duration →(+)→ in-flight ↑
```

**B1 — Capacity response** *(balancing, delay ~90s: autoscale + warmup)*
```
Latency ↑ →(+)→ scale-up →(+)→ capacity →(−)→ latency
```
Real, but slow and — critically — it *increases* the number of clients holding DB connections, feeding R2. The stabilizer strengthens the destabilizer.

**B2 — Cache protection** *(balancing, currently disabled)*
```
Requests →(−)→ cache hit →(−)→ backend load
```
Broken: a deploy 45 minutes ago changed the cache key format, invalidating everything at once. **Thundering herd** — the correlated expiration that started the whole thing.

**Trigger reconstruction:** deploy → cache keys invalidated → all requests to backend (thundering herd) → latency rises → timeouts → R1 engages → R2 engages → capacity added → R2 strengthened → worse.

---

## Step 4: Quantify

| Loop | Gain / effect | Delay | Dominant? |
|---|---|---|---|
| R1 retry storm | ×1.7 per turn | 2s | **Yes — explains ~70%** |
| R2 connection starvation | ×1.2 per turn | ~0s | Contributing, ~20% |
| B1 capacity | −latency, but +R2 | 90s | Net negative |
| B2 cache | Would cut load ~85% | N/A | Disabled |

**Dominance call:** R1 dominates. Any intervention that doesn't reduce the retry loop gain below 1.0 will fail.

**Flip threshold:** R1 stops running away when timeout rate × retries-per-timeout < 1.0 — i.e. below ~33% timeout rate at the current retry policy of 3.

**Little's Law check:** in-flight = arrival × latency → 2,400 ≈ 850 × 2.8s. Consistent. And it shows why scaling failed: raising throughput to 400/s against 850/s arrivals still leaves the stock growing.

---

## Step 5: Rank Leverage Points

| Intervention | Loop | Level | Feasibility | Effect |
|---|---|---|---|---|
| Add more checkout instances | B1 | 12 — parameter | High | **Negative** — feeds R2 |
| Raise DB max connections | R2 | 12 — parameter | High | Delays collapse, doesn't stop it |
| Raise client timeout | R1 | 12 — parameter | Medium | Reduces retry rate slightly; masks the signal |
| Roll back the cache-key deploy | B2 | 10 — structure | High | Restores the 85% load reduction |
| Exponential backoff + jitter + retry budget | R1 | **5 — rules** | Medium (client deploy) | **Drops loop gain below 1.0** |
| Server-side load shedding / admission control | R1 | **5 — rules** | High | Caps arrival rate at serviceable level immediately |
| Circuit breaker between checkout and pricing | R2 | 5 — rules | High | Cuts the cascade path |
| Jittered cache TTLs | B2 | 5 — rules | High | Prevents recurrence of the herd |
| Error-budget policy gating risky deploys | — | 3 — goals | Low (org change) | Prevents the trigger class |

**The classic trap made concrete:** the two attempted fixes were both level-12 parameters. They raised the threshold while leaving the loop gain above 1.0, so the system re-collapsed at a higher level of resource consumption — which is exactly why it came back *worse*.

---

## Step 6: Strategy and Stress Test

**Immediate (break the loop):**
1. **Load shedding at checkout** — reject above 300 req/s with a non-retryable 429. Cuts R1 at the arrival term instantly.
2. **Roll back the cache-key deploy** — restores B2, cutting backend load ~85%.
3. **Circuit breaker checkout → pricing** — prevents R2 propagation during recovery.

Order matters: shed load *first*. Restoring the cache while retries are still amplifying just moves the queue.

**Short-term (reduce loop gain):** exponential backoff with jitter and a client-side retry budget (level 5). This is the durable fix — it makes gain < 1.0 structurally, so the next trigger can't produce a storm.

**Structural:** jittered TTLs so cache expiry can never be correlated again; bounded queues with fast rejection instead of unbounded buffering; an error-budget policy governing deploy risk (level 3).

**Predicted outcomes**
- 0–5 min: latency recovers as the retry stock drains; error rate spikes *by design* from shedding — expected, don't reverse it
- 5–30 min: cache refills, load normalizes, shedding can be relaxed
- Next incident: with backoff shipped, a similar trigger causes a latency bump, not a collapse

**Second-order effects**
- Load shedding pushes failures to clients — needs a user-visible retry-later state, or you've moved the problem to the UI
- Circuit breakers can cause partial checkout failures — confirm the degraded path is correct, not silently wrong
- Backoff increases tail latency for legitimate retries — acceptable trade

**Falsifier:** if shedding to 300 req/s does *not* drop in-flight requests within two minutes, R1 is not dominant and the map is wrong — look for a poison-pill request or a lock the map doesn't show.

**Monitoring**
- Leading: retry ratio (retries ÷ original requests) — the direct measure of R1 gain, and nobody was tracking it
- Leading: cache hit rate, connection pool wait time
- Lagging: p99 latency, error rate
- Threshold to alert on: retry ratio > 0.5, i.e. gain approaching 1.0

---

## Transferable Lessons

1. **"Fixed it, came back worse" means a reinforcing loop plus a parameter fix.** The parameter raised the threshold; the loop still had gain > 1.0.
2. **In fast technical systems, leverage is in rules, not parameters.** Retry policy, admission control and circuit breakers change the dynamic. Instance counts and connection limits only move the threshold.
3. **Compute the loop gain.** "There's a retry loop" is an observation; "gain is 1.7, needs to be under 1.0" is an intervention target.
4. **Check whether your stabilizer feeds a destabilizer.** Autoscaling relieved CPU pressure and worsened connection starvation — B1 strengthening R2 is why the obvious fix backfired.
5. **The stock/flow inequality is the fastest diagnostic available.** Arrival 850/s vs. service 210/s told you within a minute that no capacity increase in the plausible range would work.
