import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrate } from "../../scripts/narrate.mjs";

test("narrate end-to-end with mocked cartesia", async () => {
  const d = await mkdtemp(join(tmpdir(), "narrate-"));
  try {
    await writeFile(join(d, "narration.txt"), "[SCENE: hook] Why does ice float?");
    process.env.CARTESIA_API_KEY = "test";
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        voice_id: "v",
        duration: 1.5,
        audio_base64: Buffer.from("fake").toString("base64"),
        word_timestamps: [
          { word: "Why",  start: 0.1, end: 0.2 },
          { word: "does", start: 0.2, end: 0.3 },
          { word: "ice",  start: 0.3, end: 0.4 },
          { word: "float?", start: 0.4, end: 0.5 },
        ],
      }),
    });
    await narrate({ workdir: d, providerFlag: "cartesia", fetchFn: mockFetch });
    const ts = JSON.parse(await readFile(join(d, "word-timestamps.json"), "utf8"));
    assert.equal(ts.provider, "cartesia");
    assert.equal(ts.words.filter(w => !w.is_marker).length, 4);
    assert.equal(ts.words.filter(w => w.is_marker).length, 1);
    delete process.env.CARTESIA_API_KEY;
  } finally { await rm(d, { recursive: true }); }
});
