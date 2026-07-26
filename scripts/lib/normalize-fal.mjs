/**
 * Normalize fal TTS/ASR output to our word-timing shape:
 *   { audio_duration_s, provider, words: [{ text, start, end }] }
 *
 * fal fronts many models with different output shapes. The two we default to:
 *
 *  - TTS  `fal-ai/elevenlabs/tts/turbo-v2.5` with `timestamps: true`
 *    Output: { audio: {url}, timestamps: [...] }. The OpenAPI types `timestamps`
 *    as an untyped array (`items: {}`), so the per-entry shape is NOT documented.
 *    We accept the plausible variants rather than guessing one.
 *
 *  - ASR  `fal-ai/elevenlabs/speech-to-text/scribe-v2`
 *    Output: { words: [{ start, end, text, type, speaker_id }] } — documented, and
 *    `type` distinguishes real words from the whitespace entries in their example,
 *    so filtering on it is required, not defensive noise.
 */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** One timestamp entry -> {text,start,end}, or null if it isn't a word. */
function coerceWord(e) {
  if (!e || typeof e !== "object") return null;
  // scribe-v2 marks spacing/audio-event entries; only `word` is a real token.
  if (e.type && e.type !== "word") return null;

  const text = e.text ?? e.word ?? e.char ?? e.character ?? null;
  if (typeof text !== "string" || text.trim() === "") return null;

  const start = num(e.start) ?? num(e.start_time) ?? num(e.startTime) ??
                (num(e.start_ms) !== null ? e.start_ms / 1000 : null);
  const end = num(e.end) ?? num(e.end_time) ?? num(e.endTime) ??
              (num(e.end_ms) !== null ? e.end_ms / 1000 : null);
  if (start === null || end === null) return null;

  return { text: text.trim(), start, end };
}

/** Character-level alignment (ElevenLabs' native shape) -> words. */
function fromCharacterArrays(raw) {
  const chars = raw.characters ?? raw.alignment?.characters;
  const starts = raw.character_start_times_seconds ?? raw.alignment?.character_start_times_seconds;
  const ends = raw.character_end_times_seconds ?? raw.alignment?.character_end_times_seconds;
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) return null;

  const words = [];
  let cur = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) { if (cur) { words.push(cur); cur = null; } continue; }
    if (!cur) cur = { text: c, start: starts[i], end: ends[i] };
    else { cur.text += c; cur.end = ends[i]; }
  }
  if (cur) words.push(cur);
  return words.length ? words : null;
}

/**
 * @param raw   the fal result payload
 * @param model the fal endpoint id, for error messages
 */
export function normalizeFal(raw, { model = "fal" } = {}) {
  if (!raw || typeof raw !== "object") throw new Error(`fal(${model}): empty result payload`);

  const container = Array.isArray(raw.timestamps) ? raw.timestamps
    : Array.isArray(raw.words) ? raw.words
    : Array.isArray(raw.chunks) ? raw.chunks
    : null;

  let words = container ? container.map(coerceWord).filter(Boolean) : null;
  if (!words || words.length === 0) words = fromCharacterArrays(raw);

  if (!words || words.length === 0) {
    const shape = Object.keys(raw).join(", ");
    throw new Error(
      `fal(${model}) returned no usable word timings (payload keys: ${shape}).\n` +
      `  If this is a TTS call, the model must be one that emits per-word timestamps ` +
      `and the request must set timestamps:true.\n` +
      `  Otherwise pick a timestamped model, or configure the 'align' capability to ` +
      `recover timings from the audio.`,
    );
  }

  words.sort((a, b) => a.start - b.start);
  const audioUrl = raw.audio?.url ?? raw.audio_url ?? raw.audio_file?.url ?? null;
  const duration = num(raw.duration_ms) !== null
    ? raw.duration_ms / 1000
    : words[words.length - 1].end;

  return { audio_duration_s: duration, provider: "fal", model, audio_url: audioUrl, words };
}
