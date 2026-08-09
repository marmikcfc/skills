export async function callElevenLabs({ text, apiKey, voiceId = "default", fetchFn = fetch }) {
  const res = await fetchFn(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
  });
  if (!res.ok) {
    const e = new Error(`elevenlabs ${res.status}: ${await res.text()}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return { audio_base64: data.audio_base64, raw: data };
}
