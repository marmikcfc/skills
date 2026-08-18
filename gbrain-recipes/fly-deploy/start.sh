#!/usr/bin/env bash
# Entrypoint for the gbrain Fly deployment. Idempotent by design — with
# scale-to-zero this runs on every cold start, not just the first boot.
#
# FAIL-CLOSED CONTRACT: every step below either proves its invariant or exits
# non-zero. A degraded machine must never reach `gbrain serve`, because a
# listening gbrain accepts writes — against an unmigrated schema, or into a
# working tree that never reaches the remote. No listener is a visible outage;
# a listener that silently drops data is not.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${PORT:=8080}"
: "${BRAIN_REPO_PATH:=/data/brain}"
: "${BRAIN_SOURCE_ID:=brain}"

CONFIG="${GBRAIN_HOME:-/data}/.gbrain/config.json"

# Boot-critical DB calls run once, cold, against a cross-region pooler. gbrain's
# per-command connect default is 10s (`sources list`), which a Fly cold start can
# genuinely exceed — and with fail-closed startup a slow connect now costs the
# whole boot. Give the reads room rather than crash-looping on latency.
BOOT_TIMEOUT="${GBRAIN_BOOT_TIMEOUT:-30s}"

# Readiness marker. Deliberately NOT on /data: a marker on the volume would
# survive a boot that failed and then vouch for the next one. The container
# filesystem is recreated on every cold start, so absence is the honest default.
READY_MARKER="${GBRAIN_READY_MARKER:-/run/gbrain.ready}"

# gbrain resolves the brain-repo PAT from --pat-file or GBRAIN_GITHUB_PAT, in
# that order — a bare GITHUB_PAT is NOT read (core/brain-repo-durability.ts,
# acceptPat). Earlier revisions of this recipe set GITHUB_PAT, so hardening was
# skipped with a stderr note and durability never actually existed. Accept the
# old name as an alias so existing deployments keep working; never echo either.
if [ -z "${GBRAIN_GITHUB_PAT:-}" ] && [ -n "${GITHUB_PAT:-}" ]; then
  export GBRAIN_GITHUB_PAT="$GITHUB_PAT"
fi

# Without this git blocks on a terminal prompt when a credential is missing or
# wrong — on a headless boot that is a hang, not a failure, and a hang never
# fails closed. Make missing auth an immediate non-zero instead.
export GIT_TERMINAL_PROMPT=0

# A container has no git identity, and `git commit` refuses without one. That
# breaks durability at the last step: the credential wires, the push-probe
# passes, and then every commit fails — so pages would reach the volume and
# never the remote, which is precisely the failure BRAIN_REPO_URL promises
# against. Set via env so it applies to gbrain's own commits (the write-through
# hook, the harden scaffolding) without writing a global gitconfig.
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-gbrain}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-gbrain@${FLY_APP_NAME:-fly}.local}"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

log() { printf '[start] %s\n' "$*" >&2; }
die() { printf '[start] FATAL: %s\n' "$*" >&2; exit 1; }

# Every boot starts unready. The healthcheck requires this file, so a boot that
# dies at any gate below leaves the machine visibly unhealthy rather than
# inheriting a previous boot's verdict.
mkdir -p "$(dirname "$READY_MARKER")"
rm -f "$READY_MARKER"

# ── 0a. codex session ────────────────────────────────────────────────────────
# The `codex-cli` recipe dispatches by spawning the Codex binary and inheriting
# its session. Unlike Claude Code — which reads CLAUDE_CODE_OAUTH_TOKEN — Codex
# offers no headless auth env var, so the session arrives as a base64 blob of a
# working `auth.json` and is written to CODEX_HOME here.
#
# SEEDED ONLY WHEN ABSENT, and this is the important part: codex REWRITES
# auth.json when it refreshes its tokens. CODEX_HOME points at the volume, so
# that refresh persists. Overwriting from the secret on every boot would keep
# reinstating the original refresh_token — which works right up until it is
# rotated out, and then fails with an auth error that looks like nothing to do
# with this file.
#
# Rotation is therefore deliberate: delete /data/.codex/auth.json (or the whole
# dir) and redeploy to re-seed from the secret.
if [ -n "${CODEX_AUTH_JSON_B64:-}" ]; then
  CODEX_DIR="${CODEX_HOME:-/data/.codex}"
  if [ -f "$CODEX_DIR/auth.json" ]; then
    log "codex session already present at $CODEX_DIR — leaving it alone"
  else
    log "seeding codex session into $CODEX_DIR"
    mkdir -p "$CODEX_DIR"
    # 0600 before content: never leave a readable window on a credential.
    umask 077
    printf '%s' "$CODEX_AUTH_JSON_B64" | base64 -d > "$CODEX_DIR/auth.json" \
      || die "could not decode CODEX_AUTH_JSON_B64 — refusing to serve with a broken codex session"
    chmod 600 "$CODEX_DIR/auth.json"
    umask 022
    # Prove it parses. A truncated secret yields a file that exists, passes the
    # presence check on every later boot, and fails only when a cycle tries to
    # spawn codex hours later.
    jq -e '.tokens.access_token' "$CODEX_DIR/auth.json" >/dev/null 2>&1 \
      || die "seeded codex auth.json has no tokens.access_token — secret is malformed"
    log "codex session seeded and validated"
  fi
fi

# ── 0. schema pack ───────────────────────────────────────────────────────────
# The pack ships in the image (see Dockerfile) and is installed into
# GBRAIN_HOME before init, because `gbrain schema use` needs the file present
# to activate it. Copied only when absent: a volume whose pack an operator has
# since edited via `gbrain schema edit` must not be silently reverted by a
# redeploy. Changing the shipped pack is therefore a deliberate act — delete
# the installed copy, or bump the pack name.
PACK_SRC="/opt/gbrain/schema-packs"
PACK_DST="${GBRAIN_HOME:-/data}/.gbrain/schema-packs"

if [ -d "$PACK_SRC" ]; then
  for src in "$PACK_SRC"/*/; do
    [ -d "$src" ] || continue
    name="$(basename "$src")"
    if [ -f "$PACK_DST/$name/pack.json" ]; then
      log "schema pack '$name' already installed — leaving it alone"
    else
      log "installing schema pack '$name' from image"
      mkdir -p "$PACK_DST/$name"
      cp "$src/pack.json" "$PACK_DST/$name/pack.json" \
        || die "could not install schema pack '$name'"
    fi
  done
fi

# ── 1. config ────────────────────────────────────────────────────────────────
# `embedding_model` and `embedding_dimensions` resolve ONLY from the file plane
# and the env plane — the DB plane is deliberately ignored for these two, since
# they size the vector column and must stay stable across engine connects. So
# `gbrain config set` is a no-op for them; init writes them into the file.
if [ ! -f "$CONFIG" ]; then
  log "no config at $CONFIG — initializing"
  if ! gbrain init --url "$DATABASE_URL" --non-interactive \
      ${GBRAIN_EMBEDDING_MODEL:+--embedding-model "$GBRAIN_EMBEDDING_MODEL"} \
      ${GBRAIN_EMBEDDING_DIMENSIONS:+--embedding-dimensions "$GBRAIN_EMBEDDING_DIMENSIONS"}; then
    # `init` legitimately exits non-zero when the brain is ALREADY initialized —
    # the normal case when a machine boots on a fresh volume against a DB an
    # earlier machine provisioned. That is the only tolerable failure, and the
    # config file is the proof: init writes it, so if it is still missing then
    # init failed for a real reason. Verify, don't assume.
    [ -f "$CONFIG" ] \
      || die "gbrain init failed and wrote no config at $CONFIG — refusing to serve"
    log "init reported already-initialized; config verified present — continuing"
  fi
else
  log "config present — skipping init"
fi

# Bare-wikilink basename resolution (issue #972) — OFF by default upstream.
#
# This brain's pages carry path-qualified slugs (`articles/foo`, matching
# gbrain's own deriveSlugFromPath) while its wikilinks are bare basenames
# (`[[foo]]`). Without this flag every candidate fails the allSlugs.has()
# filter in reconcilePageLinks and is dropped as a dangling reference.
#
# Measured on this corpus: 0 links with the flag off, 98 with it on — and 98
# wikilinks + 30 gazetteer mentions = 128, exactly the local brain's edge
# count. That equality is the actual proof that markdown is the system of
# record: rebuild anywhere, get the same graph.
#
# So this is not a preference, it is a correctness setting for THIS corpus, and
# it must be set at deploy time. A cold rebuild on a brain that lacks it
# produces a silently emptier graph from byte-identical markdown — no error, no
# warning, just 128 → 0 edges. Set unconditionally: `config set` is idempotent
# and the DB plane is read by both the CLI and the server's auto-link path.
#
# Safe here because basenames are unique (verified: 84 distinct for 84 pages).
# A brain with colliding basenames should leave this off — that ambiguity is
# precisely why upstream defaults it to false.
gbrain config set link_resolution.global_basename true >/dev/null 2>&1 \
  || log "warning: could not set link_resolution.global_basename — wikilinks may not resolve"

# ── Model routing ────────────────────────────────────────────────────────────
# Every tier defaults to `anthropic:*`, and this deployment has NO
# ANTHROPIC_API_KEY — it dispatches through the codex CLI against a ChatGPT
# subscription instead. Unset, the brain therefore fails at the first phase that
# calls a model, ~20 minutes into a dream cycle, with
# "Anthropic chat requires ANTHROPIC_API_KEY". Measured: extract_atoms failed on
# 2/2 pages that way, which left synthesize_concepts with nothing to cluster —
# so the entire synthesis half of the brain was inert while every phase still
# reported ok.
#
# Why the split: `luna` emits no reasoning tokens (measured 12406 in / 7 out),
# `mini` does (10636 in / 23 out, 14 reasoning). High-volume mechanical paths get
# luna; judgement-shaped work gets mini.
#
# Note every codex dispatch carries ~12.4k input tokens of agent-harness system
# prompt regardless of task size. That is free against flat-rate subscription
# quota and ruinous metered — prefix caching (72-82% measured) is what makes it
# viable at cycle volume. Do NOT repoint these at a metered provider without
# re-reading that number.
#
# Set unconditionally: `config set` is idempotent, and these live in the DB
# plane, so a brain restored from a backup without them is silently misrouted.
set_model() {
  gbrain config set "$1" "$2" >/dev/null 2>&1 \
    || log "warning: could not set $1=$2"
}

MODEL_FAST="${GBRAIN_MODEL_FAST:-codex-cli:gpt-5.6-luna}"
MODEL_REASON="${GBRAIN_MODEL_REASON:-codex-cli:gpt-5.4-mini}"

set_model models.tier.utility   "$MODEL_FAST"
set_model models.tier.reasoning "$MODEL_REASON"
set_model models.tier.deep      "$MODEL_REASON"
set_model models.tier.subagent  "$MODEL_REASON"

# facts.extraction_model resolves to tier.reasoning by default. It is the
# highest-volume LLM path in the cycle, so it is pinned to the model WITHOUT
# reasoning tokens rather than inheriting.
set_model facts.extraction_model      "$MODEL_FAST"
set_model models.contextual_synopsis  "$MODEL_FAST"
set_model models.expansion            "$MODEL_FAST"

# models.dream.extract_atoms does NOT go through the tier system: it carries its
# own DEFAULT_EXTRACT_ATOMS_MODEL = 'anthropic:claude-haiku-4-5', and
# `gbrain models list` DOES NOT DISPLAY IT. A full audit of that table showed 14
# routes all correctly on codex-cli while this one was still pointed at
# Anthropic. A model route invisible to the routing inspector is why this
# survived until a phase actually tried to dispatch — so it is set explicitly
# here, and listed in TASKS.md, because nothing else will surface it.
set_model models.dream.extract_atoms  "$MODEL_FAST"

# Activate the pack. `init` writes a config pointing at the default taxonomy, so
# without this the brain runs base-v2 and the whole point of shipping a pack is
# lost. Fatal on failure: a schema mismatch means pages get typed wrong from the
# first write, and re-typing them afterwards is far more expensive than not
# serving. Skipped when already active so a warm boot stays a no-op.
if [ -n "${GBRAIN_SCHEMA_PACK:-}" ]; then
  ACTIVE="$(grep -o '"schema_pack"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/')"
  if [ "$ACTIVE" = "$GBRAIN_SCHEMA_PACK" ]; then
    log "schema pack '$GBRAIN_SCHEMA_PACK' already active"
  else
    log "activating schema pack '$GBRAIN_SCHEMA_PACK' (was: ${ACTIVE:-default})"
    gbrain schema use "$GBRAIN_SCHEMA_PACK" \
      || die "could not activate schema pack '$GBRAIN_SCHEMA_PACK' — refusing to serve with the wrong taxonomy"
  fi
fi

# Bun occasionally blocks the global postinstall hook, leaving schema_version 0.
# apply-migrations is idempotent, which is why it is safe to run on EVERY cold
# start — but idempotent is not the same as optional. A non-zero exit here means
# the schema is not known-good: a transient pooler failure, or a migration that
# genuinely did not apply. Serving anyway would take writes against an unknown
# schema, so this is a hard gate.
gbrain apply-migrations --yes \
  || die "apply-migrations failed — refusing to serve against an unverified schema"

# ── 2. brain repo durability ─────────────────────────────────────────────────
# WHY THIS MATTERS: put_page writes markdown to disk. The Fly volume keeps that
# working tree across restarts, and `sources add --url` with a PAT triggers
# hardenBrainRepo, which installs scripts/brain-commit-push.sh — a synchronous
# add→commit→push that refuses to exit 0 without a push. Without it, agent
# writes live only on this machine's volume and never reach the remote.
#
# Hardening is CLI-only by design (it writes executables and a credential
# helper on the host), which is exactly why it runs here and not over MCP.
#
# Setting BRAIN_REPO_URL is a promise that those writes are replicated. From
# here on, every failure on this path is fatal: a half-wired repo is the worst
# outcome available, because the operator believes writes are being pushed while
# they accumulate on a single volume.
DURABILITY="volume-only"

if [ -n "${BRAIN_REPO_URL:-}" ]; then
  # `sources add` takes a REQUIRED positional <id> before its flags; calling it
  # with `--url` first makes "--url" the id and exits 2 on the next argument.
  # (The previous `|| log` here hid exactly that — durability never once ran.)
  SOURCES_JSON="$(gbrain sources list --json --timeout="$BOOT_TIMEOUT")" \
    || die "could not list sources — cannot verify brain-repo durability"

  # Seed the git credential BEFORE any branch below, because BOTH of them clone.
  #
  # This originally sat inside the `sources add` branch, which was enough for the
  # web machine: on its first boot the source did not exist, so it took that
  # path. The scheduled dream machine found the third case — source ALREADY
  # registered (the row lives in shared Postgres) but the volume is EMPTY — which
  # takes the re-clone branch instead, and that ran with no credential:
  #
  #   fatal: could not read Username for 'https://github.com': terminal prompts disabled
  #   [start] FATAL: re-clone of 'brain' failed — durability is configured but broken
  #
  # The guard did its job (refused to run a cycle it could not persist), but the
  # cause was ordering, not auth. Any boot on a fresh volume against an already
  # -provisioned database hits this — which is every scheduled run, and every
  # volume replacement. Hoisted so the credential exists before either clone.
  #
  # Written under the volume with 0600 and scoped BY URL — never a global config,
  # so git offers it only to this host.
  if [ -n "${GBRAIN_GITHUB_PAT:-}" ]; then
    CRED_FILE="${GBRAIN_HOME:-/data}/.git-credentials"
    REPO_HOST="$(printf '%s' "$BRAIN_REPO_URL" | sed -E 's#^https://([^/]+)/.*#\1#')"
    umask 077
    printf 'https://x-access-token:%s@%s\n' "$GBRAIN_GITHUB_PAT" "$REPO_HOST" > "$CRED_FILE"
    umask 022
    export GIT_CONFIG_COUNT=2
    export GIT_CONFIG_KEY_0="credential.https://$REPO_HOST.helper"
    export GIT_CONFIG_VALUE_0="store --file=$CRED_FILE"
    export GIT_CONFIG_KEY_1="credential.https://$REPO_HOST.username"
    export GIT_CONFIG_VALUE_1="x-access-token"
    log "seeded a repo-scoped git credential for $REPO_HOST"
  fi

  if printf '%s' "$SOURCES_JSON" \
      | jq -e --arg id "$BRAIN_SOURCE_ID" '[.sources[].id] | index($id)' >/dev/null; then
    # Registered already. The DB row is not proof of a working tree: a replaced
    # volume leaves the row behind with nothing on disk. `sources add` would
    # refuse (source_id_taken), so recover the clone the way gbrain does —
    # sync's validate_repo_state re-clones an owned clone that is missing.
    if [ -d "$BRAIN_REPO_PATH/.git" ]; then
      log "source '$BRAIN_SOURCE_ID' registered; working tree present at $BRAIN_REPO_PATH"
    else
      # Restore the WORKING TREE only — with git, not `gbrain sync`.
      #
      # `gbrain sync --source brain` looks like the right verb and is not: it
      # re-IMPORTS the clone's markdown into source `brain`, and the pages
      # already live in source `default` (that is where MCP writes land). The
      # first scheduled run did exactly that and duplicated the entire brain —
      # `default = 109, brain = 85, slugs in BOTH sources: 85`. Every page twice
      # in search, twice through the dream cycle, embedded twice.
      #
      # Nothing needs importing here. Postgres is intact and shared; the only
      # thing missing on a replaced volume is the files. So clone them back and
      # touch no rows. `harden` below re-verifies push auth on the fresh tree.
      log "source '$BRAIN_SOURCE_ID' registered but no working tree — restoring the clone"
      rm -rf "$BRAIN_REPO_PATH"
      git clone --quiet "$BRAIN_REPO_URL" "$BRAIN_REPO_PATH" \
        || die "could not restore the working tree for '$BRAIN_SOURCE_ID' from
    $BRAIN_REPO_URL — durability is configured but broken"
      log "working tree restored at $BRAIN_REPO_PATH ($(git -C "$BRAIN_REPO_PATH" rev-parse --short HEAD 2>/dev/null || echo '?'))"
    fi
  else
    log "registering brain repo source '$BRAIN_SOURCE_ID'"
    # --no-harden: `sources add` hardens best-effort and NEVER fails the add if
    # hardening fails, so its exit code cannot prove durability. Split the two
    # steps and let the explicit harden below be the thing that must succeed.
    # GBRAIN_GITHUB_PAT is read by gbrain for the credential wiring; never echoed.
    # The credential this clone needs was seeded above the branch. It has to be:
    # `sources add` clones FIRST and hardens afterwards, and hardening is what
    # wires the credential helper — deferred here with --no-harden. On a PRIVATE
    # repo that ordering deadlocks, and with GIT_TERMINAL_PROMPT=0 it fails fast
    # and loud ("could not read Username") instead of hanging on a prompt no one
    # can answer, which is the only reason it was diagnosable at all.

    # Capture and REPLAY gbrain's own output on failure. An earlier revision
    # discarded it, so a crash-looping boot reported only "clone or auth
    # rejected" — true, useless, and impossible to diagnose remotely because a
    # crash-looping machine cannot be SSH'd into. The failure has to carry its
    # own evidence; there is no second chance to go and look.
    # gbrain redacts the PAT in its own output, so this is safe to log.
    if ! ADD_OUT="$(gbrain sources add "$BRAIN_SOURCE_ID" --url "$BRAIN_REPO_URL" \
                      --clone-dir "$BRAIN_REPO_PATH" --no-harden 2>&1)"; then
      printf '%s\n' "$ADD_OUT" | while IFS= read -r l; do log "  sources add| $l"; done
      die "gbrain sources add failed — see the replayed output above"
    fi
  fi

  # The real gate. `sources harden` is idempotent (steps report ok/fixed on a
  # re-run) and it is the only thing that proves the promise end to end: it
  # re-wires the credential helper, reinstalls scripts/brain-commit-push.sh,
  # and finishes with an authenticated push-probe (`git push --dry-run
  # origin HEAD:<branch>`) — real push auth, not a reachability guess. It exits
  # non-zero when any step needs attention, which is precisely our failure
  # condition. All of its output is PAT-redacted at the source.
  #
  # --no-cron: the 30-minute pull cron cannot fire on a machine that is frozen
  # between requests, and this image ships no cron daemon. Skipping it keeps a
  # structurally-impossible step from being mistaken for a real problem.
  # Run ONCE, capture, replay on failure. Same reason as the clone above: a
  # machine that dies here is crash-looping and cannot be SSH'd into, so this
  # log line is the entire diagnostic. harden redacts the PAT in its own output.
  if ! HARDEN_OUT="$(gbrain sources harden "$BRAIN_SOURCE_ID" --no-cron 2>&1)"; then
    printf '%s\n' "$HARDEN_OUT" | while IFS= read -r l; do log "  harden| $l"; done
    die "brain-repo durability is NOT working (push auth, clone, or hook install failed).
        BRAIN_REPO_URL is set, so markdown writes are promised to reach the remote.
        Refusing to serve rather than accept writes that would exist only on this volume.
        Check GBRAIN_GITHUB_PAT scope/expiry and BRAIN_REPO_URL, then redeploy.
        To run volume-only on purpose, unset BRAIN_REPO_URL (see README tradeoff)."
  fi

  # THE SOURCE THAT RECEIVES WRITES MUST BE THE HARDENED ONE.
  #
  # `sources harden` proves the CLONE's source can commit and push. It says
  # nothing about whether that is the source MCP writes actually land in.
  #
  # Over HTTP, the write source comes from the CALLER'S CREDENTIAL, not from the
  # server's cwd and not from the source resolver: serve-http.ts resolves
  # `authInfo.sourceId ?? 'default'`, where authInfo.sourceId is
  # oauth_clients.source_id. That is deliberate — a remote caller's write scope
  # must be pinned by its grant, or any client could write into any source. A
  # LEGACY admin bootstrap token has no bound client row, so it resolves to
  # 'default'.
  #
  # The trap: `gbrain init` creates 'default' with NO local_path, while
  # `sources add brain --url ...` creates a SECOND source that gets hardened.
  # Import with a bootstrap token and every page lands in 'default', whose
  # write-through is inert for want of a local_path — while `harden` greenlights
  # 'brain', which nothing writes to.
  #
  # Measured, first deploy: 83 pages imported → 84 rows in Postgres, 0 files on
  # disk, 0 commits, and a green harden report. The markdown system-of-record
  # simply did not exist. Nothing in the health check or the gate could see it,
  # because every component was individually healthy.
  #
  # Two ways out: point 'default' at the clone (what this deployment does), or
  # mint an OAuth client bound to 'brain' and import with ITS token. Either way
  # the invariant to hold is the same, so this VERIFIES rather than repairs —
  # there is no CLI verb that sets local_path on an existing source (`sources`
  # offers add/harden/set-cr-mode; `sources add` is a bare INSERT that would
  # collide on the id `gbrain init` already created). Remedy is one UPDATE.
  # Assert on `default` specifically: that is the literal id dispatch.ts falls
  # back to, so it is where MCP writes go regardless of what else is
  # registered. `sources list --json` returns {"sources":[...]}, not a bare
  # array — jq against the wrong shape yields empty and would trip this guard
  # on every boot, so the shape is pinned here deliberately.
  DEFAULT_PATH="$(gbrain sources list --json 2>/dev/null \
    | jq -r '(.sources // [])[] | select(.id=="default") | .local_path // empty' 2>/dev/null)"
  if [ -z "$DEFAULT_PATH" ] || [ "$DEFAULT_PATH" = "null" ]; then
    die "source 'default' has no local_path, and MCP put_page writes THERE
    (src/mcp/dispatch.ts: \`opts.sourceId ?? 'default'\`). Write-through would
    skip silently: pages land in Postgres, no markdown, no commit, and every
    call still returns success. Fix:
      UPDATE sources SET local_path='$BRAIN_REPO_PATH' WHERE id='default';"
  fi
  log "MCP write path verified: source 'default' → $DEFAULT_PATH"

  DURABILITY="remote"
  log "durability verified: push auth confirmed for $BRAIN_SOURCE_ID"
else
  # A supported configuration, not a degraded one — so it does not block the
  # boot. It IS a smaller promise, and the README says so in the same terms.
  log "WARNING: BRAIN_REPO_URL unset — running VOLUME-ONLY."
  log "         Markdown writes survive restarts but exist on exactly one disk:"
  log "         lose or destroy the volume and the file system-of-record is gone."
fi

# ── 2.5 batch role: the nightly dream cycle ──────────────────────────────────
# `dream` is CLI_ONLY and in THIN_CLIENT_REFUSED_COMMANDS — there is no MCP op
# for it — and a scale-to-zero web machine is asleep at 2am by definition. So the
# cycle runs as a SCHEDULED MACHINE off this same image.
#
# It goes through start.sh rather than `--entrypoint "" -- gbrain dream` (which
# fly.toml originally suggested) because everything above is load-bearing for a
# correct cycle: schema pack activation, the 8 model routes, global_basename, the
# clone, and the durability + write-path guards. Bypassing the entrypoint would
# run the cycle against an unconfigured brain — which is exactly how
# extract_atoms ended up dispatching to Anthropic with no API key.
#
# The scheduled machine needs its OWN volume: Fly attaches a volume to exactly
# one machine, and gbrain_data belongs to the web machine. That is fine — the
# real state is in Postgres and GitHub, so this volume is a scratch clone. It
# re-clones on first boot and reuses the tree after.
#
# --dir is REQUIRED. Without it the cycle silently downgrades to DB-only phases
# and skips lint/backlinks/sync/synthesize/extract/patterns, reporting "partial"
# in a line most people will not read. Measured: 6 of 23 phases skipped that way.
if [ "${GBRAIN_ROLE:-serve}" = "dream" ]; then
  log "role=dream — running the cycle instead of serving"
  [ "$DURABILITY" = "remote" ] \
    || die "role=dream requires a hardened brain repo: the cycle WRITES pages
    (atoms, concepts, receipts) and without push durability those land on a
    scratch volume that is discarded when this machine exits"

  START_TS="$(date +%s)"
  set +e
  gbrain dream --dir "$BRAIN_REPO_PATH" --json > /tmp/dream.json 2>/tmp/dream.err
  DREAM_RC=$?
  set -e
  log "cycle finished rc=$DREAM_RC in $(( $(date +%s) - START_TS ))s"

  # Surface per-phase status in the machine log — this is the only place anyone
  # will see it, since the JSON dies with the machine.
  #
  # The whole block is REPORTING, so it must never decide the exit status — and
  # in the first revision it did. Observed: `cycle finished rc=0 in 29s` followed
  # by `Main child exited normally with code: 5`, with `dream role complete`
  # never logged. A CLEAN cycle exited non-zero, so Fly restarted the machine and
  # re-ran the entire cycle three times.
  #
  # The culprit is `WARNED="$(jq ...)"`. An assignment takes the exit status of
  # its command substitution, and THAT is not exempt from `set -e`. jq emitted
  # nothing here (zero phase lines reached the log), so /tmp/dream.json was not
  # the JSON this filter expects, jq exited non-zero, and the assignment carried
  # that out of the script.
  #
  # NOT the `[ "$WARNED" != "0" ] && log ...` line below, which was the first
  # thing I suspected: bash exempts commands in `&&`/`||` lists from `set -e`
  # (verified — that idiom exits 0 with WARNED=0). It is still written as if/fi,
  # because the intent reads better, but it was never the bug.
  #
  # Hence `|| echo 0` on the substitution and `|| true` on the group. Diagnostic
  # value only — the authority on success is DREAM_RC, captured above.
  {
    if command -v jq >/dev/null 2>&1 && [ -s /tmp/dream.json ]; then
      jq -r '.phases[]? | "  [\(.status)] \(.phase): \(.summary // "")"' /tmp/dream.json 2>/dev/null \
        | while IFS= read -r l; do log "$l"; done
      WARNED="$(jq -r '[.phases[]? | select(.status=="warn")] | length' /tmp/dream.json 2>/dev/null || echo 0)"
      if [ "${WARNED:-0}" != "0" ]; then
        log "WARNING: $WARNED phase(s) reported warn — check the summaries above"
      fi
    else
      log "no parseable --json output; replaying stderr instead"
      tail -20 /tmp/dream.err 2>/dev/null | while IFS= read -r l; do log "  dream| $l"; done
    fi
  } || true

  [ "$DREAM_RC" -eq 0 ] || die "dream cycle exited $DREAM_RC"
  log "dream role complete — exiting 0 so Fly can reap this machine"
  exit 0
fi

# ── 3. readiness ─────────────────────────────────────────────────────────────
# Written only after the schema is proven and, when configured, durability is
# proven — both for THIS boot. The healthcheck requires this file in addition to
# a live HTTP port, so "the process is up" can no longer pass for "the machine
# is ready": a degraded boot either exited above or never got here.
printf 'ready %s durability=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DURABILITY" \
  > "$READY_MARKER"

# ── 4. serve ─────────────────────────────────────────────────────────────────
# --public-url is not optional behind a proxy: OAuth discovery metadata must
# advertise the issuer clients actually reach (RFC 8414 §3.3). Without it,
# every OAuth client fails on issuer mismatch.
PUBLIC_URL="${GBRAIN_PUBLIC_URL:-}"
if [ -z "$PUBLIC_URL" ] && [ -n "${FLY_APP_NAME:-}" ]; then
  PUBLIC_URL="https://${FLY_APP_NAME}.fly.dev"
fi

if [ -z "${GBRAIN_ADMIN_BOOTSTRAP_TOKEN:-}" ]; then
  # On a non-TTY start the generated token is hidden so it never lands in log
  # storage — which means you would have no way to reach /admin.
  log "WARNING: GBRAIN_ADMIN_BOOTSTRAP_TOKEN unset; the admin token will be"
  log "         hidden on this non-TTY start and /admin will be unreachable."
fi

# --bind is NOT optional here. gbrain's default changed to 127.0.0.1 in
# v0.34.1, and Fly's proxy reaches the machine over its private network — a
# loopback-bound server is invisible to it, so the machine boots healthy,
# passes every internal gate, and still answers no external request. The
# symptom is a running machine stuck at 0/1 checks with nothing wrong in the
# logs except gbrain's own startup warning.
#
# Binding 0.0.0.0 inside a Fly machine is not the exposure it looks like:
# the only route in is the Fly proxy, which terminates TLS and enforces the
# OAuth-protected app. There is no public interface on this container.
BIND="${GBRAIN_BIND:-0.0.0.0}"

log "serving on $BIND:$PORT  public-url=${PUBLIC_URL:-<none>}  durability=$DURABILITY"
exec gbrain serve --http --port "$PORT" --bind "$BIND" \
  ${PUBLIC_URL:+--public-url "$PUBLIC_URL"}
