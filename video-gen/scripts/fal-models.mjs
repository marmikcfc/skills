#!/usr/bin/env node
/**
 * Browse fal's live model catalog by our capability names.
 *
 *   node scripts/fal-models.mjs --capability tts
 *   node scripts/fal-models.mjs --capability video --limit 40
 *   node scripts/fal-models.mjs --search "lipsync"
 *   node scripts/fal-models.mjs --all
 *
 * The catalog is queried live rather than vendored: fal ships models constantly,
 * and a list pasted into this repo would be wrong within weeks. Pin whatever you
 * pick into providers.json under capabilities.<cap>.options.model.
 */
import { searchFalModels, FAL_CATEGORIES, FAL_CATEGORY_FILTERS } from "./lib/fal-client.mjs";
import { loadKeys } from "./lib/providers.mjs";

function parseArgs(argv) {
  const out = { capability: null, search: null, limit: 25, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--capability" || a === "-c") out.capability = argv[++i];
    else if (a === "--search" || a === "-q") out.search = argv[++i];
    else if (a === "--limit" || a === "-n") out.limit = Number(argv[++i]);
    else if (a === "--all") out.all = true;
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listCapability(cap, { limit, apiKey }) {
  const cats = FAL_CATEGORIES[cap];
  if (!cats) {
    console.error(`unknown capability "${cap}". Known: ${Object.keys(FAL_CATEGORIES).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  for (const category of cats) {
    let d;
    try {
      d = await searchFalModels({ category, q: FAL_CATEGORY_FILTERS[cap], limit, apiKey });
    } catch (e) {
      // Unauthenticated search is rate-limited aggressively.
      console.error(`  [${category}] ${e.message}${apiKey ? "" : "  (set FAL_KEY for higher limits)"}`);
      continue;
    }
    const models = d.models ?? [];
    const filt = FAL_CATEGORY_FILTERS[cap] ? ` filtered by "${FAL_CATEGORY_FILTERS[cap]}"` : "";
    console.log(`\n${cap}  ←  fal category "${category}"${filt}  (${models.length}${d.has_more ? "+" : ""} active)`);
    for (const m of models) {
      const name = m.metadata?.display_name ?? "";
      console.log(`   ${m.endpoint_id.padEnd(52)} ${name}`);
    }
    if (cats.length > 1) await sleep(1500);
  }
}

const a = parseArgs(process.argv.slice(2));
const keys = await loadKeys();
const apiKey = process.env.FAL_KEY ?? keys.fal ?? keys.FAL_KEY ?? null;

if (a.search) {
  const d = await searchFalModels({ q: a.search, limit: a.limit, apiKey });
  console.log(`\nsearch "${a.search}"  (${(d.models ?? []).length} hits)`);
  for (const m of d.models ?? []) {
    console.log(`   [${(m.metadata?.category ?? "?").padEnd(16)}] ${m.endpoint_id}`);
  }
} else if (a.all) {
  for (const cap of Object.keys(FAL_CATEGORIES)) {
    await listCapability(cap, { limit: a.limit, apiKey });
    await sleep(1500);
  }
} else if (a.capability) {
  await listCapability(a.capability, { limit: a.limit, apiKey });
} else {
  console.log(`usage:
  --capability <${Object.keys(FAL_CATEGORIES).join("|")}>
  --search <text>
  --all
  --limit <n>          (default 25)

Pin a choice in ~/.config/video-gen/providers.json:
  { "capabilities": { "tts": { "pin": "fal",
      "options": { "model": "fal-ai/elevenlabs/tts/turbo-v2.5" } } } }`);
}
