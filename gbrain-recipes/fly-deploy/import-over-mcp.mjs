#!/usr/bin/env bun
/**
 * import-over-mcp.mjs — push a local brain repo into a REMOTE gbrain over MCP.
 *
 * The normal import path (`gbrain import`) needs a local engine and a local
 * filesystem. A cloud brain has neither from the laptop's point of view, so
 * this walks the repo and calls `put_page` over the authenticated HTTP MCP
 * endpoint — which is the same op an agent uses, so a successful run proves
 * the remote write path end to end: auth, chunking, embedding, auto-link and
 * the facts backstop all execute server-side.
 *
 * Sequential by design. Each put_page triggers chunk + embed + link work on
 * the machine; firing 83 of them concurrently at a 512MB scale-to-zero box
 * with a transaction-pooled Postgres is how you find out what its connection
 * ceiling is. Slower and boring beats fast and half-imported.
 *
 * Usage:
 *   bun import-over-mcp.mjs --repo ~/brain --url https://host/mcp --token <t>
 *   [--dry-run] [--limit N] [--verbose]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const has  = (n) => args.includes(n);

const REPO    = flag('--repo', join(process.env.HOME, 'brain'));
const URL_    = flag('--url', null);
const TOKEN   = flag('--token', process.env.GBRAIN_TOKEN);
const LIMIT   = Number(flag('--limit', Infinity));
const DRY     = has('--dry-run');
const VERBOSE = has('--verbose');

if (!URL_ || !TOKEN) { console.error('need --url and --token'); process.exit(2); }

/** Recursively collect markdown, skipping git internals and editor state. */
function walk(dir, acc = []) {
  for (const e of readdirSync(dir).sort()) {
    if (e === '.git' || e === '.obsidian' || e.startsWith('_')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (extname(e) === '.md') acc.push(p);
  }
  return acc;
}

let rpcId = 0;

/**
 * The endpoint answers `text/event-stream`, so a plain `.json()` throws on a
 * body that is actually `event: message\ndata: {...}`. Parse the SSE frame.
 */
async function callTool(name, argsObj) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: ++rpcId,
      method: 'tools/call', params: { name, arguments: argsObj },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

  const line = text.split('\n').find((l) => l.startsWith('data:'));
  const payload = JSON.parse(line ? line.slice(5).trim() : text);
  if (payload.error) throw new Error(payload.error.message ?? JSON.stringify(payload.error));
  return payload.result;
}

const files = walk(REPO).slice(0, LIMIT);
console.log(`${DRY ? '[dry run] ' : ''}${files.length} pages → ${URL_}\n`);

const started = Date.now();
let ok = 0; const failed = [];

for (const [i, file] of files.entries()) {
  // The slug is the repo-relative path without .md — the same identity
  // `gbrain import` would assign, so a later local sync lines up rather than
  // creating a parallel set of pages.
  const slug = relative(REPO, file).replace(/\.md$/, '');
  const content = readFileSync(file, 'utf8');
  const n = String(i + 1).padStart(3);

  if (DRY) { console.log(`  ${n}/${files.length}  ${slug}`); ok++; continue; }

  try {
    const r = await callTool('put_page', { slug, content });
    ok++;
    const detail = VERBOSE && r?.content?.[0]?.text ? ` ${r.content[0].text.slice(0, 70)}` : '';
    console.log(`  ${n}/${files.length}  ✓ ${slug}${detail}`);
  } catch (err) {
    failed.push({ slug, error: String(err.message ?? err) });
    console.log(`  ${n}/${files.length}  ✗ ${slug} — ${String(err.message ?? err).slice(0, 100)}`);
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\ndone in ${secs}s — ${ok} ok, ${failed.length} failed`);
if (failed.length) {
  console.log('\nfailures:');
  for (const f of failed) console.log(`  ${f.slug}: ${f.error}`);
  process.exit(1);
}
