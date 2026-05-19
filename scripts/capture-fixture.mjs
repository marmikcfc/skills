// scripts/capture-fixture.mjs
// Usage: node scripts/capture-fixture.mjs --provider cartesia --text "hello world" --out tests/fixtures/cartesia/new.json
import { writeFile } from "node:fs/promises";
import { callCartesia } from "./lib/cartesia-client.mjs";
import { callElevenLabs } from "./lib/elevenlabs-client.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--provider") out.provider = argv[++i];
    else if (argv[i] === "--text") out.text = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

function scrub(obj) {
  // Replace likely-identifying fields with placeholders
  const json = JSON.stringify(obj, (k, v) => {
    if (k === "voice_id") return "scrubbed-voice-id";
    if (k === "request_id") return "scrubbed-request-id";
    if (k === "user_id") return "scrubbed-user-id";
    return v;
  });
  return JSON.parse(json);
}

const { provider, text, out } = parseArgs(process.argv.slice(2));
if (!provider || !text || !out) {
  console.error("usage: --provider cartesia|elevenlabs --text \"...\" --out path");
  process.exit(1);
}

const apiKey = provider === "cartesia" ? process.env.CARTESIA_API_KEY : process.env.ELEVENLABS_API_KEY;
const result = provider === "cartesia"
  ? await callCartesia({ text, apiKey })
  : await callElevenLabs({ text, apiKey });

await writeFile(out, JSON.stringify(scrub(result.raw), null, 2));
console.log(`wrote fixture to ${out}`);
