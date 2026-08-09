import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStoryboard, toSceneMetadata, toHyperframesStoryboard } from "../../scripts/lib/storyboard.mjs";

const SB = `## Storyboard: laplace
**Video type:** explainer
**Visual style:** clean
**Narration voice:** discovery-order
**Aspect / target:** 16:9 youtube
**Soundtrack:** generated
**The ONE thing:** The transform turns calculus into algebra.
**Estimated runtime:** 2:10

### Scene 1 — Hook (engine: hyperframes)
**Visual intent:** A spring oscillating, unlabelled.
**Style notes:** restrained palette
**Narration:** "Here's something odd about this spring."

### Scene 2 — Metaphor (engine: manim)
**Visual intent:** Poles appearing on the s-plane.
**Narration:** "Watch what happens in the complex plane."
`;

test("parses globals and scenes", () => {
  const r = parseStoryboard(SB);
  assert.equal(r.globals.video_type, "explainer");
  assert.equal(r.globals.narration_voice, "discovery-order");
  assert.equal(r.globals.one_thing, "The transform turns calculus into algebra.");
  assert.equal(r.scenes.length, 2);
  assert.deepEqual(r.scenes.map((s) => [s.index, s.name, s.engine]),
    [[1, "hook", "hyperframes"], [2, "metaphor", "manim"]]);
  assert.equal(r.scenes[0].narration, "Here's something odd about this spring.");
});

test("clean storyboard yields no warnings", () => {
  assert.deepEqual(parseStoryboard(SB).warnings, []);
});

test("missing engine defaults to hyperframes with a warning, never throws", () => {
  const r = parseStoryboard(`### Scene 1 — Hook\n**Narration:** "x"\n**The ONE thing:** y`);
  assert.equal(r.scenes[0].engine, "hyperframes");
  assert.match(r.warnings.join("\n"), /defaulting to hyperframes/);
});

test("duplicate scene names are flagged — they would collide as scene markers", () => {
  const r = parseStoryboard(
    `**The ONE thing:** t\n### Scene 1 — Hook (engine: manim)\n**Narration:** "a"\n### Scene 2 — Hook (engine: manim)\n**Narration:** "b"`);
  assert.match(r.warnings.join("\n"), /duplicate scene name "hook"/);
});

test("unknown engine and layout are flagged", () => {
  const r = parseStoryboard(
    `**The ONE thing:** t\n### Scene 1 — A (engine: aftereffects)\n**Narration:** "a"\n**Layout:** diagonal`);
  const w = r.warnings.join("\n");
  assert.match(w, /unknown engine "aftereffects"/);
  assert.match(w, /unknown layout "diagonal"/);
});

test("non-contiguous numbering is flagged", () => {
  const r = parseStoryboard(
    `**The ONE thing:** t\n### Scene 1 — A (engine: manim)\n**Narration:** "a"\n### Scene 3 — B (engine: manim)\n**Narration:** "b"`);
  assert.match(r.warnings.join("\n"), /not contiguous/);
});

test("empty storyboard warns instead of throwing", () => {
  const r = parseStoryboard("# nothing here");
  assert.match(r.warnings.join("\n"), /no scenes found/);
  assert.equal(r.scenes.length, 0);
});

test("toSceneMetadata produces what mergeStoryboardMetadata expects", () => {
  const m = toSceneMetadata(parseStoryboard(SB));
  assert.deepEqual(Object.keys(m), ["hook", "metaphor"]);
  assert.equal(m.metaphor.engine, "manim");
  assert.match(m.hook.intent, /spring/);
});

test("emits HyperFrames STORYBOARD.md with correct frontmatter and per-engine src", () => {
  const out = toHyperframesStoryboard(parseStoryboard(SB));
  assert.match(out, /^---\nformat: 1920x1080/);
  assert.match(out, /message: The transform turns calculus into algebra\./);
  assert.match(out, /arc: Hook → Metaphor/);
  assert.match(out, /## Frame 1 — Hook/);
  assert.match(out, /- src: compositions\/01-hook\.html/);
  assert.match(out, /- src: assets\/manim\/02-metaphor\.mp4/);
  assert.match(out, /- voiceover: Here's something odd about this spring\./);
  assert.match(out, /- status: outline/);
});
