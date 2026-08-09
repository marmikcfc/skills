// Cartesia Text-to-Speech client.
//
// Word timestamps are only available from the streaming /tts/sse endpoint
// (/tts/bytes returns finished audio but no timing). That endpoint only
// supports the "raw" PCM container, so we stream raw PCM + timestamps and
// encode the aggregated PCM to mp3 with ffmpeg (already a pipeline dependency).
// See https://docs.cartesia.ai/api-reference/tts/tts

import { spawn } from "node:child_process";

// The Cartesia-Version header is REQUIRED on every request (YYYY-MM-DD form).
const CARTESIA_VERSION = process.env.CARTESIA_VERSION || "2026-03-01";
const DEFAULT_MODEL = process.env.VIDEO_GEN_CARTESIA_MODEL || "sonic-2";
// A valid Cartesia voice UUID is required; override via VIDEO_GEN_CARTESIA_VOICE.
const DEFAULT_VOICE = process.env.VIDEO_GEN_CARTESIA_VOICE || "694f9389-aac1-45b6-b726-9d9369183238";
const SAMPLE_RATE = 44100;

// Encode mono signed-16-bit-LE PCM to mp3 via ffmpeg, over stdio pipes.
function ffmpegPcmToMp3(pcm, { sampleRate = SAMPLE_RATE, channels = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-f", "s16le", "-ar", String(sampleRate), "-ac", String(channels), "-i", "pipe:0",
      "-f", "mp3", "pipe:1",
    ]);
    const out = [];
    const err = [];
    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => err.push(d));
    ff.on("error", (e) => reject(new Error(`ffmpeg failed to start (is it installed?): ${e.message}`)));
    ff.on("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(out))
        : reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(err).toString()}`)));
    ff.stdin.on("error", () => {}); // swallow EPIPE if ffmpeg exits early
    ff.stdin.write(pcm);
    ff.stdin.end();
  });
}

// Yield each parsed `data:` JSON object from an SSE response body.
async function* iterSSE(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const drain = function* () {
    let sep;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload) yield JSON.parse(payload);
      }
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    yield* drain();
  }
  buf += decoder.decode();
  buf += "\n\n"; // flush any final event missing the trailing blank line
  yield* drain();
}

export async function callCartesia({
  text,
  apiKey,
  voiceId = DEFAULT_VOICE,
  modelId = DEFAULT_MODEL,
  fetchFn = fetch,
  encodePcmToMp3 = ffmpegPcmToMp3,
}) {
  const res = await fetchFn("https://api.cartesia.ai/tts/sse", {
    method: "POST",
    headers: {
      "Cartesia-Version": CARTESIA_VERSION,
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      voice: { mode: "id", id: voiceId },
      // /tts/sse only supports the raw container; we encode to mp3 below.
      output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: SAMPLE_RATE },
      language: "en",
      add_timestamps: true,
    }),
  });

  if (!res.ok) {
    const e = new Error(`cartesia ${res.status}: ${await res.text()}`);
    e.status = res.status;
    throw e;
  }

  const pcmBuffers = [];
  const words = [];
  const starts = [];
  const ends = [];
  for await (const evt of iterSSE(res)) {
    if (evt.type === "error") {
      throw new Error(`cartesia stream error: ${evt.error ?? JSON.stringify(evt)}`);
    }
    if (evt.type === "chunk" && evt.data) {
      pcmBuffers.push(Buffer.from(evt.data, "base64"));
    } else if (evt.type === "timestamps" && evt.word_timestamps) {
      const wt = evt.word_timestamps;
      words.push(...(wt.words ?? []));
      starts.push(...(wt.start ?? []));
      ends.push(...(wt.end ?? []));
    }
  }

  const word_timestamps = words.map((word, i) => ({ word, start: starts[i], end: ends[i] }));
  const duration = ends.length ? ends[ends.length - 1] : 0;
  const mp3 = await encodePcmToMp3(Buffer.concat(pcmBuffers), { sampleRate: SAMPLE_RATE, channels: 1 });
  const audio_base64 = mp3.toString("base64");

  return { audio_base64, raw: { voice_id: voiceId, duration, word_timestamps } };
}
