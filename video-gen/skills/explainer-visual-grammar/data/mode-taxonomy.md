# Tile classification brief

You are classifying still frames from an educational video into **production modes** —
what kind of material had to be *made or sourced* to put that frame on screen.
Classify what you SEE. Do not infer from knowledge of the creator or channel.

## The nine modes — assign exactly one per tile

| Code | Mode | What it looks like |
|---|---|---|
| `CONSTRUCT` | Purpose-built animation | Diagram, plot, geometry, equation or motion graphic **rendered for this video** on a plain canvas. Clean vector/typeset look. Math animation, data viz built to be animated. |
| `ANNOTATE` | Hand-marked canvas | Handwritten or hand-drawn strokes, arrows, circles, labels — looks drawn by hand, usually layered onto a canvas that already had content. |
| `CAPTURE` | Software/site walkthrough | Screenshot or screen recording of a real app, website, IDE, terminal or product UI, shown as *the thing being demonstrated*. |
| `DOCUMENT` | Cited evidence | A paper, article, PDF, news page or report shown as *proof of a claim* — typically framed/floating, often with a highlighted or emphasised passage. |
| `FOOTAGE` | Borrowed real-world imagery | Photographic or video material of the real world not made for this video: stock, archival, news, b-roll, street scenes, facilities. |
| `TALKING_HEAD` | People on camera | Human faces addressing camera, interview, conversation footage. |
| `TITLE` | Text card | Text-dominant frame on a plain background: title, chapter heading, quote, list of terms. Little or no illustration. |
| `BRAND` | Sponsor / channel promo | Logo grids, sponsor slides, product marketing, channel promotion, subscribe cards. |
| `BLANK` | Empty | Solid black/white with no content. |

**Disambiguation rules**
- `CAPTURE` vs `DOCUMENT`: is the software *the subject* (CAPTURE) or is the page
  *evidence for an assertion* (DOCUMENT)? A news article being cited = DOCUMENT.
  A demo of an app = CAPTURE.
- `CONSTRUCT` vs `ANNOTATE`: does it look machine-rendered and precise (CONSTRUCT)
  or hand-marked and irregular (ANNOTATE)? A precise diagram with handwritten arrows
  on top = ANNOTATE (the annotation is the newer layer).
- `FOOTAGE` vs `TALKING_HEAD`: faces incidental in a scene = FOOTAGE; a person
  speaking as a source/host = TALKING_HEAD.
- Marketing slide from a company = `BRAND`.

## Per-tile attributes

- **anchor** — does an element from the IMMEDIATELY PRECEDING tile appear to still be
  on screen in roughly the same position? `Y` / `N` / `?`. First tile of sheet 01 = `N`.
- **dens** — how much text is on screen: `none` / `low` / `high`.

## Required output

First, one line per tile, exactly this format and nothing else on the line:

```
s01t01 CONSTRUCT anchor=N dens=low
s01t02 ANNOTATE anchor=Y dens=high
```

Cover every tile in every sheet given to you, in order. If a tile is padding at the
end of the last sheet (empty white filler rather than video content), use `BLANK`.

After the table, add these short sections:

**BLOCKS** — list runs of 3+ consecutive tiles in the same mode, as
`MODE xN (s01t04-s01t09)`.

**ANCHOR** — is there a specific recurring element that holds screen position across
many tiles? Describe it and give the tile range. If none, say none.

**EMPHASIS** — how is the viewer's attention directed within a frame? (highlight
colour, boxing, zoom, arrows, colour-coding with consistent meaning). Be specific
about colours and whether their meaning is consistent.

**TRANSITIONS** — when the mode changes, is it a hard cut to unrelated content, or
does something carry over? Give 2–3 concrete examples.

**UNSURE** — tiles you could not classify confidently, with your best guess.

Be terse. No preamble. Do not speculate about audio, narration or timing — you
cannot hear anything.
