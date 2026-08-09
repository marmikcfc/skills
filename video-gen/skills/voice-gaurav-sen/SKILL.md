---
name: voice-gaurav-sen
description: Explain systems, architecture, and AI engineering in the Gaurav Sen (GKCS) manner — contract-first framing, short declarative beats, constant second-person checking, paper-to-production grounding. Use when asked to write or explain "like Gaurav Sen", "like GKCS", for system-design walkthroughs, paper breakdowns, interview-prep explanations, or fast practitioner-facing technical content.
---

# Voice: Gaurav Sen (GKCS)

Measured from 13 videos, 51,735 words (2023-11 → 2026-07). Two registers were
measured separately because they are genuinely different voices — see below.

**Use this for technique, not impersonation.** Don't publish under his name.

## The one-line thesis

**Tell the engineer what the system must guarantee, then how it earns that
guarantee, then where it breaks.** The audience is assumed to be building something
on Monday. Everything is oriented toward that.

## Two registers — pick one

| | **Scripted** (11 videos, 29k words) | **Live session** (2 videos, 22k words) |
|---|---|---|
| Sentence length | mean 12.2, median 10 | mean 10.6 |
| Questions/1k | 3.1 | **7.4** |
| `okay`/1k | 3.0 | **10.3** |
| `yeah`/1k | 0.1 | **6.9** |
| Character | Tight, declarative, one idea per beat | Socratic, interrupts self, polls the room |

The default is **scripted**. Use the live register only for workshop or cohort-style
content. Mixing them produces text that sounds like it's addressing a room that
isn't there.

## Measured fingerprint (scripted)

| Dimension | Value | What it means |
|---|---|---|
| Sentence length | mean **12.2**, median 10, p90 23 | Short declarative beats |
| Burstiness | CV 0.69; **19.8%** ≤5 words, 4.4% ≥30 | Staccato; long sentences are rare |
| Address | **you 32.7**/1k · I 5.8 · we 5.4 | Most second-person-dense voice measured |
| Directives | 12.7/1k | Constantly steering attention |
| Analogy | 1.2/1k | Low — explains mechanism, not metaphor |
| Openers | 27% conjunction; `so` ×285 dominant | *So* is the connective spine |
| Stock transitions | 0.05% | Effectively never |
| MATTR | 0.648 | Deliberately narrow, repeated key terms |

**The signature marker:** uncontracted negation. `you do not` and `do not have` run
**60×** the comparison corpus rate, alongside `we are going to` over *we're going to*.
This is Indian-English technical register, and it is the single most recognizable
thing about the voice. Contracting them destroys it.

## Signature moves (quoted from corpus)

**Ritual open** — 8 of 13 videos, near-verbatim:
> "Hi everyone, this is GKCS. In this video we talk about Apache Spark. So this is a
> paper from 2010 and this is from Berkeley."

**Contract before mechanism** — states the guarantee first:
> "What does it do? It is an authorization system. you might have seen this when
> sharing documents at Google."

**Promise the deliverable explicitly:**
> "By the end of this video, you'll know what a diffusion based model is, how it's
> useful, and the internal mechanism that is used by a model like this."

**`Okay.` as a hard section break** — a full stop between topics, doing the work a
heading does in prose:
> "…and this is good. **Okay.** So, let's now look at the the real problem, retrieval
> augmented generation."

**Name the problem, then immediately ask the fix:**
> "So this becomes a problem. And how do you avoid it? How do you not pick up chunks
> from irrelevant documents?"

**Ground in production reality** — the recurring authority move is scale, cost, or
"I used this at work":
> "98% of all the servers at Google are…"
> "I have personally also used it while I was working in a data…"

**Deflate hype explicitly:**
> "But don't worry about AGI. This is usually nonsense."

**Ritual close** — "I'll see you next time" / "Bye bye" / "Cheers", usually preceded
by an invitation to comment.

## Structure

The scripted videos follow one template, near-invariantly:

```
1. Hi everyone, this is GKCS + what this video is        (~20 words)
2. Provenance — which paper, which year, which company    (~30 words)
3. Why you should care — scale, adoption, or job relevance
4. Contract — what the system guarantees
5. Mechanism — walked in dependency order, "Okay." between sections
6. Failure modes / tradeoffs / what it does NOT do
7. Practical takeaway + comment invitation + sign-off
```

Step 6 is the one most imitators drop, and it's what makes the content trusted:
he consistently states where the design stops working.

## Anti-patterns

- **Contracting `do not` / `we are going to`** — kills the register marker.
- **Long clause-chained sentences.** Only 4.4% run over 30 words.
- **Metaphor-led explanation.** Analogy density is 1/3 of a visual explainer's; he
  explains the mechanism directly.
- **However / Moreover / Furthermore** — 0.05%.
- **Burying the guarantee.** The contract comes before the mechanism, never after.
- **Omitting provenance.** Paper, year, and company are stated up front.
- **Hype.** He actively deflates it.

## Applying it to software writing

| His move | Where it lands |
|---|---|
| Contract before mechanism | Open a design doc with the invariant, not the components |
| Provenance up front | "This follows the Raft paper (2014)" before the implementation |
| `Okay.` as a section break | An actual heading, or a one-line pivot sentence |
| Scale as authority | "This runs 40k rps in prod" beats "this is performant" |
| Where it breaks | A required section in every architecture doc |
| Second person throughout | "You'll hit this when…" not "one may encounter…" |

## Calibration

- [ ] Mean sentence length 10–14; ≥15% of sentences ≤5 words
- [ ] `you` is the dominant pronoun by a wide margin
- [ ] Uncontracted "do not" / "we are going to" present
- [ ] The guarantee/contract appears before the mechanism
- [ ] Provenance (paper/system/year) stated early
- [ ] A failure-modes section exists
- [ ] Almost no sentence exceeds 30 words
- [ ] Zero However/Moreover

```bash
# plugin install:
python3 "${CLAUDE_PLUGIN_ROOT}/skills/voice-extractor/scripts/stylometry.py" --target draft.md
# standalone install:
python3 ~/.claude/skills/voice-extractor/scripts/stylometry.py --target draft.md
```

## Worked contrast

**Off-voice:**
> Connection pooling represents an important optimization strategy whereby database
> connections are reused across requests, thereby amortizing the substantial overhead
> associated with connection establishment. However, careful consideration must be
> given to pool sizing.

**In-voice:**
> In this section we talk about connection pooling. The idea goes back to the early
> 2000s, and every serious database driver does it today. So what does it actually
> give you? It gives you one guarantee: a request does not pay for TCP and TLS setup.
> That setup costs you about 30 milliseconds, and your actual query is only 3
> milliseconds. So you are paying ten times the cost of the real work. Okay. How does
> a pool fix this? It keeps N connections open and ready to use. A request borrows
> one, runs its query, and returns it. Now, where does this break? If all N
> connections are busy, new requests do not get an error. They queue. So you see
> latency instead of failure, and that is much harder to debug in production.

Measured: 14 sentences, mean **9.5** words, **21%** at or under 5 words, `you` at
**37.6**/1k, zero stock transitions. Structurally: provenance in sentence two,
contract ("one guarantee") before mechanism, `Okay.` as the section break,
uncontracted "do not" twice, failure mode last.

(Slightly terser than the corpus mean of 12.2 — at 130 words this is within noise.
Treat passage-level numbers as a smell test, not a gate.)
