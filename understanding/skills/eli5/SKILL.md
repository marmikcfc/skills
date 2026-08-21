---
name: eli5
description: Explain something to someone with no context at all, using only ideas they already have. Use when a reader is new to the domain, when an explanation has failed once already, when someone asks "wait, what is X?", or when opening an unfamiliar codebase and needing the plain-language version before the technical one. Not for dumbing down — for finding the shortest true path from what they know to what they don't.
---

# ELI5

The name is a joke and the constraint is not. You are not talking to a
five-year-old. You are talking to a competent adult who has **no context in
this particular domain**, which is the situation everyone is in most of the
time.

## The one rule

**Every term you use must already be in the reader's head, or be defined in
the same breath.** That is the whole discipline. Everything below follows from
it.

The failure mode is not complexity. It is a sentence that is perfectly clear
to someone who already knows the answer.

> "It's a write-ahead log that guarantees durability across crashes."

Every word is correct. Nobody who needed the explanation received one.

## Step 1 — Find what they already have

Before writing a word, name the closest thing the reader definitely
understands. Not a metaphor yet — a real thing from their life.

- Version control → a document's edit history
- A queue → the line at a coffee shop
- Caching → keeping the thing you use most on your desk instead of in the
  filing cabinet
- A race condition → two people editing the same shopping list

If you cannot name one, you do not understand it well enough to explain it
yet. Go and find out. That is a real signal, not a setback.

## Step 2 — Build one bridge, and only one

Take them from the familiar thing to the real thing in as few steps as you can
manage. Each step must be true. Each step must be small enough that the reader
never has to trust you.

Bad — a leap:

> A write-ahead log is like a diary. So databases survive crashes.

Good — a bridge:

> Before the database changes anything, it writes down what it's *about* to
> do. Then it does it. If the power cuts out halfway, it reads its own notes
> when it wakes up and finishes the job. That's it — that's a write-ahead log.

Same idea. The second one carries the reader across.

## Step 3 — Say where the analogy breaks

An analogy that is never qualified becomes a false belief. State the limit
plainly, in one sentence, as soon as you have used it.

> (The diary comparison stops working here: a diary is for remembering, and
> this is for *finishing* — the notes get thrown away as soon as the work is
> done.)

This costs you one sentence and buys the reader the ability to reason on their
own. It is the difference between explaining and merely reassuring.

## What to cut

- **Names of things, unless the name is the point.** "Idempotent" can wait.
  Describe the behaviour, then attach the word: *"…doing it twice has the same
  effect as doing it once. That property has a name — idempotent."*
- **Precision that costs comprehension.** Say the true simple thing, not the
  complete complicated one, and mark it: *"roughly", "the short version is".*
- **Everything that is interesting to you and not yet useful to them.** History,
  alternatives considered, edge cases. Ruthlessly.
- **Hedging.** "Sort of", "kind of", "basically" three times in a paragraph
  makes an explanation feel unreliable, which is the opposite of the goal.

## What never to cut

**Why it exists.** An explanation of a mechanism with no account of the
problem it solves is trivia. Lead with the problem where you can — the reader
will hold onto a mechanism far better once they have felt the need for it.

## Applied to code

Reading an unfamiliar codebase, the ELI5 pass answers three things, in this
order:

1. **What is this for?** In one sentence, in a user's words, not the system's.
   *"It lets you talk to coding sessions that are already running."*
2. **What are the two or three moving parts?** Named the way the code names
   them, so the reader can go and find them.
3. **What is the one thing that would surprise you?** Every codebase has one
   — a constraint, an inversion, a decision that looks wrong until you know
   why. Say it early; it is the fastest way to make the rest legible.

Then stop. The deeper version is a different request — see `five-levels` for
the ladder, or `explaining-technical-concepts` for the engineering-audience
version.

## Check before you send it

Read it back as someone who does not know the answer:

- Is there a word here I would have to look up?
- Did I say why this exists, or only how it works?
- Did I mark where the comparison stops being true?
- Could I cut a third of it and lose nothing?

The last one is almost always yes.
