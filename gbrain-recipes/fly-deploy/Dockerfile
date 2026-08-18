# gbrain remote MCP server on Fly.io — scale-to-zero.
#
# Three things make this non-obvious:
#
#   1. `put_page` is write-through to disk. On an ephemeral filesystem every
#      markdown file an agent writes is lost on the next restart — and with
#      scale-to-zero, restarts are constant. The DB survives; the markdown
#      system-of-record does not. Fixed two ways below: a Fly volume holds the
#      working tree, and `gbrain sources harden` installs gbrain's own
#      durability harness (synchronous add→commit→push) and proves push auth.
#
#   2. Bun sometimes blocks the top-level postinstall on global installs, so
#      schema migrations never run (gbrain issue #218). `apply-migrations` is
#      idempotent, so the entrypoint runs it on every cold start — and treats a
#      non-zero exit as fatal, because idempotent only means "safe to repeat",
#      never "safe to skip".
#
#   3. Neither of those is observable from the outside. A gbrain that is up but
#      unmigrated, or up with a repo that cannot push, answers `/` with a
#      cheerful 200. So start.sh writes a readiness marker only once both
#      invariants hold for THIS boot, and the healthcheck below demands the
#      marker as well as the port.

FROM oven/bun:1.3-slim

# git: required by the brain-repo durability harness (clone, commit, push).
# ca-certificates: TLS to Supabase and the model provider.
# curl: container healthcheck.
# jq: start.sh reads `gbrain sources list --json` to tell "already registered"
#     apart from "failed to register" — a distinction the old `|| true` erased.
# nodejs: the Codex CLI's entry point is `#!/usr/bin/env node`. This base image
#     ships bun and NO node, so codex installs fine and then dies at runtime
#     with "env: 'node': No such file or directory". Claude Code does not need
#     this — it ships a launcher that does not depend on a node on PATH — which
#     is exactly why the gap was invisible until codex was added. codex declares
#     engines.node >=16; bookworm's nodejs satisfies that.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl jq nodejs \
 && rm -rf /var/lib/apt/lists/*

# Never install from the npm registry — the package named `gbrain` there is
# unrelated. `github:` prefix is the only supported source.
#
# Pinned to the fork's branch, not upstream. Four fixes this deployment depends
# on are not in upstream as of 0.45.18: case-insensitive model ids (without it
# the configured embedder resolves to the wrong width and every embed fails),
# the DeepInfra recipe, a provider-aware probe budget, and the chat importer.
ARG GBRAIN_REF=github:marmikcfc/gbrain#feat/deepinfra-and-case-insensitive-ids
RUN bun install -g "${GBRAIN_REF}"

# Claude Code, so gbrain's `claude-cli` recipe works here as well as on a
# laptop. That recipe declares `auth_env.required: []` because the CLI owns its
# own auth — it dispatches by spawning `claude --print` and inherits whatever
# session the binary holds. Headless, that session comes from
# CLAUDE_CODE_OAUTH_TOKEN, set as a Fly secret rather than baked in.
#
# The payoff is that dream-cycle phases bill to a flat-rate subscription
# instead of per token. The cost is latency and memory: each call spawns a
# whole CLI (~16s measured on an M-series laptop, slower on shared-cpu), and
# the child process needs headroom this machine barely has at 512MB. Route
# high-volume work (facts extraction, per-chunk synopsis) to a hosted model
# and reserve claude-cli for the batched nightly phases.
RUN bun install -g @anthropic-ai/claude-code \
 && claude --version

# Codex CLI, for the `codex-cli` recipe. Same shape as claude-cli — gbrain
# spawns the binary and inherits its session — but the auth story differs:
# Anthropic ships CLAUDE_CODE_OAUTH_TOKEN for headless use; OpenAI ships no
# equivalent, so the session arrives as a seeded ~/.codex/auth.json (see
# start.sh). CODEX_HOME points at the VOLUME because codex rewrites auth.json
# when it refreshes its tokens — on the container filesystem that refresh would
# be discarded on every cold start, eventually leaving a stale refresh_token
# and an auth failure with no obvious cause.
# The version probe runs through /usr/local/bin — the path a RUNTIME shell
# resolves — rather than whatever bun leaves on its own PATH during the build.
# An earlier revision probed the build-time shim, which passed while the
# runtime binary was unrunnable for want of node.
RUN bun install -g @openai/codex \
 && /usr/local/bin/codex --version

# The schema pack ships WITH the image rather than being fetched at boot.
# Baking it makes the schema immutable per-deployment: a running machine cannot
# have its taxonomy changed underneath it, and a rollback rolls the schema back
# too. start.sh installs it into GBRAIN_HOME on first boot — a volume that
# already holds an edited pack is left alone.
COPY schema-packs/ /opt/gbrain/schema-packs/

ENV PATH="/root/.bun/bin:${PATH}"

# GBRAIN_HOME is honored uniformly and resolved lazily, so pointing it at the
# mounted volume keeps config, page-locks and the audit JSONLs across restarts.
# gbrain appends '.gbrain' itself, so this yields /data/.gbrain.
ENV GBRAIN_HOME=/data \
    BRAIN_REPO_PATH=/data/brain \
    PORT=8080 \
    # Deliberately NOT under /data: the readiness verdict must not outlive the
    # boot that earned it. /run is recreated with the container, so a machine
    # that fails to start cannot inherit a previous boot's "healthy".
    GBRAIN_READY_MARKER=/run/gbrain.ready \
    # Which of the baked packs to activate. start.sh treats a failure to
    # activate as fatal: serving under the wrong taxonomy types every page
    # incorrectly from the first write, and re-typing later is far more
    # expensive than not serving now.
    CODEX_HOME=/data/.codex \
    GBRAIN_SCHEMA_PACK=marmik-brain \
    # Init + upgrade banners assume a TTY; silence them in a container.
    GBRAIN_NO_ONBOARD_NUDGE=1

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 8080

# Readiness, not liveness. `/` returns 200 from a gbrain whose schema never
# migrated and whose brain repo cannot push — "the process is up" is the one
# thing that was never in doubt. So require BOTH:
#
#   · the marker, written by start.sh only after migrations (and, when
#     BRAIN_REPO_URL is set, a verified push) succeeded on this boot; and
#   · the port, which proves the server is actually accepting connections.
#
# Neither alone is readiness. A machine that started degraded never writes the
# marker — it exits first — so it can never report healthy.
#
# start-period covers a genuine first boot: migrations, then a full clone and an
# authenticated push-probe against GitHub.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD test -f "${GBRAIN_READY_MARKER}" \
   && curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/start.sh"]
