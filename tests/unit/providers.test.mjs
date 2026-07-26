import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  resolveCapability, resolveNarration, mergeConfigs, credentialFor, CONFIG_PATHS,
} from "../../scripts/lib/providers.mjs";

const base = async () => JSON.parse(await readFile(CONFIG_PATHS.defaults, "utf8"));

test("shipped defaults are valid: every chain entry exists and declares its capability", async () => {
  const c = await base();
  for (const [cap, spec] of Object.entries(c.capabilities)) {
    for (const id of spec.chain) {
      if (id === "native") continue;
      const meta = c.registry[id];
      assert.ok(meta, `${cap} chain references unknown provider "${id}"`);
      assert.ok(meta.capabilities.includes(cap), `"${id}" does not declare capability "${cap}"`);
    }
  }
});

test("no credentials leak into the binding config", async () => {
  const raw = await readFile(CONFIG_PATHS.defaults, "utf8");
  assert.doesNotMatch(raw, /"api_key"|sk-[A-Za-z0-9]/, "providers.default.json must never contain secrets");
});

test("chain order picks the first provider with a usable credential", async () => {
  const c = await base();
  const r = resolveCapability("tts", { config: c, env: { ELEVENLABS_API_KEY: "e" } });
  assert.equal(r.provider, "elevenlabs");
  assert.equal(r.key, "e");
});

test("flag beats env pin beats config chain", async () => {
  const c = await base();
  const env = { CARTESIA_API_KEY: "c", ELEVENLABS_API_KEY: "e", VIDEO_GEN_TTS_PROVIDER: "elevenlabs" };
  assert.equal(resolveCapability("tts", { config: c, env }).provider, "elevenlabs");
  assert.equal(resolveCapability("tts", { config: c, env, flag: "cartesia" }).provider, "cartesia");
});

test("local providers need no credential", async () => {
  const c = await base();
  const r = resolveCapability("tts", { config: c, env: {} });
  assert.equal(r.provider, "kokoro");
  assert.equal(r.local, true);
});

test("require:[word_timings] filters out providers that lack them", async () => {
  const c = await base();
  c.capabilities.tts.require = ["word_timings"];
  const r = resolveCapability("tts", { config: c, env: { OPENAI_API_KEY: "o", CARTESIA_API_KEY: "c" } });
  assert.equal(r.provider, "cartesia", "openai-tts lacks word_timings and must be skipped");
});

test("policy.offline excludes every network provider", async () => {
  const c = await base();
  c.policy.offline = true;
  const r = resolveCapability("image", { config: c, env: { OPENAI_API_KEY: "o" } });
  assert.equal(r.provider, "mflux-local");
});

test("exhausted chain throws an actionable error naming what was tried", async () => {
  const c = await base();
  c.capabilities.music.chain = ["suno"];
  assert.throws(() => resolveCapability("music", { config: c, env: {} }),
    /no provider available for "music"[\s\S]*SUNO_API_KEY[\s\S]*video-gen-setup/);
});

test("pinning an unsuitable provider fails loudly rather than silently falling back", async () => {
  const c = await base();
  assert.throws(
    () => resolveCapability("tts", { config: c, env: { RUNWAY_API_KEY: "r" }, flag: "runway" }),
    /cannot serve tts/,
  );
});

// --- the decoupling: TTS and word-timing are separate capabilities ---

test("TTS with native word timings needs no alignment pass", async () => {
  const c = await base();
  const { tts, align } = resolveNarration({ config: c, env: { CARTESIA_API_KEY: "c" } });
  assert.equal(tts.provider, "cartesia");
  assert.equal(align.provider, "native");
});

test("TTS without word timings falls back to a forced-alignment provider", async () => {
  const c = await base();
  c.capabilities.tts.chain = ["openai-tts"];
  const { tts, align } = resolveNarration({
    config: c, env: { OPENAI_API_KEY: "o", DEEPGRAM_API_KEY: "d" },
  });
  assert.equal(tts.provider, "openai-tts");
  assert.equal(align.provider, "deepgram", "must recover timings rather than lock to a timings-capable vendor");
});

test("offline narration still resolves end to end via local tts + local align", async () => {
  const c = await base();
  c.policy.offline = true;
  const { tts, align } = resolveNarration({ config: c, env: {} });
  assert.equal(tts.provider, "kokoro");
  assert.equal(align.provider, "whisper-local");
});

test("project config overrides a capability without touching the registry", async () => {
  const c = mergeConfigs(await base(), { capabilities: { tts: { chain: ["kokoro"], pin: null, require: [] } } });
  assert.equal(resolveCapability("tts", { config: c, env: { CARTESIA_API_KEY: "c" } }).provider, "kokoro");
  assert.ok(c.registry.cartesia, "registry must survive a capability-level override");
});

test("credentialFor reads env, then keys.json by provider id or env-var name", async () => {
  const { registry } = await base();
  assert.equal(credentialFor("cartesia", registry, { env: { CARTESIA_API_KEY: "a" } }).key, "a");
  assert.equal(credentialFor("cartesia", registry, { keys: { cartesia: "b" } }).key, "b");
  assert.equal(credentialFor("cartesia", registry, { keys: { CARTESIA_API_KEY: "c" } }).key, "c");
  assert.equal(credentialFor("cartesia", registry, {}).ok, false);
});
