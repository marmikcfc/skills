---
name: codebase-orientation
description: Walk into an unfamiliar repository and produce a map — what it is for, how it is arranged, what is load-bearing, what to read first, and what would surprise you. Use when opening a repo for the first time, when onboarding someone, when returning to a project after months away, or when asked "what is this?" about code nobody present wrote recently.
---

# Codebase Orientation

The goal is a map someone can act on within minutes, not a summary of every
directory. A file listing is not orientation.

## What orientation actually has to answer

Four questions, in this order. Anything that does not serve one of them is
padding.

1. **What is this for?** One sentence, in a user's terms.
2. **What is the shape?** The three-to-five parts that matter and how they
   relate. Not every directory — the ones a change would touch.
3. **What holds it up?** The invariants and decisions that look arbitrary and
   are not. This is the part that saves the most time and is hardest to get.
4. **Where do I start reading?** One file. Not a list — one.

## Where to look, in order of value per minute

Read in this order and stop when the picture is good enough. Each is roughly
in descending order of insight per unit of effort.

**README, and the top of the main entry point.** Ten minutes, and often 60% of
the answer. Take the README's *claims* as claims, not as facts — check one.

**The tests.** The best documentation in most repositories, because they
cannot go stale without failing. Test names describe intended behaviour in
the author's own words. A test file's *docstring* is often the clearest
statement of a subsystem's contract that exists anywhere.

**Comments that explain *why*.** `grep` for "because", "deliberately",
"rather than", "do not", "must". These mark the decisions someone was afraid
would be undone — which is exactly the load-bearing knowledge from question 3,
and it exists nowhere else.

**Commit messages on the files that change most.** `git log --format='%s'`
over a hot file tells you what keeps going wrong there.

**The tickets, if you can reach them.** Why something exists lives in the
ticket far more often than in the code.

**The code itself, last.** By the time you get here you should be checking a
hypothesis, not forming one.

## Finding the shape without reading everything

Cheap signals, roughly in order:

```bash
# What is big, and therefore probably load-bearing?
find . -name '*.swift' -not -path './.build/*' | xargs wc -l | sort -rn | head -20

# What changes together? Coupling the directory structure hides.
git log --format='%H' -n 200 | while read c; do
  git show --name-only --format='' $c | grep -v '^$' | sort -u | paste -sd' '
done | sort | uniq -c | sort -rn | head

# What changes most? Where the risk and the activity are.
git log --format='' --name-only -n 500 | sort | uniq -c | sort -rn | head -20

# Where the "why" is written down.
grep -rn "because\|deliberately\|rather than\|do NOT\|must not" --include='*.swift' . | head -30
```

The second one is the highest-value and the least used: files that keep
changing in the same commit are coupled regardless of what the directory
layout implies.

## Read the tests before the implementation

Worth stating separately because it is the habit people skip. A test tells you
what the code is *supposed* to do; the implementation tells you what it
happens to do. When they disagree, you have found something worth knowing —
and you will not spot the disagreement if you only read one of them.

## The surprise

Every codebase has at least one thing that looks wrong until you know why. An
orientation that omits it has not oriented anybody — the reader will find it
on their own, at the worst moment, and conclude the code is bad.

Look for it in:
- A comment defending a decision at unusual length.
- A workaround with a linked issue.
- Something reimplemented that a standard library already provides.
- A constant with an oddly specific value.
- Anything the tests guard obsessively.

Say it plainly: *"X looks like Y, and it is not, because Z."*

## What to produce

Keep it to roughly one screen. A map that takes an hour to read is a second
codebase.

```
WHAT IT IS
  One sentence, in a user's terms.

SHAPE
  3–5 parts, each one line: what it owns, what it talks to.

LOAD-BEARING
  The invariants. The ones that would be violated by a plausible change.

SURPRISES
  The things that look wrong and are not.

START HERE
  One file, and what to notice in it.

WHAT I DID NOT CHECK
  Stated plainly. An orientation that hides its own gaps is worse
  than a shorter one that names them.
```

That last section matters more than it looks. Orientation is done under time
pressure and is always incomplete; the difference between a useful map and a
misleading one is whether it admits where it stops.

## Composes with

- `eli5` — for the "what is this for" line when the domain is unfamiliar too.
- `five-levels` — when the reader wants to choose their depth rather than take
  yours.
- `explaining-technical-concepts` — for turning the map into a walkthrough for
  an engineering audience.
- `explain-diff` — orientation on a *change* rather than on a codebase.
