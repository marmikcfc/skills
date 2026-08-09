---
name: voice-extractor
description: Extract a reusable voice/style profile from writing or transcript samples, and check drafts against it. Use when someone says "write like me", "match this tone", "clone this voice", "capture our brand voice", "make this sound less AI", or wants a style guide, author profile, or voice fingerprint built from samples. Also use to audit a draft against an existing profile.
---

# Voice Extractor

A voice is not a vibe. It is a **vector of measurable habits** — how long sentences
run and how much that varies, which function words recur, how sentences open, how
often the reader is addressed, which moves recur at the same structural position.

Measure those, store each as a number with a tolerance band, and "make it sound
like me" becomes a set of deterministic checks instead of an argument about taste.

Everything below assumes: **measure first, characterize second.** Impressions of a
corpus are unreliable and tend to describe the most memorable passage rather than
the typical one.

## Modes

| Mode | Output | When |
|---|---|---|
| `quick` | 10 signature phrases, 3 anti-patterns, one-line energy descriptor | Thin samples (300–800 words), fast reference |
| `standard` | Full profile: cadence bands, lexicon, structure, anti-patterns, validation | **Default.** AI training, ghostwriting, style guides |
| `deep` | Standard + per-register variants + a reusable skill file + worked rewrites | Building a durable skill or onboarding writers |

## Step 0 — Provenance gate (do this before anything else)

**The medium the samples came from determines which lenses are valid.** Running
every lens on every corpus produces confident numbers that describe the wrong
person. Classify the corpus first:

| Source | Valid lenses | Invalid — do not measure |
|---|---|---|
| Native writing (email, Slack, posts, docs) | All | — |
| **Human-authored captions / subtitles** | Cadence, lexicon, openers, structure, address | Punctuation habits, capitalization, emoji |
| **Auto-generated captions (ASR)** | Lexicon, signature phrases only | Cadence, sentence length, openers, punctuation |
| Edited/ghostwritten (press, marketing) | Structure only, flagged low-confidence | Everything else — it's the editor's voice |
| Translated | None reliably | Flag: the profile describes the translator |

**Detecting ASR captions:** count sentence-ending periods per 100 words. Native
writing and human captions run 3–9. **Below ~2 means the text is unpunctuated ASR**
— its "sentences" are arbitrary caption merges, and any cadence statistic computed
from it is fiction. Exclude those documents from cadence and openers, keep them for
vocabulary, and *say so in the profile*.

Punctuation deserves special care. The em-dash rate is the single most-cited AI
tell, but in a transcript **the captioner chose the dashes, not the speaker**. Never
build a punctuation rule from a transcript corpus.

**Sample priority (most → least authentic):** raw Slack/email → transcripts →
long-form posts → website copy. Polish destroys the signal you want.

**Minimum viable corpus:** 500 words for `quick`, 3,000+ for `standard`, 5+
documents across contexts for `deep`. Below the floor, say so and drop a mode
rather than producing a confident profile from thin evidence.

## Step 1 — Pick a contrastive baseline

This is the step the naive approach skips, and it is where most of the signal is.

A raw frequency list tells you the author says "the" a lot. Useless. What you need
is what they do **more than a comparable speaker does**. Always measure the target
corpus *against a reference corpus* — ideally another author in the same genre and
register, otherwise a general-English baseline.

> Working it in practice: comparing two technical explainers, one's raw top words
> were unremarkable. Against the other as reference, `okay` (277 sentence-openers)
> and the uncontracted `do not` / `we are going to` jumped out at 20–50× — a
> register marker invisible in isolation, and one of the most imitable things about
> that voice.

Without a baseline, n-gram keyness returns **topic**, not style. If the top results
are domain nouns ("the sphere", "vector database"), the lens is misconfigured:
restrict n-grams to function/discourse words only.

## Step 2 — Run the lenses

`scripts/stylometry.py` computes all of these. Run it before forming an opinion.

```bash
/usr/bin/python3 scripts/stylometry.py --target 'corpus/*.md' --compare 'other/*.md'
```

**1. Cadence & burstiness.** Mean, median, p10, p90, stdev, and the coefficient of
variation `CV = stdev/mean`. CV matters more than the mean: human writing mixes
short and long deliberately; AI clusters everything at 15–22 words. Also record the
share of sentences ≤5 words and ≥30 words. Two authors can share a mean of 16 and
sound nothing alike — one alternating 4 and 40, the other flat at 16.

**2. Lexical diversity (MATTR).** Moving-average type-token ratio over a ~100-word
window. Length-independent, unlike raw TTR. AI prose reuses safe words, so its
diversity runs *lower* than a human's.

**3. Function-word signature.** Frequencies of the most common function words as
rates per 1k. Content-independent, so it holds across a tweet and an essay.

**4. Sentence openers.** Tally the first word of every sentence. Record the
conjunction-start rate (But/And/So) and the stock-transition rate
(However/Moreover/Furthermore). If the corpus shows 0% stock transitions, they
become a block rule — that's an LLM importing scaffolding the author never uses.

**5. Address and person.** Rates per 1k of `I`, `we`, `you`. This single ratio
separates lecturing from co-thinking from instructing, and it is the fastest thing
to get wrong when imitating a voice.

**6. Rhetorical density.** Rates of analogy markers (imagine / think of / like a /
suppose), hedges, rhetorical questions, and second-person directives (you might
notice / take a moment / let's say).

**7. Signature n-grams.** 2–4-grams over-represented vs. the baseline, **restricted
to function-word-only sequences**. These are the literal substrate of a voice.

**8. Structural position.** Not a word count — read the first 60 and last 45 words
of every document. Openings and closings are the most ritualized, most imitable
part of any voice, and they reveal the author's model of the reader faster than
anything in the body.

**9. The inverse fingerprint.** What the corpus *never* does. Absence is a rule:
zero instances of "However" across 55k words is a strong constraint. Also flag
generic AI tells — corrective antithesis ("it's not X, it's Y"), throat-clearing
temporals ("in today's fast-paced world"), buzzwords (delve, leverage, robust,
seamless, unlock), hedge pile-ups, back-to-back tricolons.

## Step 3 — Separate voice from technique

Two different things fall out of a corpus, and conflating them produces a profile
that mimics tics without reproducing quality:

- **Voice** — cadence, diction, address, verbal tics. Person-specific. Imitating it
  makes text *sound* like them.
- **Technique** — how they sequence an explanation, where they put the concrete
  example, when they name the abstraction, what they refuse to assume. Transferable.
  Adopting it makes text *work* like theirs.

Label every finding as one or the other. For a "teach me to explain like X" request,
technique is the payload and voice is nearly irrelevant.

## Step 4 — Watch for corpus contamination

Before generalizing, verify every document is actually the target speaker:

- **Guest authors / co-writers** publishing under the same brand. Check for outliers
  in the person-rates — a document at `we` 17.6/1k inside a corpus averaging 6.5/1k
  is usually a different human.
- **Register splits.** A conference talk and a scripted video are different
  registers. Don't average them into mush — produce per-register variants, or pick
  one and say which.
- **Format artifacts.** Sponsor reads, subscribe outros, and caption-tool banners
  are not voice. Strip them.

## Step 5 — Build the profile

```yaml
profile: {name, generated, sample_count, total_words, provenance, confidence}
cadence: {mean, median, p10, p90, cv, short_pct, long_pct, rhythm}
lexicon: {mattr, signature_phrases[], signature_words[], hedges_used[], hedges_never[]}
address: {i_per_1k, we_per_1k, you_per_1k, stance}
openers: {conjunction_pct, stock_pct, observed[], banned[]}
rhetoric: {analogy_per_1k, question_per_1k, directive_per_1k, analogy_domains[]}
structure: {opening_pattern, body_pattern, closing_pattern}
anti_patterns: [{pattern, severity: block|warn, evidence}]
registers: {context: {shift, notes}}
```

Every field must trace to observed behavior. If a field can't be measured from the
corpus, mark it `unknown` — never fill it from the author's job title, industry, or
your prior about how such a person writes.

## Step 6 — Validate (required)

Generate the same 80-word passage twice: once under the profile, once deliberately
off-voice. Show both and ask which sounds right. If the two are hard to tell apart,
the profile is too weak to be useful — go back to Step 1 and get a sharper baseline.

## Step 7 — Self-critique (required)

- [ ] Is every signature phrase quoted from the corpus, or did I infer some?
- [ ] Are anti-patterns specific words/structures, or vague categories?
- [ ] Did I check provenance before computing punctuation or cadence?
- [ ] Did I use a contrastive baseline, or just raw frequencies?
- [ ] Are numbers stated as bands with sample sizes, not bare point estimates?
- [ ] Would someone else reproduce this profile from the same corpus?

State any that fail. A profile with two anti-patterns and no validation is not
finished — say so rather than shipping it.

## Output

Offer these; produce what fits the ask:

| File | Purpose |
|---|---|
| `voice-profile.yaml` | Machine-readable, for tooling |
| `style-guide.md` | Human-readable, for people |
| `SKILL.md` | A reusable skill, when the voice will be used repeatedly |

For a repeatedly-used voice, the skill file is the right artifact: it loads on
demand and can carry the worked examples a YAML file can't.

## Ethics

- **Consent for private individuals.** Don't fingerprint a non-participating person's
  private writing. Ghostwriting with the subject's knowledge is fine.
- **Public educational work is fair to study** — that's what it's published for. Aim
  at *technique* ("explain like they explain"), not at passing work off under their
  name. A skill named for a creator should teach their method, not impersonate them.
- **Not a detector-evasion tool.** The goal is sounding like a specific person, not
  defeating a classifier. Decline that framing and offer the real thing.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Keyness returns topic nouns | No function-word restriction | Filter n-grams to function words |
| Absurd stdev / CV > 2 | Unpunctuated ASR merged into one "sentence" | Provenance gate, exclude those docs |
| Profile reads generic | No contrastive baseline | Re-measure against a peer corpus |
| Imitation sounds like parody | Copied tics, skipped technique | Separate voice from technique (Step 3) |
| Bimodal metrics | Mixed authors or registers | Split corpus, check person-rate outliers |
