---
name: provider-config
description: Configure which AI model providers serve each capability (TTS, alignment, image, music, video, LLM) and add new ones. Use when swapping a provider, adding an API key, running offline/locally, pinning a model vendor, hitting "no provider available", or extending video-gen with a provider it does not yet support.
---

# Provider configuration

Model vendors churn faster than anything else in this pipeline. The design goal is
that **swapping or adding one is a config edit, not a code change** — and never a
skill edit, because skill prose goes stale invisibly.

## Three layers, deliberately separate

They change at completely different rates, so they live in different places:

| Layer | Changes | Where | Must never contain |
|---|---|---|---|
| **Capability** | Almost never | Code (`scripts/lib/providers.mjs`) | Vendor names |
| **Binding** | Monthly | `providers.json` — commit it | Secrets |
| **Credential** | Per machine | env → `~/.config/video-gen/keys.json` (chmod 600) | Selection logic |

Merging these is the mistake that produces vendor lock-in. If auth and selection
live in one vendor's CLI, that vendor becomes the config surface for everything.

## Capabilities

| Capability | What it produces |
|---|---|
| `tts` | Narration audio from text |
| `align` | Word-level timings from audio (**the decoupling** — see below) |
| `image` | Still images |
| `music` | Soundtrack / BGM |
| `video` | Generated video clips |
| `llm` | Reasoning for classification/synthesis steps |

### Why `align` exists

The pipeline does not need "a TTS with word timestamps". It needs **audio** plus
**word timings** — two separable things. Treating them as one couples voice choice
to whichever vendor happens to emit timings.

So: if the chosen TTS emits timings natively, `align` resolves to `native` and
costs nothing. If it doesn't, an alignment provider recovers them from the
generated audio. Any TTS becomes usable, and timing quality stops gating voice
selection.

## Config

```jsonc
// ~/.config/video-gen/providers.json  (project .video-gen/providers.json wins)
{
  "version": 1,
  "capabilities": {
    "tts":   { "chain": ["cartesia", "elevenlabs", "kokoro"],
               "pin": null,                  // force one provider
               "require": ["word_timings"],  // assert a capability, not a vendor
               "options": { "voice": "…" } },
    "align": { "chain": ["native", "deepgram", "whisper-local"] },
    "image": { "chain": ["openai-image", "flux", "mflux-local"] }
  },
  "policy": { "offline": false, "confirm_paid": true }
}
```

**Resolution precedence:** `--flag` → `VIDEO_GEN_<CAP>_PROVIDER` env → `pin` →
chain order. Chain entries are skipped when they lack the capability, fail a
`require` assertion, are non-local under `policy.offline`, or have no credential.

A `require` entry names a *property* (`word_timings`), never a vendor. That is what
keeps the config from re-encoding lock-in in a new place.

## Common tasks

```bash
# Force a provider for one run
node scripts/narrate.mjs --workdir <dir> --provider elevenlabs

# Force it for a shell session
export VIDEO_GEN_TTS_PROVIDER=cartesia

# Go fully local/offline — every network provider is excluded
#   providers.json → "policy": { "offline": true }

# See what would be chosen right now
node -e "import('./scripts/lib/providers.mjs').then(async m=>{
  const c=await m.loadConfig(), k=await m.loadKeys();
  console.log(m.resolveNarration({config:c, env:process.env, keys:k})); })"
```

## Adding a provider

1. Add a registry entry in `providers.default.json` (or your own `providers.json`):
   ```jsonc
   "myvendor-tts": { "capabilities": ["tts"], "word_timings": false,
                     "key_env": "MYVENDOR_API_KEY", "paid": true }
   ```
2. Add it to the relevant capability `chain`.
3. Write the adapter: `scripts/lib/myvendor-client.mjs` + `normalize-myvendor.mjs`
   returning `{ audio_duration_s, provider, words: [{text,start,end}] }`.
4. Register it in `TTS_ADAPTERS` in `scripts/narrate.mjs`.

**No skill file changes.** If adding a provider requires editing prose, the
abstraction has leaked.

## Registry vs. reality

The registry deliberately lists **more providers than have adapters**. It is the
extension point and the documentation of intent. `narrate.mjs` fails with an
explicit "no adapter is implemented, here is what is" rather than silently
pretending support.

Currently implemented TTS adapters: **cartesia, elevenlabs**. Everything else in
the registry resolves but will tell you it needs an adapter.

## Model IDs are not in this repo

Provider *families* are listed here; specific model IDs (which change monthly) are
not, on purpose. Pin them in your own `providers.json` under `options`, where a
stale value is visible and yours to own — not buried in skill prose that looks
authoritative long after it stops being true.

## Troubleshooting

| Error | Meaning |
|---|---|
| `no provider available for "X"` | Every chain entry was unsuitable or lacked a credential — the message lists each one and why |
| `provider "X" cannot serve Y` | Pinned a provider that doesn't declare that capability, fails a `require`, or is non-local under `offline` |
| `no adapter is implemented` | Resolution worked; the client code doesn't exist yet |
