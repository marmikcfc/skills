import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeCartesia } from "../../scripts/lib/normalize-cartesia.mjs";
import { normalizeElevenLabs } from "../../scripts/lib/normalize-elevenlabs.mjs";

test("cartesia happy path normalizes to unified shape", async () => {
  const raw = JSON.parse(await readFile("tests/fixtures/cartesia/response-happy.json", "utf8"));
  const r = normalizeCartesia(raw);
  assert.equal(r.provider, "cartesia");
  assert.equal(r.voice_id, "test-cartesia-voice");
  assert.equal(r.audio_duration_s, 5.42);
  assert.equal(r.words.length, 4);
  assert.deepEqual(r.words[0], { text: "Why", start: 0.42, end: 0.61 });
  assert.deepEqual(r.words[3], { text: "float", start: 1.03, end: 1.45 });
});

test("elevenlabs collapses character timestamps into word timestamps", async () => {
  const raw = JSON.parse(await readFile("tests/fixtures/elevenlabs/response-happy.json", "utf8"));
  const r = normalizeElevenLabs(raw);
  assert.equal(r.provider, "elevenlabs");
  assert.equal(r.voice_id, "test-eleven-voice");
  assert.equal(r.words.length, 4);
  assert.equal(r.words[0].text, "Why");
  assert.equal(r.words[0].start, 0.42);
  assert.equal(r.words[0].end, 0.61);
  assert.equal(r.words[3].text, "float");
  assert.equal(r.words[3].end, 1.45);
});

test("elevenlabs attaches trailing punctuation to preceding word", () => {
  const raw = {
    voice_id: "v",
    alignment: {
      characters: ["H","i","!"," ","B","y","e"],
      character_start_times_seconds: [0,0.1,0.2,0.3,0.4,0.5,0.6],
      character_end_times_seconds:   [0.1,0.2,0.3,0.4,0.5,0.6,0.7],
    }
  };
  const r = normalizeElevenLabs(raw);
  assert.deepEqual(r.words[0], { text: "Hi!", start: 0, end: 0.3 });
  assert.deepEqual(r.words[1], { text: "Bye", start: 0.4, end: 0.7 });
});
