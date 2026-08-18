---
name: thinking-skateboard-model
description: When scoping a new product, feature, or roadmap, build the smallest complete thing that solves the real underlying need — not a disconnected fragment of the final vision — then evolve it stage by stage with real users.
---

# Skateboard Model

## Overview
The skateboard model comes from a widely-shared cartoon contrasting two ways to build toward a car: the wrong way delivers a wheel, then a bigger wheel, then a chassis — pieces that are individually useless to the customer until the very end, with no feedback along the way. The right way delivers a skateboard, then a scooter, then a bicycle, then a motorcycle, then finally the car — every stage a complete, standalone-usable thing that solves the same underlying need ("get from A to B") a little better each time. Henrik Kniberg popularized the image and used it to reframe MVP; Byrne Reese extended it into an ongoing team discipline rather than a one-time launch artifact.

**Core Principle:** Every intermediate step must be a whole small thing, not a fragment of the final thing. If it doesn't independently solve the real need, it isn't a skateboard — it's a wheel.

## When to Use
- Scoping a new product, feature, or project from a blank page
- A roadmap looks like a sequence of unusable components ("build the backend, then the data model, then the UI") rather than a sequence of shippable products
- Debating what "MVP" means and getting stuck arguing over the words instead of shipping
- Any single feature or epic, not just the initial launch — ask "what's the skateboard for this?" continuously
- Deciding what to put in front of real users before committing to the full build
- A team keeps iterating internally without ever reaching a real customer

Decision flow:
```
New build or feature? → yes → Do you know the real underlying need? → no  → use thinking-jobs-to-be-done first
                                                                     ↘ yes → What's the smallest STANDALONE version
                                                                              that solves it? → BUILD THAT (the skateboard)
                     ↘ no → not the right tool
```

## When NOT to Use
- **You don't yet know the real underlying need.** The skateboard model assumes you already know what job the customer is hiring the product for; if you don't, use `thinking-jobs-to-be-done` first — otherwise you'll ship a fast, well-tested skateboard toward the wrong destination.
- **The build is physically or legally indivisible.** A bridge can't ship as "half a bridge," and a medical device or financial-infra product often can't legally be handed to real users half-built. Prototype or simulate internally (see the Wizard-of-Oz pattern below) instead of shipping a literal partial product.
- **You already have strong, validated signal.** If market fit and direction are already proven, re-litigating "what's our skateboard" is stalling, not discipline — build toward the vision.
- **No North Star exists yet.** Applying this relentlessly without a larger vision to evolve toward risks optimizing into a local maximum — a great skateboard that never becomes a car. Pair it with a clear direction (see Step 5).

## Trigger Card

When scoping a new build, or asking "what should we do first":

1. **State the real underlying need**, not the assumed solution ("get from A to B," not "a car").
2. **Ask: "What's the skateboard for this?"** — the cheapest, fastest thing that is a complete, standalone answer to that need, not a piece of the eventual answer.
3. **Get it in front of real users**, even if it isn't shippable — a faked prototype counts if it generates honest signal (see the Wizard-of-Oz pattern).
4. **Evolve it stage by stage** — each stage independently valuable, never a disconnected subassembly.
5. **Check it against your North Star** so the tactical wins stay pointed at the larger vision.

Skip if the need isn't known yet (route to `thinking-jobs-to-be-done` first), or the product is legally/physically indivisible.

## The Process

### Step 1: Identify the Real Underlying Need
Don't start from the assumed final-form solution — start from what the customer is actually trying to accomplish.
```
Assumed solution: "Build a car"
Real need: "Get from point A to point B"
```
If this step is unclear, stop and run `thinking-jobs-to-be-done` first.

### Step 2: Reframe What "Minimum Viable" Actually Means
"MVP" is contested because "minimum," "viable," and "product" all mean different things to different people. Use three sharper stages instead:
```
Earliest Testable Product  (skateboard)  — enough to get honest feedback, doesn't need to be shippable
Earliest Usable Product    (bicycle)     — early adopters will actually use it
Earliest Lovable Product   (motorcycle)  — the broader market wants it
```

### Step 3: Build the Skateboard
The smallest thing that is a *complete* answer to the real need — not a subassembly of the eventual product.
```
Wrong: ship the login system, then the database, then the UI (nothing usable until all three exist)
Right: ship a manual, ugly, single-user version of the whole flow (usable today, however crude)
```
If a real build isn't ready, fake it — a Wizard-of-Oz prototype can validate the experience before the technology exists:
```
ToyTalk/Pullstring example: to test whether kids would enjoy an AI-powered toy,
the team rigged two iPads — one showing a scaled-down prototype, a second one
secretly relaying the child's voice to a human writer upstairs who improvised
responses in real time via Skype. No AI existed yet; the *experience* was real.
```

### Step 4: Get Real Signal, Not Internal Approval
Ship it — or field-test the faked version — with actual users, not just internal review. Internal-only iteration is the most common way this fails.
```
Lego Universe: failed partly because iterations stayed internal and never
reached real users until it was too late to change course.
Sweden's police case-management system: succeeded via regional rollouts
where honest field feedback shaped each next stage.
```

### Step 5: Evolve Stage by Stage Toward a North Star
Every subsequent feature or epic gets the same question ("what's the skateboard for this?") — it's a continuous discipline, not a one-time launch event. But hold a clear vision (the "concept car") so the sequence of skateboard → scooter → bicycle → motorcycle actually converges on something, rather than drifting between disconnected tactical wins.
```
Good PM behavior: define the problem completely, let the team find the skateboard.
Bad PM behavior: prescribe the solution ("build X feature") without stating the need it serves.
```

## Mental Traps to Avoid

| Trap | Description | Antidote |
|------|-------------|----------|
| Shipping a wheel, not a skateboard | Building a technically-necessary but independently-useless piece first (the DB schema, the auth service) | Ask: "does this alone solve the need, however crudely?" |
| MVP jargon paralysis | Arguing over what "minimum" or "viable" means instead of shipping | Use Testable / Usable / Lovable instead of "MVP" |
| Treating it as a one-time event | Applying the discipline only at initial launch, then reverting to component-sequential roadmaps | Ask "what's the skateboard for this?" on every epic, not just v1 |
| Skateboard with no North Star | Endless tactical increments that never add up to the vision | Pair every skateboard cycle with a stated direction, not just a next step |
| Internal-only iteration | Polishing a prototype nobody outside the team has touched | Force a real (or Wizard-of-Oz) user test before the next stage |

## Application Patterns

### Product Launch
```
Need: real-time music streaming, not "a polished streaming app"
Skateboard: Spotify's earliest prototype existed only to prove low-latency
streaming was technically possible — nothing else.
```

### Feature-Level (Reese's continuous discipline)
```
At BuildingConnected, no one said "MVP" — every request was met with
"what's the skateboard for this?", reframing the discussion around the
heart of the ask rather than its full scope.
```

### Legally/Physically Indivisible Builds
```
Need: launch a compliant financial product
Can't ship half a regulated product to real users →
Simulate the experience internally (Wizard-of-Oz, closed pilot with
disclosed prototype status) instead of a literal partial public launch.
```

### Roadmap Sequencing
```
Wrong sequence: backend → data model → API → UI (nothing usable until step 4)
Right sequence: manual/concierge version of the full flow → automate the
worst bottleneck → automate the next one → ...
```

## Verification Checklist
- [ ] Stated the real underlying need, separate from the assumed solution
- [ ] Confirmed the "skateboard" is a complete, standalone-usable thing — not a subassembly
- [ ] Identified whether a faked/Wizard-of-Oz version is acceptable, or a real build is required
- [ ] Got it in front of real users (not just internal review)
- [ ] Defined the next 1-2 evolution stages (scooter → bicycle) and what signal moves you between them
- [ ] Named the North Star / concept-car vision so the sequence has a direction

## Combining with Other Models
- **Jobs to be Done**: run first if the real underlying need isn't already clear — the skateboard model assumes you know it.
- **Effectuation**: both favor starting with what's cheaply available now over big upfront planning; effectuation is the broader "start with your means" frame, skateboard model is the specific build-sequencing tactic.
- **First Principles**: identifying the real need under an assumed solution is itself a first-principles move — strip the request down to what's actually true before designing the skateboard.
- **Theory of Constraints**: once you're iterating stage by stage, use it to find which bottleneck the next stage should remove.

## Key Questions
- "What is the real need here, separate from the solution I'm assuming?"
- "What's the skateboard for this — the smallest thing that's still a complete answer?"
- "Could I fake this experience before the real thing exists?"
- "Has a real user actually touched this, or only the team?"
- "What's our North Star, so this sequence of small things is actually converging on something?"

## Sources
- Henrik Kniberg, ["Making Sense of MVP"](https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp) — the skateboard/car illustration and the Testable/Usable/Lovable reframe.
- Byrne Reese, ["The Skateboard Mindset in Product Development"](https://medium.com/@byrnereese/the-skateboard-mindset-in-product-development-ddf3409d5e98) — the continuous-discipline framing and the ToyTalk Wizard-of-Oz example.
