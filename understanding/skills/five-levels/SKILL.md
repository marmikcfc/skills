---
name: five-levels
description: Explain one idea at five increasing depths — child, teenager, undergraduate, graduate, expert — in the WIRED interview format. Use when someone asks for a concept "at a level", when you do not yet know how much background a reader has, when onboarding to an unfamiliar codebase and wanting to choose your own depth, or when an explanation landed at the wrong altitude and needs re-pitching rather than rewriting.
---

# Five Levels

One concept, five depths, each complete on its own. Borrowed from WIRED's
*5 Levels* series, where an expert explains a single idea to a child, a
teenager, an undergraduate, a graduate student, and a fellow expert.

## Why it is worth the effort

An explanation fails far more often by being pitched wrong than by being
wrong. The usual fix is guessing the audience and hoping. This replaces the
guess with a **dial the reader can turn**: they ask for a level, or they read
until it stops being useful and stop there.

For a codebase this is the difference between "explain the auth flow" —
answered at whatever depth you happened to choose — and being able to say
*"level 2"* and get exactly that.

## The five levels

Each level is defined by **what the reader can be assumed to already know**,
not by word count or tone. Tone follows from that; it is not the point.

### Level 1 — Child
Assumes: everyday physical experience. Nothing else.
- Only concrete nouns and things you can picture.
- One idea. Not the most important idea — the most *graspable* one.
- No names of technologies, no acronyms, no numbers beyond small counts.
- Two to four sentences. If it is longer, it is not level 1.

### Level 2 — Teenager
Assumes: school-level reasoning, comfort with abstraction, familiar with apps
and the internet as a user.
- Introduce the *problem* properly. A teenager will hold a mechanism if they
  understand why anyone needed it.
- Cause and effect is available. Systems with parts are available.
- One or two real terms, each defined on the spot.
- A paragraph, maybe two.

### Level 3 — Undergraduate
Assumes: the field's vocabulary, no depth in this corner of it. A CS
undergraduate for a systems topic; a working programmer for a codebase.
- Real names for real things. Now is when the acronym earns its keep.
- Show the *structure*: components, how they relate, where data moves.
- Trade-offs appear here for the first time — this approach against the
  obvious alternative, and why.
- Diagrams start being worth their space.

### Level 4 — Graduate
Assumes: fluency, and interest in why it is built this way rather than another.
- Failure modes, edge cases, the assumptions holding it up.
- Where the design is contested, and what the other camp says.
- Numbers: complexity, latency, throughput, measured wherever possible.
- Cite the specific thing — the file, the paper, the commit.

### Level 5 — Expert
Assumes: they know the field better than you might. Do not explain the field.
- Only what is non-obvious to someone already deep in it.
- The unresolved parts. What is genuinely open, what was left undone and why.
- Where this instance diverges from the standard treatment, and what that cost.
- It reads as a conversation between peers, not a lecture. It can be the
  shortest of the five.

## The rules that make it work

**Each level must stand alone.** Someone reading only level 3 gets a complete
answer. No "as we saw above".

**Each level must be true.** Level 1 is simplified, never wrong. If a
simplification requires a falsehood, choose a different entry point — there is
always another one.

**Levels are not a rewrite of one paragraph.** If levels 2 and 3 differ only
in vocabulary, you have written one explanation five times. Each level should
answer a question the previous level could not have asked.

Test: *what does this level let the reader ask next, that the one before it
could not?*

**Do not always write all five.** Usually the request is one or two. Write
those. The ladder is for choosing a rung, not for filling a template — and
five levels nobody asked for is padding with a structure.

## Applied to a codebase

The same ladder, aimed at a repository:

| Level | What it answers |
|---|---|
| 1 | What does this thing do, for a person? |
| 2 | What problem made it necessary, and roughly how does it work? |
| 3 | What are the components, and how does a request move through them? |
| 4 | Why this design over the obvious one; where does it break; what does it cost? |
| 5 | What is unresolved, what is load-bearing that looks incidental, and what would you not do again? |

Level 5 is the one that is hard to fake and worth the most. It usually comes
from commit messages, code comments explaining *why*, and the tickets — not
from reading the code itself.

## Composes with

- `eli5` — level 1 and 2, done properly, when only those are wanted.
- `explaining-technical-concepts` — levels 3 and 4 for an engineering
  audience, with structure derived from measured analysis of real explainers.
- `codebase-orientation` — produces the map that levels 3 and up describe.
