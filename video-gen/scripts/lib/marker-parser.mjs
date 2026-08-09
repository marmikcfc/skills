const MARKER_RE = /\[SCENE:\s*([a-zA-Z0-9_-]+)\s*\]/g;

export function parseNarration(input) {
  const tokens = [];
  let lastEnd = 0;
  for (const m of input.matchAll(MARKER_RE)) {
    if (m.index > lastEnd) {
      const text = input.slice(lastEnd, m.index).trim();
      if (text) tokens.push({ kind: "TEXT", content: text });
    }
    tokens.push({ kind: "MARKER", scene_name: m[1] });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < input.length) {
    const text = input.slice(lastEnd).trim();
    if (text) tokens.push({ kind: "TEXT", content: text });
  }

  // Validate: no consecutive markers, no dangling marker, no duplicates
  const seen = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== "MARKER") continue;
    if (seen.has(t.scene_name)) throw new Error(`duplicate marker: ${t.scene_name}`);
    seen.add(t.scene_name);
    const next = tokens[i + 1];
    if (!next) throw new Error(`marker ${t.scene_name} has no trailing words`);
    if (next.kind === "MARKER") throw new Error(`consecutive markers: ${t.scene_name} and ${next.scene_name}`);
  }

  // Build clean_text + marker_positions
  const textParts = [];
  const marker_positions = [];
  let wordCount = 0;
  for (const t of tokens) {
    if (t.kind === "MARKER") {
      marker_positions.push({ scene_name: t.scene_name, word_index: wordCount });
    } else {
      textParts.push(t.content);
      wordCount += t.content.split(/\s+/).filter(Boolean).length;
    }
  }
  return { clean_text: textParts.join(" "), marker_positions };
}
