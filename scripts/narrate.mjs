#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseNarration } from "./lib/marker-parser.mjs";
import { loadConfig, loadKeys, resolveNarration } from "./lib/providers.mjs";
import { normalizeCartesia } from "./lib/normalize-cartesia.mjs";
import { normalizeElevenLabs } from "./lib/normalize-elevenlabs.mjs";
import { reconcileWords } from "./lib/reconcile-words.mjs";
import { callCartesia } from "./lib/cartesia-client.mjs";
import { callElevenLabs } from "./lib/elevenlabs-client.mjs";

function parseArgs(argv) {
  const out = { workdir: null, provider: null, align: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--workdir") out.workdir = argv[++i];
    else if (argv[i] === "--provider") out.provider = argv[++i];
    else if (argv[i] === "--align") out.align = argv[++i];
  }
  if (!out.workdir) throw new Error("--workdir <path> is required");
  return out;
}

/**
 * TTS adapters that actually exist. The provider registry intentionally lists more
 * providers than are implemented — it is the extension point — so resolution can
 * succeed for a provider we cannot yet call. Fail here with a precise message
 * rather than pretending support we don't have.
 */
const TTS_ADAPTERS = {
  cartesia:   { call: callCartesia,   normalize: normalizeCartesia },
  elevenlabs: { call: callElevenLabs, normalize: normalizeElevenLabs },
};

export async function narrate({ workdir, providerFlag = null, alignProvider = null, fetchFn = fetch }) {
  const narrationPath = join(workdir, "narration.txt");
  const narration = await readFile(narrationPath, "utf8");
  const { clean_text, marker_positions } = parseNarration(narration);

  const config = await loadConfig({ cwd: workdir });
  const keys = await loadKeys();
  const { tts, align } = resolveNarration({
    config, env: process.env, keys, ttsFlag: providerFlag, alignFlag: alignProvider,
  });

  const adapter = TTS_ADAPTERS[tts.provider];
  if (!adapter) {
    throw new Error(
      `provider "${tts.provider}" resolved for tts but no adapter is implemented.\n` +
      `  implemented: ${Object.keys(TTS_ADAPTERS).join(", ")}\n` +
      `  fix: pin an implemented provider (--provider), or add scripts/lib/<provider>-client.mjs ` +
      `plus a normalize-<provider>.mjs and register it in TTS_ADAPTERS.`,
    );
  }
  if (align.provider !== "native") {
    throw new Error(
      `provider "${tts.provider}" emits no word timings, so alignment via "${align.provider}" is required, ` +
      `but no align adapter is implemented yet.\n` +
      `  fix: use a TTS with native word timings (cartesia, elevenlabs) until an align adapter lands.`,
    );
  }

  console.log(`narrating ${clean_text.split(/\s+/).length} words via ${tts.provider} (timings: ${align.provider})...`);
  const rawCall = await adapter.call({ text: clean_text, apiKey: tts.key, fetchFn });
  const normalized = adapter.normalize(rawCall.raw);

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
  return { provider: tts.provider, align: align.provider, audio_duration_s: normalized.audio_duration_s };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { workdir, provider, align } = parseArgs(process.argv.slice(2));
  narrate({ workdir, providerFlag: provider, alignProvider: align }).catch(e => {
    console.error(`error: ${e.message}`);
    if (e.debug) console.error(JSON.stringify(e.debug, null, 2));
    process.exit(1);
  });
}
