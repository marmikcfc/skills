#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseNarration } from "./lib/marker-parser.mjs";
import { selectProvider } from "./lib/provider-select.mjs";
import { normalizeCartesia } from "./lib/normalize-cartesia.mjs";
import { normalizeElevenLabs } from "./lib/normalize-elevenlabs.mjs";
import { reconcileWords } from "./lib/reconcile-words.mjs";
import { callCartesia } from "./lib/cartesia-client.mjs";
import { callElevenLabs } from "./lib/elevenlabs-client.mjs";

function parseArgs(argv) {
  const out = { workdir: null, provider: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--workdir") out.workdir = argv[++i];
    else if (argv[i] === "--provider") out.provider = argv[++i];
  }
  if (!out.workdir) throw new Error("--workdir <path> is required");
  return out;
}

async function loadConfigKeys() {
  try {
    const path = join(homedir(), ".config", "video-gen", "keys.json");
    return JSON.parse(await readFile(path, "utf8"));
  } catch { return {}; }
}

export async function narrate({ workdir, providerFlag = null, fetchFn = fetch }) {
  const narrationPath = join(workdir, "narration.txt");
  const narration = await readFile(narrationPath, "utf8");
  const { clean_text, marker_positions } = parseNarration(narration);

  const config_keys = await loadConfigKeys();
  const { provider, key } = selectProvider({
    flag: providerFlag,
    env: process.env,
    config_keys,
    warn: msg => console.warn(`warn: ${msg}`),
  });

  console.log(`narrating ${clean_text.split(/\s+/).length} words via ${provider}...`);
  const rawCall = provider === "cartesia"
    ? await callCartesia({ text: clean_text, apiKey: key, fetchFn })
    : await callElevenLabs({ text: clean_text, apiKey: key, fetchFn });

  const normalized = provider === "cartesia"
    ? normalizeCartesia(rawCall.raw)
    : normalizeElevenLabs(rawCall.raw);

  const expectedWords = clean_text.split(/\s+/).filter(Boolean);
  reconcileWords(expectedWords, normalized.words);

  // Reinject marker pseudo-entries
  const withMarkers = [];
  let mi = 0;
  for (let i = 0; i < normalized.words.length; i++) {
    while (mi < marker_positions.length && marker_positions[mi].word_index === i) {
      const t = normalized.words[i].start;
      withMarkers.push({
        text: `[SCENE: ${marker_positions[mi].scene_name}]`,
        start: t, end: t, is_marker: true, scene: marker_positions[mi].scene_name,
      });
      mi++;
    }
    withMarkers.push({ ...normalized.words[i], is_marker: false });
  }

  // Write audio + timestamps
  const audioBytes = Buffer.from(rawCall.audio_base64, "base64");
  await writeFile(join(workdir, "audio.mp3"), audioBytes);
  await writeFile(
    join(workdir, "word-timestamps.json"),
    JSON.stringify({ ...normalized, marker_positions, words: withMarkers }, null, 2),
  );

  console.log(`wrote ${normalized.words.length} words, ${normalized.audio_duration_s.toFixed(2)}s audio`);
  return { provider, audio_duration_s: normalized.audio_duration_s };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { workdir, provider } = parseArgs(process.argv.slice(2));
  narrate({ workdir, providerFlag: provider }).catch(e => {
    console.error(`error: ${e.message}`);
    if (e.debug) console.error(JSON.stringify(e.debug, null, 2));
    process.exit(1);
  });
}
