export function deriveScenes({ words, marker_positions }) {
  if (marker_positions.length === 0) return [];
  const out = [];
  for (let i = 0; i < marker_positions.length; i++) {
    const { scene_name, word_index } = marker_positions[i];
    const nextIdx = i + 1 < marker_positions.length ? marker_positions[i + 1].word_index : words.length;
    const startWord = words[word_index];
    const endWord = words[nextIdx - 1];
    if (!startWord || !endWord) throw new Error(`scene ${scene_name}: no words in its window`);
    const start_s = startWord.start;
    const end_s = endWord.end;
    out.push({
      index: i + 1,
      name: scene_name,
      start_s,
      end_s,
      duration_s: end_s - start_s,
      narration: words.slice(word_index, nextIdx).map(w => w.text).join(" "),
    });
  }
  return out;
}

export function mergeStoryboardMetadata(scenes, metadata) {
  return scenes.map(s => {
    const m = metadata[s.name];
    if (!m) throw new Error(`missing metadata for scene: ${s.name}`);
    return { ...s, engine: m.engine, intent: m.intent };
  });
}
