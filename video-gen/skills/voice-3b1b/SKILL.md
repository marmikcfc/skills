---
name: voice-3b1b
description: Explain a technical or mathematical idea in the 3Blue1Brown (Grant Sanderson) manner — discovery-order exposition, visual-first intuition, the reader as co-thinker. Use when asked to write or explain "like 3b1b", "like Grant Sanderson", to make an explainer feel inevitable rather than lectured, to build intuition before formalism, or to script a visual/animated explanation.
---

# Voice: 3Blue1Brown (Grant Sanderson)

Measured from 8 videos, 55,680 words of Grant's own narration (2025-09 → 2026-07).
Guest videos on the channel were excluded — they measure as a different person.

**Use this for technique, not impersonation.** The goal is explanations that work
the way his do. Don't publish under his name or claim his authorship.

## The one-line thesis

**The audience should feel they could have discovered this themselves.** Every
structural choice serves that: withhold the name until the thing is felt, build the
object before labeling it, and hand over the moment of insight rather than
announcing it.

His own statement of the doctrine, verbatim:

> "So, as always, please do pause and ponder whenever you feel like you see the key
> idea. This argument is not my own."

## Measured fingerprint

| Dimension | Value | What it means |
|---|---|---|
| Sentence length | mean **22.0**, median 20, p10 7, p90 **41** | Long, clause-chained |
| Burstiness | CV **0.61**; **25.6%** ≥30 words, 6.6% ≤5 | Long is the default, short is punctuation |
| Openers | **32%** start with And/So/But/Now | Chains thought; never stacks blocks |
| Stock transitions | **0.28%** However/Moreover | Effectively never — treat as banned |
| Address | you **22.2**/1k · I 8.6 · we 6.5 | Second person dominant |
| Analogy markers | **3.6**/1k | ~3× a comparable technical explainer |
| Questions | 2.9/1k | Sparse but load-bearing |
| Hedges | 4.3/1k | Hedges precision, not confidence |
| MATTR | 0.691 | Wide vocabulary |

**The counterintuitive one:** sentences average 22 words with a quarter over 30 —
yet it never reads dense, because a third of them open with *And / So / But / Now*.
Length is bought back with conjunctions. If you write long sentences that open with
subjects, you get the length without the readability, which is the usual failure of
imitating him.

## Signature moves (all quoted from corpus)

**Recruit the reader as co-author** — `you and i` ×15, `i want you to` ×26:
> "a beautiful compression algorithm showing how to do exactly this that **you and I
> are going to** dig into in the next part"

> "This graph emphasizes the one key point about cross entropy that **I want you to**
> remember from this video"

**Hand over the insight** — `take a moment` ×17, "pause and ponder":
> "let me **take a moment to ask you**, what does this new curve represent?"

> "You might enjoy **taking a moment to pause and ponder** on why that means the proof
> we just outlined works in all of the odd dimensions."

**Show, then name** — `what it looks like` ×18 (18× the rate of the comparison corpus):
> "this right here is **what it looks like** for every point on the surface to undergo
> that bizarre specially defined motion"

**Name the confusion before resolving it:**
> "This is one of those tools where, as a student, you can learn how to use it to
> solve equations, and yet be left completely in the dark about what it's actually
> doing."

**Concede the alternative before advocating:**
> "Both are worthy pursuits, one is not necessarily better than the other, and in
> fact driving is probably more practical. But there is something deeply satisfying
> about popping open the hood."

## Structure

**Openings never state an agenda.** Across 8 videos, zero open with "in this video
we'll cover". They open with a concrete artifact, an anomaly, or a personal moment,
and let the question emerge:

- *An object already on screen* — "What you're looking at, a somewhat complicated diagram that you and I are going to build up in this video…"
- *A personal noticing* — "whenever I look at the back of my beloved 7-month-old baby's head, this little swirl of tiny hairs reminds me of…"
- *A surprising artifact* — "There's a kind of wild paper from 2002 called Language Trees and Zipping…"
- *A live demo* — "I want to show you this simple simulation that I put together…"

**Body:** concrete instance → play with it → the general pattern → *now* the name and
notation → why the definition had to be that way. Notation arrives late, as the
compression of something already understood.

**Closings hand over an open problem** rather than summarizing. Not one of the 8 ends
with a recap:
> "I want you to ask yourself, what would happen if instead you used the KL
> divergence? After all, if the KL divergence is like a distance measure, wouldn't
> this be a more natural choice?"

> "how do you comb down the hairs on a hypersphere in four dimensions?"

## Anti-patterns (absent from 55k words — treat as violations)

- **"In this video we'll cover…"** — agenda-setting openers. 0 of 8.
- **However / Moreover / Furthermore / Additionally** — 0.28%, effectively zero.
- **"It's not just X, it's Y"** — the corrective-antithesis AI tell. Absent.
- **Naming before showing.** Never leads with a definition.
- **Bare assertion of importance.** He demonstrates significance; he doesn't assert it.
- **Recap closings.** Ends on a question or a doorway.
- **Uniform sentence length.** If nothing runs over 30 words, it isn't this voice.

## Applying it to software

The math is incidental; the method transfers directly.

| His move | Software equivalent |
|---|---|
| Start with the object on screen | Start with the actual failing output, trace, or diff |
| Concrete instance before general rule | One real request through the system before the architecture diagram |
| Withhold the name | Show the pattern working, *then* say "this is a circuit breaker" |
| "You and I are going to build" | Derive the design with the reader, don't present it finished |
| Pause and ponder | "Before reading on — where would you put the retry?" |
| Open-problem closing | End on the unresolved tradeoff, not a summary |

## Calibration

Write a passage, then check it against the bands:

- [ ] Mean sentence length 18–26, with ≥20% over 30 words
- [ ] ≥25% of sentences open with And/So/But/Now
- [ ] Zero However/Moreover/Furthermore
- [ ] `you` clearly outnumbers `we` and `I`
- [ ] At least one analogy or "imagine" per ~250 words
- [ ] Opening shows a thing; no agenda statement
- [ ] Closing poses a question or hands over a problem
- [ ] The key insight is stated as something the reader can see, not as a fact told

Measure with:
```bash
# plugin install:
python3 "${CLAUDE_PLUGIN_ROOT}/skills/voice-extractor/scripts/stylometry.py" --target draft.md
# standalone install:
python3 ~/.claude/skills/voice-extractor/scripts/stylometry.py --target draft.md
```

## Worked contrast

**Off-voice** (generic technical explainer):
> In this section, we'll cover connection pooling. Connection pooling is a technique
> for reusing database connections. It's important because establishing connections
> is expensive. However, pools must be sized correctly to avoid contention.

**In-voice:**
> Here's something odd in this trace. The query itself takes 3 milliseconds, but the
> whole request takes 340, and if you look at where that time actually goes, almost
> none of it is spent talking to the database at all. Before a single byte of your
> query goes out, the client has opened a fresh TCP connection, negotiated a TLS
> handshake, and authenticated itself, and then it turns around and does every bit of
> that again on the very next request. So a natural thing to wonder is why we throw
> that work away, when the connection we just finished building was perfectly good.
> And you and I could just keep a handful of them lying around, handing one out
> whenever some request needs it. But take a moment to think about what that breaks.

Measured: mean **22.2** words, **33%** of sentences over 30, **50%** opening with
And/So/But, zero stock transitions. It opens on an anomaly rather than a topic, never
says the words "connection pooling", and ends by handing over the hard part.

(At ~130 words these statistics are noisy — burstiness in particular needs several
hundred words before it means anything. Use passage-level numbers as a smell test,
not a gate.)
