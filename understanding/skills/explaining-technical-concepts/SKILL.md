---
name: explaining-technical-concepts
description: Explain technical work to an engineering audience at any depth — from a 30-second hook to a deep architectural dive. Use when writing or reviewing a PR description, design doc, RFC, architecture explainer, codebase walkthrough, incident writeup, problem/solution proposal, technical blog post, conference talk, or short-form dev content; or when an explanation is technically correct but isn't landing.
---

# Explaining Technical Concepts

Derived from measured analysis of two opposite-pole technical explainers
(3Blue1Brown, 55k words; Gaurav Sen, 52k words) plus the structural conventions of
engineering artifacts. Where a claim below is measured, the number is given.

## Step 1 — Choose the axis before choosing the words

Almost every failed technical explanation fails here, not at the sentence level.

**Why is the reader reading?** There are only two answers, and they demand opposite
structures:

| | **Discovery order** | **Contract first** |
|---|---|---|
| Reader wants | To *understand* — build a durable mental model | To *decide or build* — act correctly today |
| Structure | Concrete instance → play → pattern → name → formalism | Guarantee → mechanism → failure modes |
| Names arrive | Late, as compression of something already felt | First, so the reader can navigate |
| Ends with | An open question | A decision or a caveat |
| Fits | Blog posts, talks, teaching, onboarding, "why does this work" | PRs, RFCs, design docs, runbooks, API docs |
| Measured in | 3b1b corpus | Gaurav Sen corpus |

The measured signatures diverge exactly as the theory predicts: the discovery-order
corpus opens **0 of 8** videos with an agenda and closes **0 of 8** with a recap; the
contract-first corpus opens **8 of 13** with an explicit agenda and states the system's
guarantee before its mechanism in essentially all of them.

**Getting this backwards is the most common failure.** A PR description written in
discovery order wastes a reviewer's time — they need the contract. A tutorial written
contract-first produces readers who can recite the definition and can't use it.

**Default by artifact:**
- PR, RFC, design doc, runbook, incident report, API reference → **contract first**
- Blog post, talk, onboarding doc, "why is it like this" → **discovery order**
- Deep dives → contract first at the top, discovery order inside each section

## Step 2 — Pick the depth tier

Each tier is a different artifact, not a truncation of the one below. Writing a
short-form piece by cutting a long one produces something that reads as an outline.

### L0 — The hook (30–80 words, 15–45s)
One surprising concrete fact. No context, no agenda, no definition. The goal is the
reader thinking "wait, why?" — not comprehension.

> Your query takes 3ms. Your request takes 340ms. The other 337 is your app opening a
> brand-new TCP connection and doing a TLS handshake — every single time.

Rules: open on the anomaly; one idea only; concrete numbers over adjectives; no
"in this video/thread we'll cover"; end at the question, don't answer it.

### L1 — The unit of work (150–400 words)
PR descriptions, Slack explanations, ticket writeups. Contract first, always.

```
What changed and why        (2-3 sentences — the contract)
How                         (mechanism, only as deep as review requires)
What this does NOT do       (scope boundary — prevents the misread review)
Risk / rollback             (what breaks, how to undo)
```

The "does NOT do" section is the highest-value and most-skipped part. It is what
stops a reviewer from reviewing the change they imagined.

### L2 — The argument (800–2,000 words)
Design docs, RFCs, blog posts, proposals. Needs a defensible *shape*:

```
Problem      — concrete, with evidence. Numbers, traces, a real failure.
Constraints  — what can't change, and why
Options      — 2-4, each with its real cost, steel-manned
Choice       — which, and the tradeoff being accepted
Consequences — what gets worse, what we'll need to revisit
```

An options section where the alternatives are obviously strawmen destroys the
document's credibility. Both corpora concede the alternative before advocating —
"Both are worthy pursuits, one is not necessarily better than the other" — because
the concession is what makes the recommendation land.

### L3 — The deep dive (3,000+ words)
Architecture explainers, system deep dives, teaching material. The failure mode here
is not length, it's **flatness** — uniform depth across sections. Vary it: some
sections should be a paragraph, one should go all the way to the bottom.

Structure: contract at the top → dependency-ordered sections → discovery order inside
each → failure modes → the unresolved parts. Include a navigational spine (headings
that state claims, not topics: "Writes are serialized per shard", not "Write path").

## Step 3 — The transferable moves

These appear in both corpora despite the opposite structures. They're the technique
independent of voice.

**1. Start with the artifact, not the abstraction.** The failing trace, the actual
diff, the real request. Both corpora open on something concrete in 100% of samples.

**2. One instance before the general rule.** Walk one request end-to-end before the
architecture diagram. The diagram is meaningless until the reader has a trajectory
to hang on it.

**3. Name the confusion out loud.** "This is one of those tools where you can learn
to use it and be left completely in the dark about what it's doing." Naming the
reader's actual state of mind buys enormous trust.

**4. Say where it breaks.** The contract-first corpus has a failure-modes section in
nearly every video. This is the single biggest credibility multiplier in engineering
writing, and the most commonly omitted.

**5. Concede before advocating.** Steel-man the alternative in its own best terms.

**6. Ground authority in numbers, not adjectives.** "98% of servers at Google run
this" and "40k rps in prod" do work that "highly scalable" cannot.

**7. Hand over the hard part.** "Take a moment to think about what breaks when you do
that." Works in a design doc as "before reading the next section, consider where
you'd put the retry."

**8. Withhold the name until the thing is felt** (discovery mode only). Show the
pattern working, then say "this is a circuit breaker."

## Step 4 — Cadence

Measured targets for technical prose, from the two corpora:

| | Explanatory / narrative | Instructional / reference |
|---|---|---|
| Mean sentence length | 18–24 words | 10–14 words |
| Sentences ≥30 words | ~25% | <5% |
| Sentences ≤5 words | ~7% | ~20% |
| CV (stdev/mean) | **>0.6 either way** | |

**CV is the number that matters.** Both corpora land at 0.61 and 0.69 despite means
of 22 and 12. Uniform sentence length is the strongest tell of machine-generated
prose regardless of the average. Vary deliberately: a 40-word derivation followed by
"That's the whole trick."

Long sentences stay readable through conjunction openers — the discovery corpus runs
25.6% of sentences over 30 words but opens 32% with *And / So / But / Now*. If you
write long sentences that open with subjects, you get density without navigability.

**Address the reader as `you`.** Both corpora are second-person-dominant (22/1k and
33/1k). "One might observe" and passive constructions are the register of papers,
not of engineering communication.

## Step 5 — Per-artifact specifics

**PR description.** Contract first. The reviewer's questions in order: *What's the
intended behavior change? Is the diff consistent with that? What's the blast radius?*
Answer all three before any implementation detail. Link the trace or the failing test
that motivated it.

**Codebase orientation.** Do not enumerate directories. Trace one real request from
entry to persistence, naming each component as it's encountered — the reader finishes
with a spine to hang everything else on. A directory listing is a reference, not an
explanation.

**Architecture explainer.** Lead with the invariant the system maintains. Every
component then exists as an answer to "how is that invariant preserved under X". This
is what makes an architecture feel inevitable rather than arbitrary.

**Problem/solution proposal.** The problem section must be able to convince someone
who doesn't already agree. If it relies on the reader sharing your priors, it's a
preference, not a problem. Evidence first, proposal second.

**Incident writeup.** Timeline factual and blameless; separate what was *known* at
each moment from what was *true*. The valuable part is the detection and diagnosis
gap, not the fix.

## Anti-patterns

- **Agenda openers** on discovery-mode content ("In this post we'll cover…").
- **However / Moreover / Furthermore** — 0.28% and 0.05% across 107k words of real
  technical explanation. If you reach for one, the sentence order is probably wrong.
- **Definition-first teaching.** Produces recall without use.
- **Uniform sentence length** — CV under 0.5 reads as machine-generated.
- **Adjectival authority** — "robust", "seamless", "scalable", "powerful" in place of
  a number.
- **Strawman alternatives** in an options section.
- **Missing failure modes.**
- **Directory-listing codebase docs.**
- **"It's not just X, it's Y"** — corrective antithesis, the most-cited AI tell.
- **Explaining the diff instead of the change.** Reviewers can read the diff.

## Self-check

- [ ] Did I pick discovery vs contract-first deliberately, matching why they're reading?
- [ ] Is the depth tier a real artifact, not a truncated longer one?
- [ ] Does it open on something concrete?
- [ ] Is there a "what this doesn't do" / "where this breaks" section?
- [ ] Are alternatives steel-manned?
- [ ] Is authority carried by numbers rather than adjectives?
- [ ] Sentence-length CV above 0.6?
- [ ] Zero However/Moreover/Furthermore?
- [ ] Would the reader be able to *use* this, not just recite it?

```bash
# plugin install:
python3 "${CLAUDE_PLUGIN_ROOT}/skills/voice-extractor/scripts/stylometry.py" --target draft.md
# standalone install:
python3 ~/.claude/skills/voice-extractor/scripts/stylometry.py --target draft.md
```

## Related

- `voice-3b1b` — the discovery-order pole, in depth
- `voice-gaurav-sen` — the contract-first pole, in depth
- `voice-extractor` — build a profile for a different target voice
