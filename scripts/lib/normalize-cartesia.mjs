export function normalizeCartesia(raw) {
  return {
    audio_duration_s: raw.duration,
    provider: "cartesia",
    voice_id: raw.voice_id,
    words: raw.word_timestamps.map(w => ({ text: w.word, start: w.start, end: w.end })),
  };
}
