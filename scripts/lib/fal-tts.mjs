/**
 * TTS through the fal gateway.
 *
 * Returns `{ raw }` to match the shape narrate.mjs expects from the other TTS
 * clients, plus fetches the audio bytes — fal returns a URL, not a body, which is
 * the one structural difference from cartesia/elevenlabs-direct.
 */
import { callFal } from "./fal-client.mjs";

export const DEFAULT_TTS_MODEL = "fal-ai/elevenlabs/tts/turbo-v2.5";

/** Models we have confirmed emit per-word timestamps (OpenAPI-verified). */
export const TIMESTAMPED_TTS_MODELS = new Set([
  "fal-ai/elevenlabs/tts/turbo-v2.5",
  "fal-ai/elevenlabs/tts/multilingual-v2",
]);

export async function callFalTts({
  text, apiKey, fetchFn = fetch, model = DEFAULT_TTS_MODEL, options = {}, ...rest
}) {
  const { voice, ...extra } = options;

  const wantsTimestamps = TIMESTAMPED_TTS_MODELS.has(model);
  const input = {
    text,
    ...(wantsTimestamps ? { timestamps: true } : {}),
    ...(voice ? { voice } : {}),
    ...extra,
  };

  const raw = await callFal({ model, input, apiKey, fetchFn, ...rest });

  if (!wantsTimestamps && !raw?.timestamps && !raw?.words) {
    throw new Error(
      `fal model "${model}" is not known to return word timestamps.\n` +
      `  Known-timestamped: ${[...TIMESTAMPED_TTS_MODELS].join(", ")}\n` +
      `  Either pin one of those, or configure the 'align' capability so timings are ` +
      `recovered from the generated audio.\n` +
      `  Browse options: node scripts/fal-models.mjs --capability tts`,
    );
  }
  return { raw, model };
}

/** fal returns an audio URL; the pipeline needs bytes on disk. */
export async function fetchFalAudio(url, { fetchFn = fetch } = {}) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`fal audio download -> ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
