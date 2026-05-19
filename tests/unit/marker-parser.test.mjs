import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNarration } from "../../scripts/lib/marker-parser.mjs";

test("empty narration produces empty clean_text and no markers", () => {
  const r = parseNarration("");
  assert.equal(r.clean_text, "");
  assert.deepEqual(r.marker_positions, []);
});

test("single scene with marker at start", () => {
  const r = parseNarration("[SCENE: hook] Why does ice float?");
  assert.equal(r.clean_text, "Why does ice float?");
  assert.deepEqual(r.marker_positions, [{ scene_name: "hook", word_index: 0 }]);
});

test("five scenes track word indices correctly", () => {
  const input = "[SCENE: hook] One two. [SCENE: tension] Three four five. [SCENE: metaphor] Six seven. [SCENE: reveal] Eight. [SCENE: recap] Nine.";
  const r = parseNarration(input);
  assert.equal(r.clean_text, "One two. Three four five. Six seven. Eight. Nine.");
  assert.deepEqual(r.marker_positions, [
    { scene_name: "hook", word_index: 0 },
    { scene_name: "tension", word_index: 2 },
    { scene_name: "metaphor", word_index: 5 },
    { scene_name: "reveal", word_index: 7 },
    { scene_name: "recap", word_index: 8 },
  ]);
});

test("consecutive markers throw", () => {
  assert.throws(
    () => parseNarration("[SCENE: a] [SCENE: b] text"),
    /consecutive markers/i
  );
});

test("marker with no trailing words throws", () => {
  assert.throws(
    () => parseNarration("Text. [SCENE: dangling]"),
    /no trailing words/i
  );
});

test("duplicate marker names throw", () => {
  assert.throws(
    () => parseNarration("[SCENE: hook] A. [SCENE: hook] B."),
    /duplicate marker/i
  );
});

test("punctuation does not split words", () => {
  const r = parseNarration("[SCENE: hook] It's a question, isn't it?");
  assert.equal(r.clean_text, "It's a question, isn't it?");
});
