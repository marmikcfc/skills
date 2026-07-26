/**
 * fal.ai queue-API client.
 *
 * fal is a GATEWAY, not a single model: one credential fronts hundreds of models
 * across every capability we need. So it registers as one provider whose
 * per-capability model comes from config, rather than one registry entry per
 * model — a catalog that churns weekly does not belong hard-coded in a repo.
 *
 * Verified against the live API docs + model-search OpenAPI (2026-07):
 *   POST https://queue.fal.run/{model}                          -> {request_id, status_url, response_url}
 *   GET  https://queue.fal.run/{model}/requests/{id}/status     -> {status: IN_QUEUE|IN_PROGRESS|COMPLETED}
 *   GET  https://queue.fal.run/{model}/requests/{id}            -> model output
 *   Authorization: Key $FAL_KEY
 */

export const FAL_QUEUE = "https://queue.fal.run";
export const FAL_MODELS_API = "https://api.fal.ai/v1/models";

class FalError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "FalError";
    this.status = status;
    this.body = body;
  }
}

async function req(url, { apiKey, fetchFn, method = "GET", body }) {
  const res = await fetchFn(url, {
    method,
    headers: {
      Authorization: `Key ${apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new FalError(`fal ${method} ${url} -> ${res.status}: ${detail?.slice(0, 400)}`,
      { status: res.status, body: parsed });
  }
  return parsed;
}

/**
 * Submit to the queue and poll until COMPLETED.
 * `sleep` is injectable so tests don't wait in real time.
 */
export async function callFal({
  model, input, apiKey, fetchFn = fetch,
  pollMs = 1000, timeoutMs = 600_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = () => Date.now(),
}) {
  if (!model) throw new FalError("callFal: model is required (e.g. 'fal-ai/flux/dev')");
  if (!apiKey) throw new FalError("callFal: FAL_KEY is required");

  const submitted = await req(`${FAL_QUEUE}/${model}`, { apiKey, fetchFn, method: "POST", body: input });
  const requestId = submitted?.request_id;
  if (!requestId) throw new FalError("fal submit returned no request_id", { body: submitted });

  const statusUrl = submitted.status_url ?? `${FAL_QUEUE}/${model}/requests/${requestId}/status`;
  const resultUrl = submitted.response_url ?? `${FAL_QUEUE}/${model}/requests/${requestId}`;

  const deadline = now() + timeoutMs;
  for (;;) {
    const st = await req(statusUrl, { apiKey, fetchFn });
    const status = st?.status;
    if (status === "COMPLETED") break;
    if (status && !["IN_QUEUE", "IN_PROGRESS"].includes(status)) {
      throw new FalError(`fal request ${requestId} ended in status ${status}`, { body: st });
    }
    if (now() > deadline) {
      throw new FalError(`fal request ${requestId} still ${status} after ${Math.round(timeoutMs / 1000)}s`);
    }
    await sleep(pollMs);
  }
  return req(resultUrl, { apiKey, fetchFn });
}

/** Query fal's model-search API. Auth optional, but unauthenticated is rate-limited hard. */
export async function searchFalModels({
  category, q, endpointId, limit = 40, status = "active", apiKey = null, fetchFn = fetch,
} = {}) {
  const p = new URLSearchParams();
  if (category) p.set("category", category);
  if (q) p.set("q", q);
  if (endpointId) p.set("endpoint_id", endpointId);
  if (limit) p.set("limit", String(limit));
  if (status) p.set("status", status);
  const res = await fetchFn(`${FAL_MODELS_API}?${p}`, {
    headers: apiKey ? { Authorization: `Key ${apiKey}` } : {},
  });
  if (!res.ok) throw new FalError(`fal model search -> ${res.status}`, { status: res.status });
  return res.json();
}

/**
 * Our capability -> fal category mapping. Verified live against the model-search
 * API: `text-to-music` and `lipsync` return ZERO active models — music lives under
 * `text-to-audio` and lipsync under `video-to-video`, which is exactly the kind of
 * thing that has to be probed rather than assumed.
 */
export const FAL_CATEGORIES = {
  tts: ["text-to-speech"],
  align: ["speech-to-text"],
  image: ["text-to-image"],
  music: ["text-to-audio"],
  video: ["text-to-video", "image-to-video"],
  avatar: ["audio-to-video"],
  lipsync: ["video-to-video"],
};

/**
 * Some categories are broader than our capability. `text-to-audio` holds music
 * generators AND text-to-speech models, so listing it raw shows TTS under
 * "music". These free-text filters narrow the listing to what the capability
 * actually means.
 */
export const FAL_CATEGORY_FILTERS = {
  music: "music",
  lipsync: "lipsync",
  avatar: "avatar",
};

export { FalError };
