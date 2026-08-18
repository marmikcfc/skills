# gbrain on Fly.io — scale-to-zero remote MCP

Turns a local brain into one your agents reach from anywhere. `gbrain serve --http`
gives you OAuth 2.1, an admin dashboard at `/admin`, and the full operation catalog.

**Prerequisite that is easy to miss:** the HTTP server *requires Postgres*. It fails
fast on PGLite because the `access_tokens` table exists only in the Postgres schema.
A Supabase-backed brain is what makes any of this possible.

## Deploy

```bash
fly launch --no-deploy --name gbrain-marmik --region syd
fly volumes create gbrain_data --size 3 --region syd

# ── required ────────────────────────────────────────────────────────────────
# ?prepare=false matters: Supabase's transaction pooler (6543) does not support
# prepared statements. gbrain auto-detects this on 6543, but being explicit
# survives a future port change.
fly secrets set DATABASE_URL='postgresql://postgres.<ref>:<pw>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?prepare=false'

# Embeddings. These two resolve ONLY from the file plane and the env plane —
# `gbrain config set` is silently ignored for them, because they size the
# vector column and must stay stable across engine connects.
fly secrets set GBRAIN_EMBEDDING_MODEL='litellm:qwen/qwen3-embedding-8b'
fly secrets set GBRAIN_EMBEDDING_DIMENSIONS='1280'
fly secrets set LITELLM_BASE_URL='https://api.deepinfra.com/v1/openai'
fly secrets set LITELLM_API_KEY='<deepinfra key>'

# Admin access. On a non-TTY start gbrain HIDES the generated bootstrap token
# so it never lands in log storage — set your own or /admin is unreachable.
fly secrets set GBRAIN_ADMIN_BOOTSTRAP_TOKEN="$(openssl rand -hex 32)"

# ── remote durability — set BOTH or NEITHER ─────────────────────────────────
# The variable is GBRAIN_GITHUB_PAT. gbrain resolves the brain-repo PAT from
# --pat-file or GBRAIN_GITHUB_PAT and nothing else; a bare GITHUB_PAT is not
# read, and hardening then skips itself with one line on stderr. start.sh
# accepts GITHUB_PAT as an alias so older deployments keep working, but set
# the real name.
#
# Setting BRAIN_REPO_URL makes durability a HARD REQUIREMENT: if the clone,
# the credential wiring, or the push-probe fails, the server refuses to start.
# See "What happens when it is broken" below.
fly secrets set BRAIN_REPO_URL='https://github.com/<you>/brain.git'
fly secrets set GBRAIN_GITHUB_PAT='<pat with repo scope>'

fly deploy
```

Then open `https://<app>.fly.dev/admin`, paste the bootstrap token, and register an
OAuth client per agent (`client_credentials` for machine-to-machine, `authorization_code`
+ PKCE for browser clients like ChatGPT).

## Why the volume is mandatory

`put_page` is write-through: calling it creates the markdown file on disk, not just a
DB row. On Fly's ephemeral filesystem, with scale-to-zero restarting the machine
constantly, every agent write would be destroyed. The DB would survive and the
files would not — leaving the derived index intact and the system of record gone.

The volume holds the working tree. That is the floor, and it is not the same as
durability — pick which of the two you are running:

| | Writes survive a restart | Writes survive losing the volume | Boot behaviour |
|---|---|---|---|
| `BRAIN_REPO_URL` **set** | yes | yes — pushed to the remote | fails closed if the push cannot be proven |
| `BRAIN_REPO_URL` **unset** | yes | **no** — one disk, no copy | boots, logs a VOLUME-ONLY warning |

Volume-only is a legitimate configuration. It is just a smaller promise than it
looks like: a Fly volume is a single disk, not a backup. Destroy it — or destroy
the app — and the markdown system-of-record is gone with it, leaving the DB's
derived index pointing at nothing.

With `BRAIN_REPO_URL` + `GBRAIN_GITHUB_PAT`, `gbrain sources harden` installs
`scripts/brain-commit-push.sh` — a synchronous add→commit→push that refuses to exit 0
without pushing — and finishes with an authenticated push-probe
(`git push --dry-run origin HEAD:<branch>`). Belt and braces: the volume survives
restarts, the push survives the volume.

**Why the entrypoint re-runs `harden` on every cold start.** `sources add` hardens
best-effort and never fails the add when hardening fails, so its exit code proves
nothing about durability. `harden` is idempotent and exits non-zero when any step
needs attention, which makes it the only step that can actually be gated on.

## What happens when it is broken

`start.sh` is fail-closed. Every startup invariant either holds or the process exits
non-zero — it never degrades into a running server:

| Failure | Result |
|---|---|
| `apply-migrations` non-zero | exit; no server. Writes are never accepted against an unverified schema |
| `init` non-zero **and** no config written | exit. (`init` non-zero *with* a config present is the normal already-initialized case and continues) |
| Clone / auth failure, `BRAIN_REPO_URL` set | exit. A half-wired repo is worse than an outage: writes would accumulate on one volume while the deploy claims they are pushed |
| Push-probe failure (expired or under-scoped PAT) | exit, with the PAT redacted from the message |
| `BRAIN_REPO_URL` unset | boots normally, VOLUME-ONLY warning |

So a crash-looping machine after a deploy is the system working. Read `fly logs` for
the `[start] FATAL:` line — it names which invariant failed and what to fix. To run
without the remote on purpose, unset `BRAIN_REPO_URL`; do not work around the gate.

Readiness is separate from liveness. `/` returns 200 from a gbrain that never
migrated, so `start.sh` writes `/run/gbrain.ready` only once migrations — and, when
configured, the verified push — have both succeeded *on that boot*. The marker lives
on the container filesystem, never on `/data`, so a failed boot cannot inherit a
previous boot's verdict. The Dockerfile healthcheck requires the marker **and** the
port. Note that **Fly does not run Docker `HEALTHCHECK`** — Fly's own check is in
`fly.toml`, and it can only see the port; what keeps Fly from routing to a broken
machine is that a degraded boot never reaches `gbrain serve` at all.

### Knobs

| Variable | Default | Why you would change it |
|---|---|---|
| `BRAIN_SOURCE_ID` | `brain` | The source id the repo registers under; must stay stable across boots |
| `GBRAIN_BOOT_TIMEOUT` | `30s` | Boot-critical DB reads default to 10s in gbrain, which a cold cross-region pooler connect can exceed. Raise it if boots fail on connect timeouts rather than on real errors |
| `GBRAIN_READY_MARKER` | `/run/gbrain.ready` | Keep it off `/data` — a marker on the volume would outlive the boot that earned it |

## Scheduling the dream cycle

The web machine **cannot** run it. `dream` is in both `CLI_ONLY` and
`THIN_CLIENT_REFUSED_COMMANDS`; there is no MCP op for it, and a scale-to-zero
machine is asleep at 2am anyway.

```bash
# Simplest: a scheduled machine sharing the same volume.
fly machine run . --schedule daily --region syd \
  --volume gbrain_data:/data --env GBRAIN_HOME=/data \
  --entrypoint "" -- gbrain dream --json
```

The alternative is a Minions worker plus a webhook cron hitting
`submit_job(autopilot-cycle)` — that call returns in milliseconds while the worker
does the long cycle out of band, which suits a webhook timeout well. But it needs
a worker actually running: without one, jobs queue forever while the endpoint
returns 200 every night.

## Verify

```bash
fly logs                                            # look for [start] FATAL: first
fly ssh console -C "cat /run/gbrain.ready"          # marker + which durability mode
fly ssh console -C "gbrain doctor --json"
gbrain auth test https://<app>.fly.dev/mcp --token <token>
```

The marker records the mode it booted in — `durability=remote` or
`durability=volume-only`. If it says `volume-only` and you set `BRAIN_REPO_URL`,
the secret is not reaching the machine; check `fly secrets list`.

Prove the push path end to end rather than trusting the probe:

```bash
fly ssh console -C "gbrain sources harden brain --no-cron --dry-run"
git -C <your local clone> pull       # an agent's put_page should show up here
```

## Known rough edges

| Behaviour | Why |
|---|---|
| Rate limit resets on every wake | The limiter is a bounded in-memory LRU, not shared state |
| Machine never idles while `/admin` is open | The SSE activity feed holds the connection open |
| First request after idle is slow | Bun boot + Postgres connect; `auto_stop_machines = "suspend"` reduces it |
| `gbrain config set embedding_model` does nothing | That key is file/env plane only, by design |
| `GITHUB_PAT` alone silently disables durability | gbrain only reads `GBRAIN_GITHUB_PAT` (or `--pat-file`). `start.sh` aliases the old name; the secret should use the real one |
| Fly ignores the Dockerfile `HEALTHCHECK` | Machine checks come from `fly.toml` only. The readiness marker is enforced by the container healthcheck and by fail-closed startup, not by Fly |
| The scheduled `dream` machine skips these checks | It runs with `--entrypoint ""`, so `start.sh` — and every gate in it — is bypassed by design |
