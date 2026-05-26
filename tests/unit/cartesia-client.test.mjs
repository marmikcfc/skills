import { test } from "node:test";
import assert from "node:assert/strict";
import { callCartesia } from "../../scripts/lib/cartesia-client.mjs";

// Build a Cartesia SSE stream the way the real /tts/sse endpoint does:
// a sequence of `data: {json}\n\n` events — audio chunks + a timestamps event
// (parallel words/start/end arrays) + a terminating done event.
function sseStream(audioChunksB64, wt) {
  const events = [];
  for (const data of audioChunksB64) {
    events.push(`data: ${JSON.stringify({ type: "chunk", data, done: false, status_code: 206 })}`);
  }
  events.push(`data: ${JSON.stringify({ type: "timestamps", word_timestamps: wt, done: false, status_code: 206 })}`);
  events.push(`data: ${JSON.stringify({ type: "done", done: true, status_code: 200 })}`);
  return events.join("\n\n") + "\n\n";
}

test("callCartesia hits /tts/sse with required headers and well-formed body", async () => {
  const b64 = (s) => Buffer.from(s).toString("base64");
  let captured;
  const fetchFn = async (url, opts) => {
    captured = { url, opts };
    return new Response(
      sseStream([b64("AAAA"), b64("BBBB")], {
        words: ["Why", "does", "ice", "float?"],
        start: [0.1, 0.2, 0.3, 0.4],
        end: [0.2, 0.3, 0.4, 0.5],
      }),
    );
  };

  // Inject an identity encoder so we can assert the aggregated PCM bytes
  // (the real encoder shells out to ffmpeg, which we don't exercise here).
  const out = await callCartesia({
    text: "Why does ice float?",
    apiKey: "k",
    fetchFn,
    encodePcmToMp3: async (pcm) => pcm,
  });

  // Endpoint + headers
  assert.equal(captured.url, "https://api.cartesia.ai/tts/sse");
  assert.equal(captured.opts.headers["X-API-Key"], "k");
  assert.match(captured.opts.headers["Cartesia-Version"], /^\d{4}-\d{2}-\d{2}$/);

  // Body shape required by the live API: /tts/sse only supports the raw container
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.transcript, "Why does ice float?");
  assert.ok(body.model_id, "model_id is required");
  assert.equal(body.voice.mode, "id");
  assert.ok(body.voice.id, "voice.id (a UUID) is required");
  assert.equal(typeof body.output_format, "object");
  assert.equal(body.output_format.container, "raw");
  assert.ok(body.output_format.encoding, "raw container requires an encoding");
  assert.equal(body.add_timestamps, true);

  // Aggregated PCM = concatenated chunk bytes, handed to the encoder
  assert.equal(Buffer.from(out.audio_base64, "base64").toString(), "AAAABBBB");

  // Parallel timestamp arrays collapse into the {word,start,end} shape normalizeCartesia expects
  assert.equal(out.raw.word_timestamps.length, 4);
  assert.deepEqual(out.raw.word_timestamps[0], { word: "Why", start: 0.1, end: 0.2 });
  assert.deepEqual(out.raw.word_timestamps[3], { word: "float?", start: 0.4, end: 0.5 });
  assert.equal(out.raw.duration, 0.5);
});

test("callCartesia surfaces a non-2xx error with status and body", async () => {
  const fetchFn = async () =>
    new Response("Invalid Cartesia-Version header", { status: 400 });
  await assert.rejects(
    () => callCartesia({ text: "hi", apiKey: "k", fetchFn }),
    (e) => e.status === 400 && /cartesia 400/.test(e.message),
  );
});
