export function normalizeElevenLabs(raw) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = raw.alignment;
  const words = [];
  let current = null;
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    if (c === " ") {
      if (current) { words.push(current); current = null; }
      continue;
    }
    if (!current) current = { text: c, start: starts[i], end: ends[i] };
    else { current.text += c; current.end = ends[i]; }
  }
  if (current) words.push(current);
  const audio_duration_s = words.length ? words[words.length - 1].end : 0;
  return { audio_duration_s, provider: "elevenlabs", voice_id: raw.voice_id, words };
}
