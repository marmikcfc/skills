/**
 * Storyboard parsing + interop.
 *
 * `animate.md` used to say "parse storyboard.md" with no defined shape — the same
 * class of undefined contract that produced the wrong composition paths. This is
 * the shape, parsed once, with warnings instead of exceptions.
 *
 * `toHyperframesStoryboard()` emits STORYBOARD.md in HyperFrames' own schema so
 * their Studio renders our plan as a reviewable contact sheet. We get a review
 * surface by conforming to a format rather than building a UI.
 */

const H3 = /^###\s+Scene\s+(\d+)\s*[—\-–]\s*(.+?)\s*(?:\(engine:\s*([a-z]+)\s*\))?\s*$/i;
const FIELD = /^\*\*([A-Za-z ]+):\*\*\s*(.*)$/;
const GLOBAL = /^\*\*([A-Za-z /]+):\*\*\s*(.*)$/;

const GLOBAL_KEYS = {
  "video type": "video_type",
  "visual style": "visual_style",
  "narration voice": "narration_voice",
  "aspect / target": "aspect",
  soundtrack: "soundtrack",
  "the one thing": "one_thing",
  "estimated runtime": "runtime",
  "recommended provider": "tts_provider",
};

const SCENE_KEYS = {
  "visual intent": "visual_intent",
  "style notes": "style_notes",
  layout: "layout",
  narration: "narration",
  presenter: "presenter",
};

export function parseStoryboard(md) {
  const warnings = [];
  const globals = {};
  const scenes = [];
  let cur = null;
  let inScenes = false;

  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const h = H3.exec(line);
    if (h) {
      inScenes = true;
      if (cur) scenes.push(cur);
      cur = {
        index: Number(h[1]),
        name: slug(h[2]),
        title: h[2].trim(),
        engine: (h[3] ?? "").toLowerCase() || null,
      };
      continue;
    }
    const m = FIELD.exec(line);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if (!inScenes) {
      if (GLOBAL_KEYS[key]) globals[GLOBAL_KEYS[key]] = val;
      continue;
    }
    if (!cur) continue;
    if (SCENE_KEYS[key]) cur[SCENE_KEYS[key]] = stripQuotes(val);
    else (cur.extra ??= {})[key] = val;
  }
  if (cur) scenes.push(cur);

  // Validate rather than throw — a storyboard is a human document.
  if (scenes.length === 0) warnings.push("no scenes found (expected '### Scene N — Name (engine: …)')");
  const seen = new Set();
  for (const s of scenes) {
    if (!s.engine) { s.engine = "hyperframes"; warnings.push(`scene ${s.index} "${s.title}": no engine declared, defaulting to hyperframes`); }
    else if (!["manim", "hyperframes", "footage"].includes(s.engine)) warnings.push(`scene ${s.index}: unknown engine "${s.engine}"`);
    if (seen.has(s.name)) warnings.push(`duplicate scene name "${s.name}" — scene markers must be unique`);
    seen.add(s.name);
    if (!s.narration) warnings.push(`scene ${s.index} "${s.title}": no narration`);
    if (s.layout && !["cut", "stack", "pip", "split"].includes(s.layout)) warnings.push(`scene ${s.index}: unknown layout "${s.layout}"`);
  }
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].index !== i + 1) { warnings.push(`scene numbering is not contiguous at position ${i + 1}`); break; }
  }
  if (!globals.one_thing) warnings.push("no 'The ONE thing' — every beat should serve a single takeaway");

  return { globals, scenes, warnings };
}

/** metadata map keyed by scene name, as mergeStoryboardMetadata() expects. */
export function toSceneMetadata({ scenes }) {
  return Object.fromEntries(scenes.map((s) => [s.name, {
    engine: s.engine,
    intent: s.visual_intent ?? "",
    ...(s.layout ? { layout: s.layout } : {}),
  }]));
}

/**
 * Emit HyperFrames' STORYBOARD.md so their Studio can render our plan as a
 * contact sheet. Schema: hyperframes-core/references/storyboard-format.md.
 */
export function toHyperframesStoryboard({ globals, scenes }, { format = "1920x1080" } = {}) {
  const fm = [
    "---",
    `format: ${format}`,
    globals.runtime ? `duration: ${globals.runtime}` : null,
    globals.one_thing ? `message: ${globals.one_thing}` : null,
    scenes.length ? `arc: ${scenes.map((s) => s.title).join(" → ")}` : null,
    globals.audience ? `audience: ${globals.audience}` : null,
    "---",
    "",
  ].filter(Boolean);

  const body = scenes.map((s) => {
    const src = s.engine === "manim"
      ? `assets/manim/${pad(s.index)}-${s.name}.mp4`
      : `compositions/${pad(s.index)}-${s.name}.html`;
    return [
      `## Frame ${s.index} — ${s.title}`,
      "",
      `- status: outline`,
      `- src: ${src}`,
      `- scene: ${s.visual_intent ?? s.title}`,
      s.narration ? `- voiceover: ${s.narration}` : null,
      `- engine: ${s.engine}`,
      s.layout ? `- layout: ${s.layout}` : null,
      "",
      s.style_notes ?? "",
      "",
    ].filter((x) => x !== null).join("\n");
  });

  return fm.concat(body).join("\n").replace(/\n{3,}/g, "\n\n");
}

const pad = (n) => String(n).padStart(2, "0");
const stripQuotes = (s) => s.replace(/^["“](.*)["”]$/s, "$1").trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
