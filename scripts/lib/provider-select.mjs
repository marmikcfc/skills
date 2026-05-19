const KEY_ENV = { cartesia: "CARTESIA_API_KEY", elevenlabs: "ELEVENLABS_API_KEY" };

export function selectProvider({ flag, env = {}, config_keys = {}, warn = () => {} }) {
  function resolveKey(provider) {
    return env[KEY_ENV[provider]] ?? config_keys[provider] ?? null;
  }

  // 1. Explicit flag wins
  if (flag) {
    const key = resolveKey(flag);
    if (!key) throw new Error(`provider=${flag} requested but ${KEY_ENV[flag]} not set (env or ~/.config/video-gen/keys.json)`);
    return { provider: flag, key };
  }

  // 2. Env override
  if (env.VIDEO_GEN_TTS_PROVIDER) {
    const p = env.VIDEO_GEN_TTS_PROVIDER;
    const key = resolveKey(p);
    if (!key) throw new Error(`VIDEO_GEN_TTS_PROVIDER=${p} but ${KEY_ENV[p]} not set`);
    return { provider: p, key };
  }

  // 3. Presence of keys
  const cartesia = resolveKey("cartesia");
  const eleven = resolveKey("elevenlabs");
  if (cartesia && eleven) {
    warn("both keys set; defaulting to cartesia. Use --provider or VIDEO_GEN_TTS_PROVIDER to override.");
    return { provider: "cartesia", key: cartesia };
  }
  if (cartesia) return { provider: "cartesia", key: cartesia };
  if (eleven) return { provider: "elevenlabs", key: eleven };

  throw new Error("No TTS keys configured. Run /video-gen-setup or set CARTESIA_API_KEY or ELEVENLABS_API_KEY.");
}
