export async function callCartesia({ text, apiKey, voiceId = "default", fetchFn = fetch }) {
  const res = await fetchFn("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: text, voice: { id: voiceId }, output_format: "mp3", add_timestamps: true }),
  });
  if (!res.ok) {
    const e = new Error(`cartesia ${res.status}: ${await res.text()}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return { audio_base64: data.audio_base64, raw: data };
}
