import { test } from "node:test";
import assert from "node:assert/strict";
import { selectProvider } from "../../scripts/lib/provider-select.mjs";

test("explicit flag wins over everything", () => {
  const r = selectProvider({
    flag: "elevenlabs",
    env: { VIDEO_GEN_TTS_PROVIDER: "cartesia", CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
  });
  assert.equal(r.provider, "elevenlabs");
  assert.equal(r.key, "e1");
});

test("env var wins over key presence", () => {
  const r = selectProvider({
    flag: null,
    env: { VIDEO_GEN_TTS_PROVIDER: "elevenlabs", CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
  });
  assert.equal(r.provider, "elevenlabs");
});

test("cartesia preferred when both keys set and no explicit selection", () => {
  const warnings = [];
  const r = selectProvider({
    flag: null,
    env: { CARTESIA_API_KEY: "c1", ELEVENLABS_API_KEY: "e1" },
    config_keys: {},
    warn: msg => warnings.push(msg),
  });
  assert.equal(r.provider, "cartesia");
  assert.equal(r.key, "c1");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /both keys set/i);
});

test("falls back to config file when env empty", () => {
  const r = selectProvider({
    flag: null,
    env: {},
    config_keys: { cartesia: "from-config" },
  });
  assert.equal(r.provider, "cartesia");
  assert.equal(r.key, "from-config");
});

test("throws with setup hint when nothing configured", () => {
  assert.throws(
    () => selectProvider({ flag: null, env: {}, config_keys: {} }),
    /video-gen-setup/i
  );
});

test("flag with no corresponding key throws", () => {
  assert.throws(
    () => selectProvider({ flag: "cartesia", env: {}, config_keys: {} }),
    /CARTESIA_API_KEY/
  );
});
