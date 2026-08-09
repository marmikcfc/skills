---
name: forming-opinions
description: Form a calibrated opinion and stress-test it instead of rationalizing your first reflex. Surfaces the fast gut reaction, names it as a prior (not a conclusion), audits whether your reasoning is post-hoc justification (motivated reasoning / identity-protective cognition), assigns an explicit credence, and writes the falsifier that would change your mind. Use whenever you're asked "what do you think", taking or defending a position, evaluating a claim/proposal/design/PR, deciding whether you believe something, validating or invalidating a hypothesis, judging which of two options is better, or whenever you notice you've *already concluded* and are now assembling reasons for it. Especially use it on charged, high-stakes, or identity-tied questions where the temptation to rationalize is strongest.
---

# Forming Opinions

## Overview

Humans — and LLMs — do not form opinions by neutrally weighing evidence and then concluding. The dominant finding across neuroscience and psychology is the reverse: **a fast, automatic intuition arrives first, and reasoning shows up second to justify it.** Reason is the press secretary, not the judge. Confirmation bias is the *default output* of a reasoning faculty built to win arguments, not to find truth.

This skill exists because that default is dangerous when you want to be *right*, not just persuasive. It does not try to suppress the gut reaction — emotion is part of the computation, and a felt "this is wrong" is signal, not noise. Instead it makes the hidden step visible: **treat the intuition as a prior, then deliberately do the work the brain skips** — check whether you're defending an identity, assign honest confidence, and pre-commit to what would move you.

**The one sentence to remember:** *An opinion is a prior that should update in proportion to surprise × confidence, discounted by how much the update threatens the self or the group. Name the prior, then pay the discount back.*

## When this fires vs. when to skip

Use it when the output is a *judgment* — a stance, a belief, a verdict, a "which is better", a "do I buy this argument". Skip it for pure fact lookup ("what's the capital of X") or mechanical execution where there's nothing to have an opinion *about*. The tell that you need it: you feel a pull toward a conclusion *before* you've laid out the evidence. That pull is the prior. Catch it.

## Workflow

Copy this checklist and work it in order. The order matters: you state the gut reaction *first* and *on the record*, precisely so you can't pretend later that your conclusion was where the reasoning led.

```
Forming-Opinions Progress:
- [ ] 1. State the gut verdict (before reasoning) and name it as a prior
- [ ] 2. Classify the opinion: factual vs. identity/values-fused
- [ ] 3. Motivated-reasoning audit — is this reasoning, or rationalizing?
- [ ] 4. Steel-man the opposite, then assign a credence
- [ ] 5. Write the falsifier(s) — what would change my mind
- [ ] 6. State the opinion with its confidence and its update conditions
```

### 1. State the gut verdict first — and name it as a prior

Before you marshal a single argument, write the reflex answer in one line: *"Gut: I think X."* Then immediately relabel it: this is a **prior**, your brain's fast guess, not a proven conclusion. Naming it does two things — it stops you from laundering the intuition through after-the-fact logic and pretending it was derived, and it gives you something concrete to update *against* later.

Why first: if you reason before you confess the gut reaction, you will (predictably, mechanically) build the case *for* the gut reaction and call it analysis. Writing it down up front breaks that loop.

### 2. Classify the opinion: factual vs. identity-fused

Ask: *is this a question with a knowable answer, or is it tangled with who I am / which side I'm on / what I've already publicly committed to?*

- **Factual / low-identity-stakes** (which DB is faster, will this deploy break) → the binding constraint is *information*. Go straight to evidence; the audit in step 3 is light.
- **Identity- or values-fused** (is this architecture "the right way", is my earlier decision still good, anything where being wrong costs face or group standing) → the binding constraint is *threat*, not information. Here motivated reasoning is near-certain and step 3 is the most important step. Sunk-cost and ego-protection masquerade as analysis. Slow down.

This classification sets how hard to run the rest. Most bad opinions come from running the *factual* playbook on an *identity-fused* question.

### 3. Motivated-reasoning audit — reasoning, or rationalizing?

This is the core move and the reason the skill exists. Interrogate your own reasoning the way you'd interrogate an opponent's:

- **Direction-of-fit check:** Did I follow the evidence to the conclusion, or pick the conclusion and recruit evidence? Honest tell: would I have accepted the *opposite* evidence as readily? If a study/benchmark/argument that *supported* the other side appeared, would I scrutinize it harder than one supporting me? If yes — that asymmetry *is* the bias.
- **Identity-protection check:** Does holding this view protect my self-image, my prior public statement, my team's position, or a decision I already made? If changing my mind would feel like *losing*, I'm probably defending, not reasoning.
- **Disconfirmation test:** Have I actually looked for the strongest evidence *against*, or only for support? Confirmation bias is the default — assume you've under-searched the disconfirming side and go find it.
- **Single-cause / dumbfounding check:** If I strip my stated reasons away, does the verdict survive anyway? If I'd keep the conclusion even with no reasons left ("I just know"), that's moral dumbfounding — the reasons are decoration.

For a structured bias sweep here, hand off to **thinking-debiasing**. If the question is a root-cause or "why do I believe this" chain, **thinking-socratic** deepens the interrogation.

### 4. Steel-man the opposite, then assign a credence

Build the **strongest** version of the view you *don't* hold — not a strawman you can knock down, the version its smartest advocate would endorse. Use **thinking-steel-manning** for this. For a plan, design, or anything you're about to commit to, also run **thinking-red-team** (attack your own position adversarially) or **thinking-pre-mortem** (assume it failed — why?).

Then put a number on it. Express the opinion as a **credence** — a probability, not a binary. "I'm ~75% that X" is honest; "X is true" hides your uncertainty from yourself. For the mechanics of setting and updating that number on evidence, use **thinking-bayesian** (prior × likelihood → posterior) and **thinking-probabilistic** (calibration). The credence is not decoration: it determines how much the falsifier in step 5 should move you.

### 5. Write the falsifier(s) — what would change my mind

State, *concretely and in advance*, the evidence that would lower your credence — ideally something observable. "I'd drop below 50% if the benchmark on our actual workload shows < 2× gain" is a real falsifier. "If I saw good evidence" is not.

This is the single most powerful anti-rationalization device, because a belief you *cannot* describe a way out of is not an opinion you reasoned to — it's an identity you're protecting. If you genuinely cannot name anything that would change your mind, flag that explicitly: it means the view is faith- or identity-held, and you should hold it loosely or labelled as such.

Where you can, pre-commit to *updating on that evidence if it appears* — that's the only real control you have over your own beliefs (you can't believe-at-will, but you can choose your information diet and your commitments).

### 6. State the opinion with confidence and update conditions

Deliver the verdict in a form that carries its own honesty:

> **Opinion:** [the stance], at **~[credence]%** confidence.
> **Why:** [the reasons that survived the audit — not all reasons, the load-bearing ones].
> **This is [factual / identity-fused].** [If identity-fused: note the threat you checked for.]
> **I'd change my mind if:** [the concrete falsifier(s)].
> **Strongest case against:** [the steel-manned opposite, in one line].

## Output template

```markdown
## Opinion: [the question]

**Gut (prior):** [the one-line reflex, named as a prior]
**Type:** Factual / Identity-fused — [why]

### Audit
- Direction-of-fit: [did I follow evidence, or recruit it?]
- Identity protection: [is changing my mind a "loss"? whose?]
- Disconfirmation: [strongest evidence AGAINST I actually found]
- Dumbfounding: [does the verdict survive with reasons removed?]

### Position
**Opinion:** [stance] — **~XX%** confidence
**Load-bearing reasons:** [the ones that survived]
**Strongest case against (steel-manned):** [one line]
**I'd change my mind if:** [concrete, observable falsifier]
**Pre-commit:** [what I'll do / re-evaluate if that evidence appears]
```

## How this composes with other thinking-models

`forming-opinions` is the *convergent / evaluative* counterpart to the `creativity` pack's *generative* skills. It is an orchestrator — it calls the focused skills rather than re-implementing them:

| Step | Hand off to |
|------|-------------|
| Bias sweep (step 3) | `thinking-debiasing`, `thinking-socratic` |
| Strongest opposing view (step 4) | `thinking-steel-manning` |
| Attack your own position (step 4) | `thinking-red-team`, `thinking-pre-mortem` |
| Credence + updating (steps 4–5) | `thinking-bayesian`, `thinking-probabilistic` |
| Don't know which lens fits | `thinking-model-router` |

When you've just *generated* options (via `creative-generation` or `creativity-sampler`), this skill is the natural next step: it's how you pick and commit without fooling yourself.

## Key questions

- "What did I think *before* I reasoned — and am I now just defending that?"
- "Would I accept the opposite evidence as easily as the evidence I have?"
- "Is changing my mind here a loss of face, or just an update?"
- "What, concretely, would make me wrong — and have I looked for it?"
- "What's my actual confidence as a number, not a vibe?"

## Verification checklist

- [ ] The gut reaction was written down *before* the supporting argument
- [ ] The opinion is classified factual vs. identity-fused, and the audit depth matched
- [ ] At least one genuine piece of disconfirming evidence was sought, not just support
- [ ] The opposite view was steel-manned, not strawmanned
- [ ] The opinion carries an explicit credence (a number/range)
- [ ] A concrete, observable falsifier is stated — or the belief is flagged as unfalsifiable/identity-held
