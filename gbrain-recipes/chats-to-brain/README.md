---
id: chats-to-brain
name: Chats-to-Brain
version: 0.1.0
description: ChatGPT and Claude data exports become brain pages. Deterministic parser walks the export, filters noise, and writes conversation pages; the agent then promotes the signal into subject directories.
category: sense
requires: []
secrets: []
health_checks:
  - type: file_exists
    path: "$CHAT_EXPORT_PATH/conversations.json"
    label: "Chat export"
setup_time: 15 min
cost_estimate: "$0 to parse. Embedding cost scales with what you keep — filter first."
---

# Chats-to-Brain: Your ChatGPT and Claude History as Brain Pages

Years of conversations with an LLM contain your actual thinking — theses you
worked out loud, frameworks you invented, problems you chewed on for months.
That history is trapped in two vendors' export archives. This recipe frees it.

## IMPORTANT: Instructions for the Agent

**You are the installer.** Follow these steps precisely.

**The core pattern: code for data, LLMs for judgment.**

1. DETERMINISTIC: `parse-chat-export.mjs` walks the export, reconstructs each
   conversation, applies numeric filters, and writes markdown. This never
   fails and never guesses. Branch reconstruction and timestamps are exact.
2. LATENT: you (the agent) read the imported pages and make the judgment
   calls. What is original thinking? Which entities are notable? What gets
   promoted out of `sources/` into a subject directory?

**Do not invert this.** Do not ask the model which conversations to keep —
that costs a fortune and is less reliable than a message-count threshold.
Do not ask the script which ideas matter — it cannot know.

## Architecture

```
  ChatGPT export.zip                Claude export.zip
  └── conversations.json            └── conversations.json
        (node/parent TREE)                (flat chat_messages[])
              │                                  │
              └──────────┬───────────────────────┘
                         ▼
              parse-chat-export.mjs          ← deterministic, zero-dep
                 · auto-detects provider
                 · walks current_node → root  (ChatGPT branches)
                 · drops system/tool/hidden turns
                 · numeric filters + skip ledger
                 · matches existing pages by source_id, not filename
                         │
                         ▼
        sources/chats/<provider>/<date>-<slug>.md
              (name = title; identity = source_id)
                         │
              gbrain import → embed → extract-conversation-facts
                         │
                         ▼
              AGENT ENRICH PASS  ← judgment lives here
                 originals/ · concepts/ · people/ · companies/
```

## Opinionated Defaults

| Default | Value | Why |
|---|---|---|
| Output directory | `sources/chats/<provider>/` | Filing rules: `sources/` is for bulk data imports. A chat archive is exactly that. |
| `--min-messages` | 6 | "fix this regex" is not knowledge. Short exchanges are overwhelmingly throwaway. |
| `--min-user-chars` | 400 | Filters on **what you wrote**, not total length. A long assistant monologue you replied "ok" to carries no signal of yours. |
| Branch handling | active path only | ChatGPT stores every regenerate as a fork. Importing all branches duplicates content and poisons retrieval. |
| System / tool turns | dropped | Not your thinking, and they wreck entity extraction. |
| Page identity | `source_id` (the provider's conversation id) | Filenames carry the title, and providers retitle conversations. Keying on the filename re-imports a retitled conversation as a second page. |
| Retitled conversation | page stays put, drift reported | The filename goes stale; the identity does not. `--rehome` moves the file instead. |
| Skipped conversations | logged to `_skipped.tsv` | Never drop anything silently. A filter you can't audit is a filter you can't tune. |

The two thresholds are the whole cost-control story. Raise them before you
lower them — you can always re-run with looser filters, but you cannot
un-spend the embedding budget.

## Prerequisites

- A working brain (`gbrain doctor` passes)
- `bun` or node >= 18
- Your export(s), unzipped:
  - **ChatGPT** — Settings → Data Controls → Export data → email link → unzip
  - **Claude** — Settings → Privacy → Export data → email link → unzip

Both arrive as a folder containing `conversations.json`.

## Setup Flow

### Step 1: Survey before you import

Always dry-run first. This is the step that tells you what your archive
actually looks like.

```bash
bun code/parse-chat-export.mjs ~/Downloads/chatgpt-export --dry-run
```

Read the skip tally. If it says `written: 3000`, your thresholds are too
loose — most people's archives are 80–90% noise. Tighten and re-run until
the kept count looks like "conversations I would actually want resurfaced."

### Step 2: Convert

```bash
BRAIN=~/brain

bun code/parse-chat-export.mjs ~/Downloads/chatgpt-export \
  --out $BRAIN/sources/chats \
  --min-messages 8 --min-user-chars 600 --since 2024-01-01

bun code/parse-chat-export.mjs ~/Downloads/claude-export \
  --out $BRAIN/sources/chats \
  --min-messages 8 --min-user-chars 600
```

Provider is auto-detected from the JSON shape and each writes to its own
subdirectory, so both commands can share one `--out`.

Re-running these against a newer export of the same account is safe and
expected: pages are matched by conversation id, so a conversation the provider
retitled in the meantime updates its existing page instead of landing twice,
and anything you wrote above the horizontal rule is carried forward. See
[Identity and re-runs](#identity-and-re-runs).

### Step 3: Import and index

```bash
gbrain import $BRAIN/sources/chats/ --no-embed
gbrain embed --stale
gbrain extract-conversation-facts       # REQUIRED — see below
gbrain extract links --source db
gbrain stats                            # verify pages and links > 0
```

**Do not skip `extract-conversation-facts`.** Long conversations defeat
chunk-level retrieval: a chunk reading "the answer is 9494" has no topical
anchor, so it is unfindable by any natural query. That command extracts each
claim as a discrete fact row with its own embedding and entity linkage. It is
the difference between an archive you can search and one you merely stored.

### Step 4: The enrich pass (agent judgment)

Now the LLM half. For each imported conversation, working newest-first:

1. Rewrite the `## Summary` block above the horizontal rule. Everything below
   the rule is append-only evidence — never edit it.
2. Extract **original thinking** — your theses, frameworks, observations —
   into `originals/<slug>`. Capture **exact phrasing**; your language is the
   insight. Paraphrasing destroys the thing you were trying to keep.
3. Extract reusable mental models into `concepts/<slug>`.
4. Apply the notability gate to entities before creating `people/` or
   `companies/` pages. A one-off mention is not a person page.
5. Back-link everything (Iron Law). An unlinked mention is a broken brain.

Batch this — do not run it interactively over 500 pages.

### Step 5: Log setup completion

```bash
gbrain put-page sources/chats/README.md   # note provider, date range, filters used
```

Record the exact thresholds you used. Future you re-running this with
different filters needs to know what the first pass already covered.

## Implementation Guide

### Branch reconstruction (ChatGPT only, CRITICAL)

ChatGPT's `mapping` is a tree keyed by node id. Every edit or regenerate
forks a branch, and abandoned branches stay in the export forever. The only
correct traversal is: start at `current_node`, follow `parent` pointers to
the root, reverse.

Iterating `Object.values(mapping)` is the common bug. It interleaves
abandoned branches into the transcript, producing conversations that
contradict themselves and inflating your embedding bill with text you never
saw. The parser also carries a cycle guard, because malformed exports exist.

### Content shape handling

| Provider | Shape | Handling |
|---|---|---|
| ChatGPT | `content.parts[]` | Strings joined; non-text parts noted as `_[type omitted]_`, never fabricated |
| ChatGPT | `content.text` | Used for `code` / `execution_output` types |
| Claude | `content[]` blocks | Preferred — preserves block order |
| Claude | `text` | Fallback for older exports |
| Claude | `attachments[]` | `extracted_content` inlined under the message |

### Identity and re-runs

**A page's identity is the provider's conversation id, never its filename.**
ChatGPT gives `conversation_id`, Claude gives `uuid`; both land in the page
frontmatter as `source_id`, and that field is what a re-run matches on.

Filenames are still `<created-date>-<title-slug>`, because these files land in
a git repo you read and grep — `2025-03-04-designing-the-retrieval-pipeline.md`
is worth keeping over a raw UUID. But a filename is a *label*, not an identity:
both providers retitle conversations (auto-titling settles late, and you can
rename a thread yourself), and a retitle moves the slug.

So every run first rebuilds an id → page index from the output directory. Each
kept conversation then resolves one of three ways:

| Situation | What happens |
|---|---|
| id not seen before | New page at `<created-date>-<title-slug>.md` |
| id already imported, same title | Same page rewritten in place |
| id already imported, **title changed** | Same page rewritten in place, filename left alone, and the drift reported as `retitled:` |

Pass `--rehome` to take the other branch: the page is *moved* to the new
title's filename and the old file is deleted, so the archive never carries two
copies either way. The move is reported as `renamed:` — after a rehome, re-run
`gbrain import` and prune the old page from the brain, since gbrain keys pages
by slug and will otherwise keep the stale one.

The index is rebuilt from the `source_id` in each page's frontmatter, not from
`_manifest.json`. The manifest is read as a hint, but the pages on disk are
ground truth: deleting or hand-editing the manifest cannot resurrect the
duplicate. Everything a run did to identity is recorded in the new manifest —
`written[]` (each entry now carries `id` and `reused`), plus `retitled[]`,
`renamed[]`, and `duplicate_pages[]`.

Two other consequences worth knowing:

- **Your enrich pass survives a re-import.** Everything above the horizontal
  rule is lifted off the existing page and carried forward verbatim; only the
  frontmatter and the transcript below the rule are regenerated. Re-running the
  parser over an enriched archive is safe.
- **Duplicates from an older run are reported, not deleted.** If two pages
  share one `source_id` (the pre-fix behaviour produced exactly this), the run
  prints `duplicate:` with both paths and leaves them alone — one of them may
  hold synthesis you wrote. Delete by hand, or re-run with `--rehome`, which
  collapses them.

Same-run slug collisions (many conversations are titled "untitled") still get a
6-char SHA-1 of the source id appended — not a counter. When two conversations
in one run want the same slug, **both** are suffixed, so which one gets the bare
name never depends on the order conversations happen to appear in the export.

### What to test after setup

```bash
# 1. no abandoned branches leaked into any page
grep -rl "regenerate" $BRAIN/sources/chats/ | head

# 2. a known conversation is retrievable by topic, not by title
gbrain query "the thing I concluded about <topic>"

# 3. facts landed, not just chunks
gbrain stats | grep -i fact

# 4. the skip ledger matches expectations
head -20 $BRAIN/sources/chats/chatgpt/_skipped.tsv

# 5. one page per conversation — this must print nothing
grep -h '^source_id:' $BRAIN/sources/chats/*/*.md | sort | uniq -d
```

Check #2 is the one that matters. If topical queries miss,
`extract-conversation-facts` did not run or did not finish.

## Cost Estimate

| Item | Cost |
|---|---|
| Parsing | $0 — local, zero-dependency |
| Embedding | ~$0.03–0.30 per 1,000 kept conversations (provider-dependent) |
| `extract-conversation-facts` | LLM-bearing — scales with kept volume |
| Ongoing | $0 — this is a one-time backfill |

The filters are the cost lever. An unfiltered 5,000-conversation archive can
cost 10× a well-filtered 500-conversation one and retrieve worse, because
noise dilutes every neighborhood in the vector space.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `unrecognized export shape` | Vendor changed format, or wrong file | Confirm the JSON has `mapping` (ChatGPT) or `chat_messages` (Claude); force with `--provider` |
| `written: 0` | Filters too tight for a small archive | Lower `--min-messages` / `--min-user-chars`; check `_skipped.tsv` for the reason tally |
| Transcripts contradict themselves | Branch bug — not this parser | Confirm you are on this script; verify no page contains both a message and its regenerated twin |
| Topical queries miss | `extract-conversation-facts` not run | Run it; long conversations are unretrievable by chunk embedding alone |
| Import is enormous / slow | Too permissive a first pass | Re-run with tighter filters into a clean dir; `gbrain import` is idempotent by slug |
| Same conversation imported twice | Pages written by a parser that keyed on the filename, before a provider retitle | Re-run the parser: it prints `duplicate:` with both paths. Delete the stale page by hand, or re-run with `--rehome` to collapse them, then re-import |
| Filename no longer matches the page title | The provider retitled the conversation after the first import | Working as intended — identity is `source_id`, and the page content is current. Add `--rehome` if you want the file to follow the title |
| Brain feels noisier after import | Raw pages never got promoted | The enrich pass (Step 4) is not optional — `sources/` is a staging area, not a destination |
