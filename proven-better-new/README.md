# proven-better-new

A Claude Code skill that pressure-tests a product or startup idea using
Mark Pincus's **Proven · Better · New (PBN)** framework, developed at Zynga
and published in *Life at the Speed of Play*.

## What it does

Core premise: human *instincts* are right about 95% of the time, but
specific *ideas* are wrong about 75% of the time. PBN's job is to isolate
the "innovation zone" so a product doesn't die for the *wrong reasons*
before its genuinely novel bet is even seen by the market.

Given a product idea, the skill:

1. **Frames the idea** — restates it in one line and names the target
   audience + platform (Proven is always relative to an audience and
   platform, never abstract).
2. **PROVEN** — identifies the "best of breed" business model, product
   mechanics, and distribution channel the idea must copy near-perfectly,
   grounded in real evidence (retention benchmarks, ARPU, market size) via
   web research rather than asserted from memory. States the #1 "wrong
   reason" failure risk.
3. **BETTER** — lists incremental improvements so obviously superior that
   10/10 existing users would agree, applying a strict consensus gate
   (anything less than universal agreement gets reclassified as New).
4. **NEW** — names the single novel bet, checks it against the **MVP
   trap**, assumes it's wrong (the highest-failure component), names what
   observable **"heat"** would look like if it's working, and requires 2-4
   backup bets ready to test.

Output is a clear verdict (proceed / reframe / kill), a Proven table with
cited evidence, a Better checklist with the consensus gate applied, and the
New bet plus its backups.

## Usage

```
/proven-better-new <product or startup idea>
```

Example: `/proven-better-new a Duolingo for cooking skills`

## Sources

The skill and `references/framework.md` are built from Mark Pincus's own
explanations of PBN across six 2025-2026 podcast appearances promoting
*Life at the Speed of Play* — Lenny's Podcast, Y Combinator, My First
Million, Masters of Scale (w/ Reid Hoffman), The Knowledge Project, and The
Next Big Idea — transcribed via the `usetranscribe` skill. It extends the
core framework with adjacent operating principles from the same material:
the MVP trap, "heat" as a validation signal, founder mode, and treating
distribution as part of the Proven layer.

Structurally informed by an earlier independent implementation:
https://github.com/yangboy91/proven-better-new (MIT).

## Attribution

The PBN framework was developed by Mark Pincus at Zynga. This skill is an
independent implementation of the publicly described framework for use as
a Claude Code skill; it is not affiliated with or endorsed by Zynga or
Mark Pincus.

## License

MIT
