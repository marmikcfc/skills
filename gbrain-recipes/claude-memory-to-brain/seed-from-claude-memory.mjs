#!/usr/bin/env bun
/**
 * seed-from-claude-memory.mjs — Claude Code memory files → gbrain brain repo.
 *
 * Claude Code's auto-memory is ALREADY gbrain-shaped: YAML frontmatter with
 * name/description, a prose body, and [[wikilink]] cross-references. This
 * script does no conversion — it classifies by `type` and files each memory
 * into the directory that matches its primary subject, per the brain filing
 * rules. Provenance is appended so every page cites where it came from.
 *
 * Two frontmatter shapes exist in the wild and both are handled:
 *   type: project              (older, top-level)
 *   metadata:\n  type: project (newer, nested)
 *
 * Every project under ~/.claude/projects is walked, so two projects can each
 * hold a memory with the same title, which would resolve to the same output
 * path. Nothing is ever overwritten: the run is two-phase (scan, then resolve
 * names, then write) and contested names are disambiguated by source project.
 * See `resolveNames` for why that has to happen after the whole scan.
 *
 * Usage:
 *   bun seed-from-claude-memory.mjs --out ~/brain [--dry-run]
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(homedir(), 'brain');
const DRY = args.includes('--dry-run');

// type → primary-subject directory. `inbox/` is the sanctioned landing spot
// for anything the resolver can't place — an unfiled page is a signal the
// schema needs to evolve, not a failure.
const DIR_FOR = {
  user: 'people',
  project: 'projects',
  feedback: 'concepts',
  reference: 'reference',
};

function parseFrontmatter(src) {
  if (!src.startsWith('---')) return { fm: {}, body: src, raw: '' };
  const end = src.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: src, raw: '' };
  const raw = src.slice(4, end);
  const body = src.slice(end + 4).replace(/^\n+/, '');

  const fm = {};
  // Deliberately minimal: we only need name/description/type, and type may sit
  // at the top level OR nested one level under `metadata:`. A full YAML parser
  // would be more than this needs and would pull in a dependency.
  for (const line of raw.split('\n')) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (top) { fm[top[1]] = top[2].trim(); continue; }
    const nested = line.match(/^\s+([a-z_]+):\s*(.*)$/i);
    if (nested && !fm[nested[1]]) fm[nested[1]] = nested[2].trim();
  }
  return { fm, body, raw };
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

/** Byte-wise compare — readdir order is not guaranteed, and the run must be. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Tabs/newlines would break the TSV ledger's one-row-per-record contract. */
const tsvCell = (s) => String(s ?? '').replace(/[\t\r\n]+/g, ' ');

/** `-Users-marmikpandya-ycomb` → `ycomb` */
function projectLabel(dirName) {
  const parts = dirName.replace(/^-/, '').split('-');
  const idx = parts.indexOf('marmikpandya');
  const tail = idx >= 0 ? parts.slice(idx + 1) : parts;
  return tail.length ? tail.join('-') : 'home';
}

const memRoot = join(homedir(), '.claude', 'projects');
if (!existsSync(memRoot)) { console.error(`no ${memRoot}`); process.exit(1); }

const skipped = [];

// ── phase 1: scan ────────────────────────────────────────────────────────────
// Read every memory into a candidate list. Nothing is written yet: an output
// name can't be settled until every memory that might want it has been seen.
const items = [];

for (const proj of readdirSync(memRoot).sort(cmp)) {
  const memDir = join(memRoot, proj, 'memory');
  if (!existsSync(memDir) || !statSync(memDir).isDirectory()) continue;
  const label = projectLabel(proj);

  for (const file of readdirSync(memDir).sort(cmp)) {
    if (!file.endsWith('.md')) continue;
    // MEMORY.md is a per-project index of relative links, not a fact. Its
    // descriptions are already duplicated in each memory's frontmatter, so
    // importing it would add link noise with no new information.
    if (file === 'MEMORY.md') { skipped.push({ file, reason: 'index file' }); continue; }

    const src = readFileSync(join(memDir, file), 'utf8');
    const { fm, body } = parseFrontmatter(src);

    let type = fm.type;
    // Oldest files encode type in the filename prefix instead of frontmatter.
    if (!type) {
      const m = file.match(/^(project|feedback|reference|user)[_-]/);
      if (m) type = m[1];
    }

    const name = fm.name || basename(file, '.md');
    items.push({
      proj, file, label, type, name, description: fm.description, body,
      // The memory file's mtime is the only real creation signal available —
      // and gbrain REQUIRES `created` (L1 lint), keying timeline ordering and
      // fact decay off it. Omitting it once cost 86 lint failures and an
      // permanently empty timeline, with the repair only possible because
      // `source_file` happened to point back here. Stamping import-time instead
      // would lint clean and be worse: every page equally recent, which is
      // precisely the signal `created` exists to carry.
      created: statSync(join(memDir, file)).mtime.toISOString().slice(0, 10),
      dir: DIR_FOR[type] ?? 'inbox',
      // A title of pure punctuation slugs to '' — which would land as a hidden
      // `.md`, invisible in the brain repo. Same class of silent loss.
      slug: slugify(name) || 'untitled',
      labelSlug: slugify(label) || 'unknown-project',
      fileSlug: slugify(basename(file, '.md')) || 'file',
      hash: createHash('sha1').update(`${proj}/${file}`).digest('hex').slice(0, 6),
    });
  }
}

// ── phase 2: resolve names ───────────────────────────────────────────────────
// Escalation ladder. Tier 0 is the historical name, so a memory whose title is
// uncontested keeps the exact path it has always had. `--` is the join because
// slugify collapses runs of non-alphanumerics to a single `-`, so a doubled
// dash cannot occur inside a slug — a disambiguated name can never be spelled
// by an ordinary title.
const TIERS = [
  (it) => it.slug,                                                        // title
  (it) => `${it.slug}--${it.labelSlug}`,                                  // + project
  (it) => `${it.slug}--${it.labelSlug}--${it.fileSlug}`,                  // + filename
  (it) => `${it.slug}--${it.labelSlug}--${it.fileSlug}--${it.hash}`,      // + path hash
];
const MAX_TIER = TIERS.length - 1;
const pathAt = (it, tier) => join(OUT, it.dir, `${TIERS[tier](it)}.md`);

/**
 * Assign each item a unique output path.
 *
 * The whole set is resolved at once rather than first-writer-wins, because
 * first-writer-wins makes both the winner and the names a function of readdir
 * order. Here every member of a contested group escalates together: the group
 * {ycomb/foo, brain/foo} becomes {foo--ycomb, foo--brain} — no arbitrary
 * survivor keeping the bare name, and identical output on every run.
 *
 * Escalation can itself collide (a fresh name may land on a name some other
 * memory already holds), so this iterates to a fixed point instead of doing a
 * single pass. The last tier hashes the source path, which is unique per
 * memory, so the loop terminates.
 */
function resolveNames(all) {
  const tier = new Map(all.map((it) => [it, 0]));
  const contest = new Map(); // item → what it lost, recorded once, for the ledger
  let unresolved = [];

  for (;;) {
    const groups = new Map();
    for (const it of all) {
      const p = pathAt(it, tier.get(it));
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(it);
    }
    const clashes = [...groups.entries()].filter(([, g]) => g.length > 1);
    if (!clashes.length) break;

    let advanced = false;
    for (const [p, g] of clashes) {
      for (const it of g) {
        if (!contest.has(it)) {
          contest.set(it, { path: p, peers: g.filter((x) => x !== it).map((x) => `${x.label}/${x.file}`) });
        }
        if (tier.get(it) < MAX_TIER) { tier.set(it, tier.get(it) + 1); advanced = true; }
      }
    }
    // Unreachable in practice (the final tier is keyed on a unique path), but
    // spinning forever or overwriting would both be worse than refusing.
    if (!advanced) { unresolved = clashes.flatMap(([, g]) => g); break; }
  }

  return { tier, contest, unresolved: new Set(unresolved) };
}

const { tier, contest, unresolved } = resolveNames(items);

// ── phase 3: write ───────────────────────────────────────────────────────────
const written = [];
const collisions = [];
const byType = {};

for (const it of items) {
  const t = tier.get(it);
  const outPath = pathAt(it, t);
  const rel = relative(OUT, outPath);

  if (contest.has(it)) {
    const c = contest.get(it);
    collisions.push({
      rel,
      reason: unresolved.has(it) ? 'unresolved-collision (NOT written)' : 'title-collision',
      title: it.name,
      project: it.label,
      file: it.file,
      contested: relative(OUT, c.path),
      peers: c.peers.join('; '),
    });
  }
  if (unresolved.has(it)) continue;

  const page = [
    '---',
    `title: ${JSON.stringify(it.name)}`,
    it.description ? `description: ${JSON.stringify(it.description)}` : null,
    `created: ${it.created}`,
    `kind: ${it.type ?? 'note'}`,
    'source: claude-code-memory',
    `source_project: ${it.label}`,
    `source_file: ${it.file}`,
    'tags: [claude-memory, ' + (it.type ?? 'untyped') + ']',
    '---',
    '',
    it.body.trim(),
    '',
    '---',
    '',
    '## Timeline',
    '',
    `- **Imported** | Claude Code auto-memory (\`${it.label}\`) — [Source: ~/.claude/projects/${it.proj}/memory/${it.file}]`,
    '',
  ].filter((l) => l !== null).join('\n');

  if (!DRY) { mkdirSync(join(OUT, it.dir), { recursive: true }); writeFileSync(outPath, page, 'utf8'); }
  byType[it.type ?? '(untyped)'] = (byType[it.type ?? '(untyped)'] ?? 0) + 1;
  written.push({ slug: basename(rel, '.md'), dir: it.dir, type: it.type ?? 'untyped', project: it.label, path: outPath });
}

// The ledger is written every run, header-only when clean, so its contents
// always describe THIS run rather than leaving a stale file to be misread.
const LEDGER = join(OUT, '_collisions.tsv');
if (!DRY) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    LEDGER,
    ['resolved_path\treason\ttitle\tsource_project\tsource_file\tcontested_path\tcontested_with',
      ...collisions.map((c) => [c.rel, c.reason, c.title, c.project, c.file, c.contested, c.peers].map(tsvCell).join('\t')),
    ].join('\n') + '\n',
    'utf8',
  );
}

const dirs = {};
for (const w of written) dirs[w.dir] = (dirs[w.dir] ?? 0) + 1;

console.log(`${DRY ? '[dry run] ' : ''}wrote ${written.length} pages to ${OUT}`);
console.log('\nby directory:');
for (const [d, n] of Object.entries(dirs).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${d}/`);
}
console.log('\nby type:');
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${t}`);
}
console.log(`\nmemories found: ${items.length}`);
console.log(`pages written:  ${written.length}${DRY ? ' (dry run — nothing written)' : ''}`);
console.log(`collisions:     ${collisions.length} (memories whose title was contested and renamed)`);
if (skipped.length) console.log(`skipped:        ${skipped.length} (index files)`);
if (!DRY) console.log(`ledger:         ${LEDGER}`);
for (const c of collisions) {
  console.log(`  ${c.reason}  ${c.contested}  →  ${c.rel}  (${c.project}/${c.file})`);
}
if (unresolved.size) {
  console.error(`\nERROR: ${unresolved.size} memories could not be given a unique name and were NOT written. See ${LEDGER}`);
  process.exit(1);
}
