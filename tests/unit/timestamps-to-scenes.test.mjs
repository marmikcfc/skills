import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveScenes, mergeStoryboardMetadata } from "../../scripts/lib/timestamps-to-scenes.mjs";

const sampleWords = [
  { text: "Why",  start: 0.42, end: 0.61 },
  { text: "does", start: 0.62, end: 0.79 },
  { text: "ice",  start: 0.80, end: 1.02 },
  { text: "Well", start: 1.50, end: 1.80 },
  { text: "it",   start: 1.81, end: 1.92 },
];

test("derives 2 scenes from 2 markers", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [
      { scene_name: "hook", word_index: 0 },
      { scene_name: "tension", word_index: 3 },
    ],
  });
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].name, "hook");
  assert.equal(scenes[0].start_s, 0.42);
  assert.equal(scenes[0].end_s, 1.02);
  assert.equal(scenes[1].name, "tension");
  assert.equal(scenes[1].start_s, 1.50);
  assert.equal(scenes[1].end_s, 1.92);
});

test("duration_s equals end - start", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [
      { scene_name: "hook", word_index: 0 },
      { scene_name: "tension", word_index: 3 },
    ],
  });
  assert.equal(scenes[0].duration_s.toFixed(2), "0.60");
});

test("scene index starts at 1", () => {
  const scenes = deriveScenes({
    words: sampleWords,
    marker_positions: [{ scene_name: "hook", word_index: 0 }],
  });
  assert.equal(scenes[0].index, 1);
});

test("mergeStoryboardMetadata adds engine and intent", () => {
  const base = [{ index: 1, name: "hook", start_s: 0, end_s: 1, duration_s: 1 }];
  const meta = { hook: { engine: "manim", intent: "Show ice melting." } };
  const merged = mergeStoryboardMetadata(base, meta);
  assert.equal(merged[0].engine, "manim");
  assert.equal(merged[0].intent, "Show ice melting.");
});

test("missing metadata for a scene throws", () => {
  const base = [{ index: 1, name: "hook", start_s: 0, end_s: 1, duration_s: 1 }];
  assert.throws(
    () => mergeStoryboardMetadata(base, {}),
    /missing metadata for scene: hook/
  );
});
