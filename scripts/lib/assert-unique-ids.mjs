/**
 * Duplicate `id` attributes across an assembled HyperFrames composition make
 * <video>/<img> elements render BLANK, and `hyperframes lint` does not catch
 * cross-file duplicates. Scene agents run in parallel and cannot see each
 * other's ids, so this is the guard that makes the failure loud.
 *
 * Also verifies our `s<NN>-` namespacing convention, which is what prevents the
 * collision in the first place.
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

// Must NOT match data-composition-id / aria-labelledby / any *-id attribute.
// \b is not enough: in `data-composition-id`, the char before "id" is "-", a
// non-word char, so \bid matches. HyperFrames legitimately repeats a
// data-composition-id across host and sub-comp, so this false positive would
// flag every correct composition.
const ID_RE = /(?<![-\w])id\s*=\s*"([^"]+)"/g;

export function extractIds(html) {
  return [...html.matchAll(ID_RE)].map((m) => m[1]);
}

/** Scene files must namespace ids as s<NN>-*; the host file uses reserved roots. */
const HOST_ALLOWED = new Set(["root", "narration", "soundtrack", "main"]);
const SCENE_PREFIX = /^s\d{2}-/;

export async function assertUniqueIds(files) {
  const seen = new Map();       // id -> [file, ...]
  const unnamespaced = [];

  for (const f of files) {
    const html = await readFile(f, "utf8");
    const name = basename(f);
    const isHost = name === "index.html";
    for (const id of extractIds(html)) {
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id).push(name);
      if (!isHost && !SCENE_PREFIX.test(id)) unnamespaced.push({ id, file: name });
      if (isHost && !HOST_ALLOWED.has(id) && !SCENE_PREFIX.test(id)) {
        unnamespaced.push({ id, file: name });
      }
    }
  }

  const duplicates = [...seen.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([id, files]) => ({ id, files }));

  return { ok: duplicates.length === 0 && unnamespaced.length === 0, duplicates, unnamespaced };
}

export function formatReport({ duplicates, unnamespaced }) {
  const lines = [];
  for (const d of duplicates) {
    lines.push(`duplicate id "${d.id}" in ${d.files.join(", ")} — these elements will render BLANK`);
  }
  for (const u of unnamespaced) {
    lines.push(`id "${u.id}" in ${u.file} is not namespaced (expected s<NN>-…)`);
  }
  return lines.join("\n");
}
