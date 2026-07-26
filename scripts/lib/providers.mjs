/**
 * Capability-oriented provider resolution.
 *
 * Three layers, deliberately separated because they change at different rates:
 *   capability  — stable interface (tts, align, image, music, video, llm)
 *   binding     — which provider serves it (providers.json, versioned, no secrets)
 *   credential  — env → keychain → keys.json (gitignored, never in providers.json)
 *
 * Skills reference capabilities. Only this module knows vendor names, so adding a
 * provider is a JSON entry plus an adapter — never a skill edit.
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const CONFIG_PATHS = {
  defaults: join(HERE, "providers.default.json"),
  global: join(homedir(), ".config", "video-gen", "providers.json"),
  keys: join(homedir(), ".config", "video-gen", "keys.json"),
  project: join(".video-gen", "providers.json"),
};

async function readJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch { return null; }
}

/** Later sources override earlier ones per-capability (not a deep merge of chains). */
export function mergeConfigs(...configs) {
  const out = { registry: {}, capabilities: {}, policy: {} };
  for (const c of configs) {
    if (!c) continue;
    Object.assign(out.registry, c.registry ?? {});
    for (const [cap, spec] of Object.entries(c.capabilities ?? {})) {
      out.capabilities[cap] = { ...(out.capabilities[cap] ?? {}), ...spec };
    }
    Object.assign(out.policy, c.policy ?? {});
  }
  return out;
}

export async function loadConfig({ cwd = process.cwd() } = {}) {
  return mergeConfigs(
    await readJson(CONFIG_PATHS.defaults),
    await readJson(CONFIG_PATHS.global),
    await readJson(join(cwd, CONFIG_PATHS.project)),
  );
}

export async function loadKeys() {
  return (await readJson(CONFIG_PATHS.keys)) ?? {};
}

export function credentialFor(providerId, registry, { env = {}, keys = {} } = {}) {
  const meta = registry[providerId];
  if (!meta) return { ok: false, reason: `unknown provider "${providerId}"` };
  if (meta.local) return { ok: true, key: null, local: true };
  const key = env[meta.key_env] ?? keys[providerId] ?? keys[meta.key_env] ?? null;
  return key ? { ok: true, key, local: false }
             : { ok: false, reason: `${meta.key_env} not set (env or ~/.config/video-gen/keys.json)` };
}

const ENV_PIN = (cap) => `VIDEO_GEN_${cap.toUpperCase()}_PROVIDER`;

/**
 * Which concrete model a gateway provider should use for a capability.
 * Direct vendors (cartesia, runway…) are one model per provider and return null.
 * Precedence: capability options.model → registry default for that capability.
 */
export function modelFor(capability, providerId, config) {
  const spec = config.capabilities?.[capability] ?? {};
  const meta = config.registry?.[providerId] ?? {};
  return spec.options?.model ?? meta.models?.[capability] ?? null;
}

/**
 * Resolve one capability to a concrete provider.
 * Precedence: flag → env pin → config pin → chain order, filtered by
 * `require` assertions, `policy.offline`, and credential availability.
 */
export function resolveCapability(capability, { config, env = {}, keys = {}, flag = null, exclude = [] } = {}) {
  const spec = config.capabilities?.[capability];
  if (!spec) throw new Error(`unknown capability "${capability}"`);
  const excluded = new Set(exclude);
  const registry = config.registry ?? {};
  const offline = config.policy?.offline === true;

  const satisfies = (id) => {
    if (excluded.has(id)) return false;
    if (id === "native") return true;              // pseudo-provider, handled by caller
    const meta = registry[id];
    if (!meta) return false;
    if (!meta.capabilities?.includes(capability)) return false;
    if (offline && !meta.local) return false;
    for (const req of spec.require ?? []) {
      if (meta[req] !== true) return false;
    }
    return true;
  };

  const explicit = flag ?? env[ENV_PIN(capability)] ?? spec.pin ?? null;
  if (explicit) {
    if (!satisfies(explicit)) {
      throw new Error(
        `provider "${explicit}" cannot serve ${capability}` +
        ((spec.require ?? []).length ? ` with require=[${spec.require.join(",")}]` : "") +
        (offline ? " under policy.offline" : ""),
      );
    }
    const cred = credentialFor(explicit, registry, { env, keys });
    if (!cred.ok) throw new Error(`provider "${explicit}" pinned for ${capability} but ${cred.reason}`);
    return { capability, provider: explicit, key: cred.key, local: !!cred.local,
             options: spec.options ?? {}, model: modelFor(capability, explicit, config),
             reason: "pinned" };
  }

  const tried = [];
  for (const id of spec.chain ?? []) {
    if (!satisfies(id)) { tried.push(`${id} (unsuitable)`); continue; }
    if (id === "native") return { capability, provider: "native", key: null, local: true,
                                  options: spec.options ?? {}, reason: "chain" };
    const cred = credentialFor(id, registry, { env, keys });
    if (!cred.ok) { tried.push(`${id} (${cred.reason})`); continue; }
    return { capability, provider: id, key: cred.key, local: !!cred.local,
             options: spec.options ?? {}, model: modelFor(capability, id, config),
             reason: "chain" };
  }

  throw new Error(
    `no provider available for "${capability}".\n  tried: ${tried.join("\n         ") || "(empty chain)"}\n` +
    `  fix: set a key, run /video-gen-setup, or edit ${CONFIG_PATHS.global}`,
  );
}

/**
 * The decoupling that removes vendor lock-in: the pipeline needs audio + word
 * timings, which are two separable capabilities. If the chosen TTS emits word
 * timings, alignment is "native"; otherwise an align provider recovers them from
 * the generated audio. Voice choice stops being gated by timing support.
 */
export function resolveNarration({ config, env = {}, keys = {}, ttsFlag = null, alignFlag = null }) {
  const tts = resolveCapability("tts", { config, env, keys, flag: ttsFlag });
  const ttsHasTimings = config.registry?.[tts.provider]?.word_timings === true;

  if (ttsHasTimings && !alignFlag) {
    return { tts, align: { capability: "align", provider: "native", key: null, local: true,
                           options: {}, reason: "tts provides word timings" } };
  }
  // 'native' is meaningless when the TTS emits no timings — exclude it from the
  // chain rather than pinning a replacement, so policy.offline and credential
  // checks still apply to whatever the chain lands on.
  const align = resolveCapability("align", {
    config, env, keys, flag: alignFlag, exclude: ["native"],
  });
  return { tts, align };
}
