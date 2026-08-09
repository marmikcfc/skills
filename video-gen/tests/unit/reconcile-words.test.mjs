import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileWords } from "../../scripts/lib/reconcile-words.mjs";

test("exact match returns provider words as-is", () => {
  const expected = ["why", "does", "ice", "float"];
  const provider = [
    { text: "Why",   start: 0.0, end: 0.1 },
    { text: "does",  start: 0.1, end: 0.2 },
    { text: "ice",   start: 0.2, end: 0.3 },
    { text: "float", start: 0.3, end: 0.4 },
  ];
  const r = reconcileWords(expected, provider);
  assert.equal(r.words.length, 4);
});

test("edit-distance 1 differences match (e.g. punctuation)", () => {
  const expected = ["why", "does", "ice", "float"];
  const provider = [
    { text: "Why,",  start: 0, end: 0.1 },
    { text: "does",  start: 0.1, end: 0.2 },
    { text: "ice",   start: 0.2, end: 0.3 },
    { text: "float", start: 0.3, end: 0.4 },
  ];
  const r = reconcileWords(expected, provider);
  assert.equal(r.words.length, 4);
});

test("count mismatch throws with debug payload", () => {
  const expected = ["why", "does", "ice"];
  const provider = [
    { text: "why", start: 0, end: 0.1 },
    { text: "does", start: 0.1, end: 0.2 },
  ];
  try {
    reconcileWords(expected, provider);
    assert.fail("expected throw");
  } catch (e) {
    assert.match(e.message, /word count mismatch/i);
    assert.ok(e.debug);
    assert.equal(e.debug.expected.length, 3);
    assert.equal(e.debug.provider.length, 2);
  }
});

test("large edit distance throws", () => {
  const expected = ["why", "does"];
  const provider = [
    { text: "completely", start: 0, end: 0.1 },
    { text: "different", start: 0.1, end: 0.2 },
  ];
  assert.throws(() => reconcileWords(expected, provider), /alignment failed/i);
});
