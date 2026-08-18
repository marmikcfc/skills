# gbrain on Fly — status & remaining work

Live: `https://gbrain-marmik.fly.dev` · app `gbrain-marmik` · region `syd`
Wiki: `github.com/marmikcfc/agent-brain-wiki` · fork: `marmikcfc/gbrain@feat/deepinfra-and-case-insensitive-ids`

Last verified: 2026-08-16

---

## Verified working on Fly

Each row was measured on the deployment, not locally.

| Capability | Evidence |
|---|---|
| Remote MCP write | 84 pages via `put_page` over authenticated HTTP |
| Chunk + embed | 203/203 chunks embedded server-side |
| Link graph | **128 links — exact match to the local brain** (98 wikilink + 30 gazetteer) |
| Durability | write-through → commit → push; 84 pages confirmed via GitHub tree API |
| Codex adapter | authenticates headlessly, 72% prefix cache, `estimated_spend_usd: 0` |
| Dream cycle | 23 phases, all filesystem phases running under `--dir` |
| Atom extraction | 5 atoms from 2/2 pages, 0 failures |
| Concept synthesis | 2 concepts (T3 — clustered across *different* source documents) |
| MCP surface | 101 tools over the public URL |
| Semantic search | correct top hit; **~9s warm** |
| Health / wake | `200` in 0.96s |

The 128-link equality is the load-bearing result: same markdown, wiped database,
cold cloud rebuild, identical edge count. That is markdown-as-system-of-record
demonstrated rather than asserted.

---

## Tier 1 — the deployment is not reproducible  ← START HERE

Everything above works because of state typed into the **live Postgres**, not
because the deployment produces it. Wipe that DB and `fly deploy`, and you get:
0 links, atoms failing on a missing API key, and every model route back on
metered Anthropic.

This is the same failure class as the original RCA: *the system works, and the
thing that rebuilds the system does not.*

- [ ] **T1.1** Move the 7 live-DB `config set` values into `start.sh`
  - `link_resolution.global_basename=true` — without it: 128 links → **0**, silently
  - `models.tier.{utility,reasoning,deep,subagent}`
  - `facts.extraction_model`, `models.contextual_synopsis`, `models.expansion`
  - `models.dream.extract_atoms` — **not shown by `gbrain models list`**; bypasses
    the tier system with its own `anthropic:claude-haiku-4-5` default
- [x] **T1.2** ~~Fix `dispatch.ts:420` in the fork~~ — **NO FORK PATCH NEEDED.**
  - I originally called this a gbrain bug. It is not, and the claim was wrong on
    three counts: `dispatch.ts:420` is `logVerbUsage` **telemetry**, not the write
    path; `resolveMcpStdioSourceScope` **does** call `resolveSourceWithTier`; and
    the HTTP path takes its source from the caller's grant on purpose
    (`serve-http.ts:2233`, `authInfo.sourceId ?? 'default'`) — a remote caller's
    write scope must be pinned by its credential, not by server cwd.
  - Real cause: I imported with the **legacy admin bootstrap token**, which has no
    bound client row and so scopes to `default` — and `gbrain init` creates
    `default` with no `local_path`, while `sources add brain` creates the
    *second* source that then gets hardened.
  - Two valid fixes: point `default` at the clone (this deployment), or mint an
    OAuth client bound to `brain` and import with its token. The fail-closed
    guard in `start.sh` holds the invariant either way.
- [ ] **T1.3** Deploy and verify the fail-closed guards actually fire
- [ ] **T1.4** Cold-rebuild rehearsal: confirm a fresh boot reproduces 128 links
      and working atom extraction with no manual `config set`

## Tier 2 — data quality  ✅ (except T2.4, which needs a human decision)

- [x] **T2.1** Backfill `created:` — **lint 86 issues → 0**
  - recovered REAL dates rather than stamping today: each page's frontmatter kept
    `source_file` + `source_project`, and the original Claude memory files have
    genuine mtimes spanning 2026-03..2026-08. Stamping import-time would have
    linted clean and destroyed the very signal `created` carries.
  - resolution: **72 exact** (project+file), 1 by name, 10 fell back to mtime
  - month spread tracks the source closely — orig `03:5 04:13 05:8 06:35 07:15`
    vs backfilled `03:5 04:13 05:7 06:33 07:13` (excess in 08 = the 10 fallbacks)
  - also fixed 3 non-seeded pages: `AGENTS.md` / `README.md` needed frontmatter
    *and* an explicit `type:` (root-level files have no directory for the filing
    rules to infer from), `notes/durability-probe.md` needed `created`
  - script: `scratchpad/backfill-created.mjs` (idempotent, `--apply` to write)
- [x] **T2.2** `seed-from-claude-memory.mjs` now emits `created:` from the source
      memory file's mtime, so this cannot recur
- [x] **T2.3** GitHub verified — **and it surfaced a real limit**
  - 86 `.md` on GitHub; **96 pages in the DB**. The 5 atoms, 4 extract receipts
    and ~2 synthesized concepts have `source_path = NULL` — they exist only in
    Postgres and were never written to disk or pushed.
  - Severity **low**: they are derived. `atoms_scan_hash` is unset on both DB and
    disk, so atom dedup keys off the atom rows themselves — wipe the DB and the
    `NOT EXISTS` filter passes, re-extracting them. Cost is LLM calls, not data.
  - But state it precisely: **the cold-rebuild guarantee covers the SOURCE corpus
    (128 links reproduce exactly), not derived artifacts.** Concepts in particular
    are LLM-synthesized and would come back *differently*, not identically.
- [ ] **T2.4** Promote `take_proposals` → `takes` — **needs your decision**
  - 399 pending, 16 rejected-by-gbrain, 0 promoted
  - claims are specific and real (e.g. *"Snapshot seeds, don't re-embed."*)
  - `grade_takes` + `calibration_profile` stay no-ops until promotion;
    calibration needs ≥5 *resolved* takes
  - not auto-promoted on purpose: these are opinions the brain would then assert
    on Marmik's behalf, and auto-accepting machine-guessed opinions would mean
    grading its own guesses and calling that his track record
  - open: **why** gbrain rejected those 16 (`acted_by` would say) — unread

## Tier 3 — operations  ✅ (T3.4 decision + T3.5 remain)

- [x] **T3.1** Fly auto-suspend **confirmed** — no manual intervention
  - web machine reached `suspended` on its own; wake to HTTP 200 in **4.59s**
  - the batch machine independently reaches `stopped`, which is correct
- [x] **T3.2** Scheduled dream machine — `gbrain-dream`, daily, own volume, 2GB
  - runs the SAME image + entrypoint under `GBRAIN_ROLE=dream` rather than
    fly.toml's original `--entrypoint "" -- gbrain dream`, so it inherits schema
    activation, all 8 model routes, the clone, and both guards. Bypassing the
    entrypoint is how `extract_atoms` ended up on Anthropic with no API key.
  - fails closed unless durability is proven — the cycle WRITES pages, and on a
    scratch volume without push those die with the machine
  - always passes `--dir`; omitting it silently skips 6 of 23 phases
  - measured `cycle finished rc=0 in 29s` (the feared 929s `propose_takes` was
    cached — #1972's force-evict deadline is not a blocker in practice)
  - needs its own volume: Fly attaches a volume to exactly one machine
- [x] **T3.3** GitHub webhook live and **verified end to end**
  - `gbrain sources webhook set default --github-repo marmikcfc/agent-brain-wiki`
  - hook id `666479822` → `https://gbrain-marmik.fly.dev/webhooks/github`
  - GitHub ping delivered `status=OK code=202` — HMAC accepted, payload processed
  - **bound to `default`, NOT `brain`** — see the consolidation note below;
    pointing it at `brain` would re-import duplicates on every push
- [x] **CORS** — `GBRAIN_HTTP_CORS_ORIGIN=https://claude.ai,https://claude.com`
  - with `--bind 0.0.0.0` and this unset, OAuth endpoints reject ALL
    cross-origin requests; it silently blocked browser/phone access
- [ ] **T3.4** Search latency **~9s warm** — dominated by the DeepInfra
      query-embedding round trip. Decide on reranker/caching before wiring agents.
- [ ] **T3.5** Update "The gbrain Ledger" artifact (F07/F15/F28, `borrow_from`)

## The two-source split — root cause of three separate bugs

`gbrain init` creates `default`; `sources add brain --url` created a SECOND
source for the clone. Both ended up pointing at `/data/brain`, with the pages on
one and the repo binding on the other. That split caused, in order:

1. **The original RCA** — MCP writes (scoped to `default` by the bootstrap token)
   found no `local_path`, so write-through was inert: 83 pages in Postgres, 0
   files, 0 commits, and a green `harden` report for `brain`.
2. **Whole-brain duplication** — `start.sh`'s re-clone ran `gbrain sync --source
   brain`, which does not merely restore files, it re-IMPORTS them. First
   scheduled run: `default=109, brain=85, slugs in BOTH: 85`.
3. **Blocked the webhook** — a push would have re-run that same import.

**Consolidated onto `default`**, which now holds both the pages and the
`remote_url`. `brain` is vestigial (0 pages). `start.sh` restores the tree with
`git clone` and touches no rows — Postgres is shared and intact, only the files
were ever missing.

## Bugs the scheduled machine exposed that nothing else could

The web machine only ever boots with a populated volume. A scheduled run boots
**fresh volume + existing database** — a third state, and the only routine test
of the cold path. It found all three of these on its first run:

| Bug | Cause | Fixed |
|---|---|---|
| re-clone auth failure | git credential seeded inside the `sources add` branch only | hoisted above both branches |
| clean cycle exited non-zero → Fly re-ran it **3×** | `WARNED="$(jq …)"` — an assignment takes its command substitution's status, which `set -e` does NOT exempt | `\|\| echo 0` + `\|\| true` on the group |
| whole-brain duplication | `sync --source brain` re-imports | plain `git clone` |

Note on the second: I first blamed `[ "$WARNED" != "0" ] && log …`, then disproved
it with a direct test — bash exempts `&&`/`||` list members from `set -e`. The
assignment was the culprit.

---

## Findings worth keeping

**Four false greens.** Every defect this deployment hit was a component reporting
healthy while doing nothing:

| Component | Reported | Reality |
|---|---|---|
| `sources harden` | green | verified a source nothing wrote to |
| link extraction | "0 links" | flag off; 429 candidates silently dropped |
| model routing | valid | pointed at an API with no key present |
| budget gate | active | `BUDGET_METER_NO_PRICING` disables it for unpriced models |

The lesson for `start.sh`: assert **end-to-end invariants** (a write reaches
GitHub; a model call returns a known token), never component readiness.
Component checks compose into a false green.

**Not bugs, corrected understandings:**
- `extract_facts` is a *fence reconciler*, not an LLM extractor. 0 facts from 85
  pages is correct on a corpus with no `## Facts` fences.
- Path-qualified slugs (`articles/foo`) match gbrain's own `deriveSlugFromPath`.
  The importer was right; bare-basename wikilinks are a corpus property.
- `extract` uses `--source` for the *backend* (`fs`|`db`), not a source id.

**Economics.** Each `codex exec` dispatch carries ~12.4k input tokens of agent
harness system prompt regardless of task size. Free against flat-rate
subscription quota; ruinous metered. Prefix caching (72–82%) is what makes it
viable at cycle volume.
