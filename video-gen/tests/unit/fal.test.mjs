import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { callFal, FAL_CATEGORIES, FAL_QUEUE } from "../../scripts/lib/fal-client.mjs";
import { normalizeFal } from "../../scripts/lib/normalize-fal.mjs";
import { callFalTts, TIMESTAMPED_TTS_MODELS } from "../../scripts/lib/fal-tts.mjs";
import { resolveCapability, resolveNarration, modelFor, CONFIG_PATHS } from "../../scripts/lib/providers.mjs";

const base = async () => JSON.parse(await readFile(CONFIG_PATHS.defaults, "utf8"));
const res = (body, ok = true, status = 200) => ({
  ok, status, text: async () => JSON.stringify(body), json: async () => body,
  arrayBuffer: async () => new TextEncoder().encode("AUDIO").buffer,
});

/** Mock of the documented queue flow: submit -> status(IN_QUEUE) -> status(COMPLETED) -> result. */
function queueMock(result, { statusSequence = ["IN_QUEUE", "COMPLETED"] } = {}) {
  const calls = [];
  let i = 0;
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? "GET", body: opts.body ? JSON.parse(opts.body) : null,
                 auth: opts.headers?.Authorization });
    if (opts.method === "POST") {
      return res({ request_id: "req-1",
                   status_url: `${FAL_QUEUE}/m/requests/req-1/status`,
                   response_url: `${FAL_QUEUE}/m/requests/req-1` });
    }
    if (url.endsWith("/status")) return res({ status: statusSequence[Math.min(i++, statusSequence.length - 1)] });
    return res(result);
  };
  return { fetchFn, calls };
}

test("callFal follows submit → poll → result and sends the Key auth header", async () => {
  const { fetchFn, calls } = queueMock({ ok: 1 });
  const out = await callFal({ model: "fal-ai/flux/dev", input: { prompt: "x" },
                              apiKey: "K", fetchFn, sleep: async () => {} });
  assert.deepEqual(out, { ok: 1 });
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, `${FAL_QUEUE}/fal-ai/flux/dev`);
  assert.equal(calls[0].auth, "Key K");
  assert.ok(calls.some((c) => c.url.endsWith("/status")), "must poll status");
  assert.equal(calls.at(-1).url, `${FAL_QUEUE}/m/requests/req-1`);
});

test("callFal surfaces a terminal non-COMPLETED status", async () => {
  const { fetchFn } = queueMock({}, { statusSequence: ["FAILED"] });
  await assert.rejects(() => callFal({ model: "m", input: {}, apiKey: "K", fetchFn, sleep: async () => {} }),
    /ended in status FAILED/);
});

test("callFal times out rather than polling forever", async () => {
  const { fetchFn } = queueMock({}, { statusSequence: ["IN_PROGRESS"] });
  let t = 0;
  await assert.rejects(
    () => callFal({ model: "m", input: {}, apiKey: "K", fetchFn, sleep: async () => { t += 1000; },
                    now: () => t, timeoutMs: 3000 }),
    /still IN_PROGRESS/);
});

test("callFal requires model and key", async () => {
  await assert.rejects(() => callFal({ input: {}, apiKey: "K" }), /model is required/);
  await assert.rejects(() => callFal({ model: "m", input: {} }), /FAL_KEY is required/);
});

// --- normalization across the shapes fal actually returns ---

test("normalizes scribe-v2 words[] and drops non-word entries", () => {
  // Shape taken verbatim from the model's own OpenAPI example.
  const r = normalizeFal({
    words: [
      { start: 0.079, end: 0.539, text: "Hey,", type: "word", speaker_id: "speaker_0" },
      { start: 0.539, end: 0.6, text: " ", type: "spacing", speaker_id: "speaker_0" },
      { start: 0.6, end: 1.1, text: "there", type: "word", speaker_id: "speaker_0" },
    ],
  }, { model: "scribe" });
  assert.deepEqual(r.words.map((w) => w.text), ["Hey,", "there"]);
  assert.equal(r.audio_duration_s, 1.1);
});

test("normalizes an audio url and ms durations", () => {
  const r = normalizeFal({
    audio: { url: "https://fal.media/x.mp3" }, duration_ms: 2500,
    timestamps: [{ text: "hi", start_ms: 0, end_ms: 400 }],
  });
  assert.equal(r.audio_url, "https://fal.media/x.mp3");
  assert.equal(r.audio_duration_s, 2.5);
  assert.deepEqual(r.words, [{ text: "hi", start: 0, end: 0.4 }]);
});

test("falls back to character-level alignment when no word array is present", () => {
  const r = normalizeFal({
    characters: ["h", "i", " ", "y", "o"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5],
  });
  assert.deepEqual(r.words.map((w) => w.text), ["hi", "yo"]);
});

test("no usable timings produces an actionable error, not a silent empty result", () => {
  assert.throws(() => normalizeFal({ audio: { url: "u" } }, { model: "fal-ai/minimax/speech-02-hd" }),
    /no usable word timings[\s\S]*timestamps:true[\s\S]*'align' capability/);
});

// --- TTS adapter ---

test("fal TTS requests timestamps for a known-timestamped model", async () => {
  const { fetchFn, calls } = queueMock({ audio: { url: "u" }, timestamps: [{ text: "a", start: 0, end: 1 }] });
  await callFalTts({ text: "a", apiKey: "K", fetchFn, sleep: async () => {},
                     options: { voice: "Rachel" } });
  const submit = calls.find((c) => c.method === "POST");
  assert.equal(submit.body.timestamps, true);
  assert.equal(submit.body.voice, "Rachel");
  assert.equal(submit.url, `${FAL_QUEUE}/fal-ai/elevenlabs/tts/turbo-v2.5`);
});

test("an unknown-timestamp model that returns none fails with guidance", async () => {
  const { fetchFn } = queueMock({ audio: { url: "u" } });
  await assert.rejects(
    () => callFalTts({ text: "a", apiKey: "K", fetchFn, sleep: async () => {},
                       model: "fal-ai/minimax/speech-02-hd" }),
    /not known to return word timestamps[\s\S]*fal-models\.mjs/);
  assert.ok(!TIMESTAMPED_TTS_MODELS.has("fal-ai/minimax/speech-02-hd"));
});

// --- registry integration ---

test("fal is registered for every capability we probed on the live catalog", async () => {
  const c = await base();
  const fal = c.registry.fal;
  for (const cap of ["tts", "align", "image", "music", "video", "avatar", "lipsync"]) {
    assert.ok(fal.capabilities.includes(cap), `fal should declare ${cap}`);
    assert.ok(fal.models[cap], `fal needs a default model for ${cap}`);
    assert.ok(c.capabilities[cap].chain.includes("fal"), `${cap} chain should include fal`);
  }
});

test("every fal category we map is one the live API actually uses", () => {
  // text-to-music and lipsync returned ZERO active models when probed; the real
  // homes are text-to-audio and video-to-video. Pin that so it can't regress.
  assert.deepEqual(FAL_CATEGORIES.music, ["text-to-audio"]);
  assert.deepEqual(FAL_CATEGORIES.lipsync, ["video-to-video"]);
  assert.deepEqual(FAL_CATEGORIES.avatar, ["audio-to-video"]);
});

test("resolving fal yields its per-capability model", async () => {
  const c = await base();
  const r = resolveCapability("image", { config: c, env: { FAL_KEY: "K" }, flag: "fal" });
  assert.equal(r.provider, "fal");
  assert.equal(r.model, "fal-ai/flux/dev");
});

test("options.model overrides the registry default", async () => {
  const c = await base();
  c.capabilities.image.options = { model: "fal-ai/nano-banana-pro" };
  assert.equal(modelFor("image", "fal", c), "fal-ai/nano-banana-pro");
});

test("direct (non-gateway) providers resolve with model null", async () => {
  const c = await base();
  const r = resolveCapability("tts", { config: c, env: { CARTESIA_API_KEY: "c" } });
  assert.equal(r.provider, "cartesia");
  assert.equal(r.model, null);
});

test("fal alone can serve a whole narration: tts native timings, no align pass", async () => {
  const c = await base();
  c.capabilities.tts.chain = ["fal"];
  const { tts, align } = resolveNarration({ config: c, env: { FAL_KEY: "K" } });
  assert.equal(tts.provider, "fal");
  assert.equal(tts.model, "fal-ai/elevenlabs/tts/turbo-v2.5");
  assert.equal(align.provider, "native");
});

test("fal serves align when the TTS has no timings", async () => {
  const c = await base();
  c.capabilities.tts.chain = ["openai-tts"];
  c.capabilities.align.chain = ["native", "fal"];
  const { tts, align } = resolveNarration({ config: c, env: { OPENAI_API_KEY: "o", FAL_KEY: "K" } });
  assert.equal(tts.provider, "openai-tts");
  assert.equal(align.provider, "fal");
  assert.equal(align.model, "fal-ai/elevenlabs/speech-to-text/scribe-v2");
});
