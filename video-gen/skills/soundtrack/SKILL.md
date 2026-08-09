---
name: soundtrack
description: Add music and sound to a narrated video — choosing or generating a bed, ducking it under narration, scoring to scene beats, and stingers/whooshes on transitions. Use when a video needs background music, BGM, a soundtrack, sound effects, audio mixing, or when narration sounds dry and unfinished.
---

# Soundtrack

A narrated explainer with no bed sounds unfinished in a way viewers feel but rarely
name — the silence between sentences reads as a mistake. This covers the audio
layer *under* narration.

> Not for music-*driven* video, where a track's beat grid dictates every cut. That
> is a different shape entirely: use HyperFrames' `/music-to-video`.

## Where it sits

Music is chosen **after** `/narrate` and before `/animate`, because the narration's
real word timings are what you score against:

```
narrate ──▶ audio.mp3 + word-timestamps.json
                        │
                   soundtrack  ← scene boundaries are known here
                        │
                  assets/music.mp3 + duck envelope
                        │
                    animate ──▶ index.html mixes both tracks
```

## Getting a track

Resolve via the `music` capability (see `provider-config`):

```bash
node -e "import('./scripts/lib/providers.mjs').then(async m=>{
  const c=await m.loadConfig(), k=await m.loadKeys();
  console.log(m.resolveCapability('music',{config:c,env:process.env,keys:k})); })"
```

Order of preference:
1. **A track the user supplies.** Always ask before generating — most people with a
   channel already have a library and a licensing position.
2. **Generated** via the `music` capability.
3. **None.** A 40-second explainer often doesn't need one, and a bad bed is worse
   than silence.

**Licensing is the user's call, not yours.** Never assume a generated or downloaded
track is cleared for their distribution. State what you used and where it came from.

## The mix

Two numbers matter more than the track choice:

| Element | Level | Notes |
|---|---|---|
| Narration | 0 dB reference | Never attenuate the voice to fit music |
| Bed under narration | **−18 to −22 dB** | Below this it's inaudible; above it fights consonants |
| Bed in gaps / cold open | −10 to −12 dB | Where the music gets to breathe |
| Stingers | −8 to −14 dB | Short, on cuts only |

**Duck against word timings, not a fixed envelope.** You already have every word's
start and end, so the ducking can be exact:

- Duck **300ms before** the first word of a run, release **500ms after** the last.
- Do not un-duck for gaps shorter than ~1.2s — the pumping is more distracting
  than the constant level.
- Ride one level per scene rather than per sentence; sentence-level ducking sounds
  nervous.

In the composition, the bed is a second `<audio>` element:

```html
<audio id="soundtrack" src="assets/music.mp3"
       data-start="0" data-duration="<total_s>" data-track-index="11"
       data-volume="0.12"></audio>
```

For a static level, `data-volume` is enough. For real ducking, pre-render the
envelope into the file with ffmpeg `sidechaincompress` (or a volume automation
curve) before it reaches the composition — deterministic rendering means the mix
should be baked, not computed at render time.

## Scoring to structure

Map the bed to the narrative beats rather than letting it run flat:

| Beat | Music |
|---|---|
| Hook | Enter with the first frame, or 1–2s of music alone before the first word |
| Tension | Sparse. Let the unresolved question sit |
| Metaphor | The bed can build here — it's the longest beat |
| Reveal | **Drop or lift on the insight.** The single most effective music move in an explainer |
| Recap | Resolve; let it ring past the last word by 1–2s |

**End on a beat, not a fade-out mid-phrase.** If the track can't resolve inside the
runtime, fade over the last 2s starting *after* the final word.

## Sound effects

Use sparingly and only where they carry meaning:
- **Transitions:** a whoosh on a hard cut, never on every cut.
- **Emphasis:** a soft tick when a number or label lands.
- **Never:** keyboard clatter, cash registers, cartoon boings. They read as
  amateur in technical content.

## Short-form vs long-form

- **TikTok/Reels (<60s):** music is near-mandatory and sits louder (−14 to −16 dB).
  Mobile speakers lose the low end, so favour tracks with midrange presence.
- **YouTube long-form (8min+):** the bed should change or drop between chapters.
  One loop for twelve minutes is fatiguing — silence at chapter breaks is a
  legitimate and underused choice.

## Checklist

- [ ] Narration is never attenuated to make room for music
- [ ] Bed sits −18 to −22 dB under speech
- [ ] Ducking derived from `word-timestamps.json`, not a guessed envelope
- [ ] No un-ducking for gaps under ~1.2s
- [ ] Music resolves rather than fading mid-phrase
- [ ] Track provenance and licensing stated to the user
- [ ] Checked whether the video needs music at all
