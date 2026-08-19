# Session handover — 2026-08-18 → 2026-08-19

A 28-hour session across two auto-compactions (both at ~1M tokens), 12,615 records,
26MB of transcript. This document is what survived, extracted by fanning six agents
over the distilled transcript so nothing depended on one context window.

**Read section 1 before doing anything.** The rest is reference.

Provenance: everything below is marked **VERIFIED** (someone ran it and observed the
result) or **CLAIMED** (asserted, never tested). That distinction is the single most
important thing in this document — this session produced several confident assertions
that turned out to be false, and a handover that launders them into facts is worse
than no handover.

---

## 1. Operating rules earned the hard way

These are not general advice. Each one comes from a specific failure in this session,
and each cost real time.

### 1.1 A test that has never been observed failing proves nothing

**This happened five times.** It is the dominant failure mode of the whole session.

| Instance | What was wrong |
|---|---|
| `timeoutKillsTheWholeProcessTree` | `sleep 300 &` fixture passed against the *unfixed* code — `terminate()`'s group semantics cleaned up before the buggy SIGKILL path ran. Needed `trap '' TERM` to reach it. |
| 9 × `TranscriptScanner` fixtures | Passed a bare brief as the token with no dispatch trailer — a record shape real content never has. Only broke when the matcher was tightened. |
| `prompt_id` spool fixtures | 37 tests green while the headline feature had **no working end-to-end path**; fixtures and README documented a payload shape the real hook never emits. |
| provenance fixtures | Same failure one round later — `origin`/`promptSource` missing from fixtures. |
| `interveningTurnOrdering` | A test written *deliberately*, with a comment explaining why it was right. It encoded a misunderstanding and then defended it green for two rounds. |

**The rule: run every new test against the parent commit and watch it fail before
making it pass.** If it passes before your change, the fixture is wrong — fix the
fixture, not the assertion.

**How to do this well.** Reverting the whole source often won't compile (new tests
reference new API, so "fails first" becomes trivially true and proves nothing).
Instead **reintroduce only the specific old constant or line** into the new source.
That produced a clean signal on VOI-24: `elapsed 2.07s, needs ≥2.5s` plus the
`.incompleteOutput` rejection.

Two near-misses worth copying the caution from: a grep that returned nothing was
nearly read as "the bug didn't fire" (absence of a log line is not evidence), and a
test-deletion script over-deleted so only 7 of 13 tests ran and the pass looked real.

### 1.2 Verify the human-observable end state, not a same-layer read-back

`claude --resume <id> -p` was declared working on this evidence: pid alive, session
still `idle`, and **a third headless call recalled the injected word**. All true. All
irrelevant — `--resume` forks an invisible branch that writes to the same transcript
on disk. The live terminal never saw it.

What corrected it: the user typed into the real session and got *"You haven't asked me
to remember any word in this session."*

> Recoverable-via-a-third-headless-call is not the same as reachable-by-the-live-session.

A read-back that shares the failure mode of the thing it's checking is not a check.

### 1.3 Don't invent numbers, and check for an in-harness kill before blaming the OS

Three Codex reviews died. The diagnosis was "OOM, needs 1–2 GB headroom." A subagent
instructed to **disprove** it found:

- zero jetsam memory kills in 14 hours; all 5,098 `memorystatus` events were routine
  idle reaping (`osr_code: 9`), never code 4/5/7/11/12/13
- `node`/`codex` never appear in any `memorystatus` message; no crash reports
- actual peak RSS: **~270 MB**
- the real killer: Claude Code's own background-shell pressure reaper, armed only when
  `agentId === undefined && isInteractive() && idle ≥ 30 min`
- every killed round ended with a literal `[killed]` — written by the Claude Code
  binary, not the kernel

Self-audit, quoted because it names the mechanism:

> The "1–2 GB" figure was invented. I never measured what the Codex review consumes.
> I picked a number that sounded like it would help. The memory cause was correlation,
> not evidence… I treated a possibly-normal steady state as an anomaly because it fit
> the story I was telling.

**Corollary:** a hypothesis that explains the 3 failures but not the 12 identical
successes is incomplete. And 82% swap on an 8GB Mac is just Tuesday.

**Operational fix:** shells launched inside a subagent have a defined `agentId` and are
immune to the reaper. Otherwise set `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`.

### 1.4 A vacuous approve reads exactly like a pass

Two Codex reviews returned `verdict: approve` having reviewed **nothing** —
*"No branch diff or changed files were provided (HEAD is main)."* A third died on
`object 4b825dc… is a tree, not a commit`.

**Always verify the scope resolves before launching a review**, and treat an approve
over an empty diff as a failure, not a pass.

### 1.5 Check whether the primitive has the same constraint as the wrapper

`codex app-server daemon start` failed on a missing managed install → conclusion
"we need a new Codex build." Wrong. The raw `codex app-server --listen ws://…`
underneath has no such requirement and had already been used successfully minutes
earlier. Similarly, a `thread-store conflict … already has an active writer` error was
read as "go one layer lower, use PTY injection" when it actually meant "wrong process
topology."

> A locking error means the topology is wrong, not that you need a lower-level hack.

### 1.6 Instrument before fixing

The blank-window bug got three plausible fixes — PATH, SwiftUI reentrancy, tag types —
all landed, none was the cause. What broke the loop was one stderr line:
`SessionList.body evaluated, sessions=4`, which collapsed the search space to layout in
a single step. Then a bisect (replace body with plain `Text`) pinned it on
`NavigationSplitView`.

> A SwiftUI view that renders nothing emits no signal, and `swift build` succeeding
> tells you nothing about whether pixels appear.

### 1.7 Test the outcome you promised, not the mechanism you built

"Set up manually instead…" shipped **with two passing tests** and was completely inert —
`hookStatus` was only read at startup, so a hand-edited settings file was never
noticed. The tests asked "does `prepareForManualInstall()` avoid writing settings.json?"
and "do the instructions parse?" Neither asked *does the user end up with working
completion detection?*

Related: VOI-17 was marked Done with all five test cases genuinely passing through
shipped code — every one via a CLI harness, none touching the rendered UI. That is how
a completely blank app passed a full test suite.

### 1.8 A single sample of a probabilistic failure is indistinguishable from absence

The first settings-race run printed `rivalEditsOverwritten=0`. Six more runs found the
losses: **2 in 175 rounds (~1%)** under deliberate contention.

### 1.9 Check the representation, not just the value

One shape behind three bugs: `line.contains(brief)` against raw JSONL, where JSON
escapes newlines — so **any multi-line brief could never match its own record**, silently,
forever, in the normal case (Brief is a multi-line editor).

---

## 2. Where the code is

| Path | Remote | State |
|---|---|---|
| `~/canvas-mac` | `github.com/marmikcfc/geui` (private) | 21 commits, pushed, 73 tests green |
| `~/skills` | `github.com/marmikcfc/skills` | pushed; holds plugins + this doc |
| `~/.claude/workflows/` | — | **was unversioned**; being moved into `skills/workflows/` |

`canvas-mac` is the live product: a native macOS Swift app (SwiftPM, zero third-party
deps, Swift 6 strict concurrency) that dispatches a brief into a running Claude Code
session over a Unix socket and detects completion. `CanvasCore` (library, testable) +
`CanvasMac` (executable).

The earlier Node implementation at `skills/voice-canvas/` is **superseded** by the
macOS pivot but its measurements remain valid — don't re-benchmark them.

---

## 3. Verified system facts

### 3.1 Claude Code cross-session messaging

- **Socket: `/tmp/cc-socks/<pid>.sock`.** NDJSON. `claude agents --json` gives
  `sessionId → pid`; it is read-only, there is no send-side CLI. **VERIFIED** — codewords
  ZEPHYR, MERIDIAN, OBSIDIAN, LANTERN, CANVAS-SKATEBOARD-PELICAN-7731 all landed as real
  turns from plain Node processes with no Claude session.
- **Auth is NOT required on macOS.** A message sent with deliberately no token arrived.
  `CLAUDE_CODE_MESSAGING_TOKEN` / `CLAUDE_CODE_MESSAGING_SOCKET` exist; the binary logs
  its own inject recipe on startup. **VERIFIED.** This is what made "no plugin needed"
  possible.
- **Inbound messages hit a real permission gate** — terminal showed "Allowed by auto mode
  classifier", not silent auto-accept. Peer messages carry an anti-escalation preamble.
- **Claude Code wraps injected text** as `"Another Claude session sent a message:\n…"`,
  so exact content equality can never identify your own dispatch.
- **Busy vs idle sessions record differently**: an idle session writes a standalone `user`
  turn; a **busy** session takes it mid-turn and writes no standalone record. A
  transcript-grep delivery check false-negatives on busy sessions. **VERIFIED.**
- **Sessions may legitimately refuse a brief** as a possible injection probe. Briefs over
  this socket carry no provenance — hence the dispatch trailer (§4.2).
- `claude agents --json` returns **two entry shapes**: `pid`/`status` (interactive,
  dispatchable) and `id`/`state` (background, not). Interactive `name` is
  `<dirname>-<2 random chars>` (`skills-f1`, `skills-ad`) — two sessions in one repo are
  visually indistinguishable. `aiTitle` in the transcript would be a better display name.

### 3.2 Transcripts and hooks

- Path: `~/.claude/projects/<cwd-with-slashes-as-dashes>/<session-id>.jsonl`
- **The title field is `aiTitle`, not `title`.** A null from a parser is a key-name bug
  before it is a windowing bug — dump the actual keys.
- **Injected vs typed is structural** (**VERIFIED** by scanning a real transcript):

  | field | injected | typed |
  |---|---|---|
  | `promptSource` | `"system"` | `"typed"` |
  | `origin` | `{"kind":"peer","from":"unknown"}` | `{"kind":"human"}` |

  `origin.kind == "peer"` does **not** identify *your* dispatch — other Claude peers match.
- **Stop hook payload**: `session_id, transcript_path, cwd, prompt_id, permission_mode,
  effort, hook_event_name, stop_hook_active, last_assistant_message, background_tasks,
  session_crons`. `prompt_id` matches `promptId` on user records — exact turn identity.
  A build that doesn't send `prompt_id` cannot support completion detection.
- The Stop hook must **always `exit 0`** so a Canvas failure can never wedge a session.

### 3.3 `claude -p` (headless)

- **14.3s TTFT (haiku), 21.0s (sonnet).** Streaming doesn't rescue it — the first SSE
  event alone costs 7.5s, because every invocation boots the whole Claude Code
  environment. **Unusable for anything interactive.**
- **Environment contamination**: despite an explicit `--system-prompt`, it replied
  "Classification: Spike —", leaking the repo's own brainstorming skill.
- `--json-schema` works reliably. Fine for background extraction, where 14s is free
  under subscription.

### 3.4 Codex CLI

- **`codex exec review` takes EITHER a scope flag OR a prompt, never both.**
  `--uncommitted`, `--base <BRANCH>`, `--commit <SHA>` all conflict with `[PROMPT]`,
  including via stdin: `error: the argument '--uncommitted' cannot be used with '[PROMPT]'`.
  **VERIFIED, all four variants.** Use plain `codex exec` with the scope in the prompt.
- **`codex exec` hangs forever without an approval policy** (timed out at 5 min on a
  trivial prompt). `-c approval_policy=never -c sandbox_mode=read-only` → clean JSON,
  exit 0. **VERIFIED.**
- `--output-schema <FILE>` makes Codex emit schema-conforming JSON directly — removes the
  lossy step of a Claude agent reading Codex prose and retyping it.
- `-c model_reasoning_effort=…` overrides `~/.codex/config.toml`. That config held
  `"medium"`; **all sixteen review rounds this session ran at medium**, not high.
  Model is `gpt-5.6-terra`; a `model_migrations` table means **don't pin it**.
- The plugin companion (`codex-companion.mjs`) doesn't use `codex exec` at all — it drives
  the app-server JSON-RPC protocol with `approvalPolicy: "never"`.
- **A second app-server cannot attach to a thread a live session owns**:
  `thread-store conflict: … already has an active writer`. A bare `codex` spins up its own
  private embedded app-server, which holds the lock. Shared-daemon injection works
  (`codex app-server --listen ws://…`, **VERIFIED** — injected word "cascade" recalled),
  but **every Codex session must be launched as `codex --remote ws://…` from the start.
  There is no retroactive attach.** Contrast: Claude needs zero special launch.

### 3.5 Toolchain gotchas (macOS)

- `date +%s%N` — no `%N` on macOS. Hit 3× across the session.
- `python3` under pyenv breaks (`pyenv: python3.10: command not found`); use `/usr/bin/python3`
  or `uuidgen | tr 'A-Z' 'a-z'`.
- Bash associative-array keys get arithmetic-evaluated: `value too great for base`.
- `git commit -m "$(cat <<'EOF' …)"` breaks on apostrophes — use `-F <file>`.
- **Never patch Swift with `node -e '…`template literals`…'`** — Swift `\(…)` and backticks
  collide with JS template syntax. Perl is worse: `perl -0pi -e` ate `$0` in
  `withUnsafeBytes { write(fd, $0.baseAddress, …) }`. Use a `.js` patch file, or Edit.
- **Backticks inside a JS template literal terminate it** → `SyntaxError: missing ) after
  argument list`.
- `node --check` on workflow scripts **always** false-positives (`Illegal return statement`) —
  top-level `return` is legal inside the runtime's async wrapper. Strip the export, wrap the
  body as the runtime does, then parse.
- A linter touches files in `canvas-mac` between Read and Edit — expect
  `File has been modified since read`; re-Read immediately before editing.
- Window inspection: `osascript` System Events is blocked (`-1728`), `python3 Quartz` is
  missing. What works: a compiled Swift helper using `CGWindowListCopyWindowInfo`, then
  `screencapture -x -l <window-id>` — **the app's own window only**.
- Plugin cache holds **frozen copies** at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
  Symlink it to the repo to keep edits live. **Codex scans `~/.codex/skills` separately.**

### 3.6 Voice stack measurements (M1, 8GB — hardware matters, FluidAudio's "190×" is M4 Pro)

| | Result |
|---|---|
| ASR sherpa-onnx Parakeet 110M int8 (Python) | RTF 0.015, ~67× realtime, ~45ms for 3s |
| ASR same model via `sherpa-onnx-node` | RTF 0.044 (native prebuilts, no toolchain) |
| ASR streaming zipformer-en-2023-06-26 (296MB) | 0.0% WER, first partial 1120ms, RTF 0.066 |
| ASR streaming zipformer-en-20M | **78% WER — broken, not merely weaker** |
| TTS PocketTTS (Swift/CoreML-ANE) | TTFB **162–231ms** |
| TTS PocketTTS (Node/CPU-ONNX) | TTFB 619–947ms — **~4× penalty for staying in Node** |
| TTS Kokoro | TTFB ~2000ms, TTFB == synth time, no streaming — unusable for conversation |

- **The offline export cannot stream**: `OnlineRecognizer.from_nemo_ctc` on
  `parakeet-tdt-ctc-110m-en` hard-fails with `'window_size' does not exist in the metadata`.
- **Pipecat local STT is batch, not streaming** — **VERIFIED three ways**, including runtime
  instrumentation: `fed 372 chunks of 20ms -> run_stt calls DURING speech: 0`. Only Whisper
  and Moonshine are local, both `SegmentedSTTService`. The gap is specifically *local +
  streaming*; upstream is unlikely to close it (issue #3331 closed with "use NvidiaSTTService",
  which is CUDA/Linux).
- **`@livekit/agents` console mode is not WebRTC** — `TcpSessionTransport`, `url: ""`,
  `fakeJob: true`. Satisfies "no WebRTC".
- **PocketTTS is CC-BY-4.0, commercially usable with attribution.** sherpa-onnx's README
  claiming non-commercial is **wrong** — check the shipped LICENSE, not the README.
- **tldraw is `NOASSERTION`** and needs a production License Key. Excalidraw is MIT.

---

## 4. canvas-mac: decisions that should not be re-litigated

### 4.1 settings.json race — resolved by product decision, not code

Reported in **8 of 16 review rounds**; five successive designs, four rejected:

1. "compare-and-swap" — an overclaim; you cannot make read-compare-write atomic against
   writers who don't share your lock.
2. flock + `ftruncate`+`pwrite` through the locked fd — **worse**: a crash between the two
   leaves `settings.json` *empty* and Claude Code won't start. Traded a rare lost edit for
   a possible total loss.
3. temp + fsync + atomic rename + bounded merge-retry.
4. move all slow work before the final equality check, shrinking the window to a compare
   and a syscall.
5. **stop fixing, start measuring and offer an exit.**

Final state: ~1% loss under deliberate contention (2/175), always with a timestamped
backup; automatic mode is an **explicit user-confirmed opt-in**, and a fully working
manual path exists where Canvas never opens the file. There is no configuration API and
no shared lock. **Do not reopen without one.**

### 4.2 Correlation — evidence strengthened five times, never made cleverer

sessionID → + transcript offset → + brief text present → + `promptId` equality →
+ peer-origin filter → + a unique dispatch token in a structured trailer
(`— sent by the user's Canvas app · dispatch <uuid>`).

The trailer also solved provenance (VOI-23): an unattributed brief looks like an
injection probe to the receiving agent.

**It is not an authenticated binding, and the code says so.** The socket takes no auth;
any local process that could forge a trailer can already dispatch arbitrary prompts and
read every transcript. Token entropy is sized against **accidental** collision.

### 4.3 setsid() descendants cannot be contained on macOS

`setsid()` leaves the process group *and* session by definition; macOS has no cgroups or
PID namespaces. A review recommendation to "terminate that containment scope" is not
implementable. Liveness was moved **off the kill**: readers poll a `dup()`'d fd against
their own deadline and always exit.

`Process.terminate()` is NSTask and **already signals the group** — the defect was the
single-pid `kill(pid, SIGKILL)` escalation. `kill(-pid, …)` is only safe after proving
`getpgid(pid) == pid`, else it signals your own group.

### 4.4 Open tech debt — VOI-24

`timeout` (10s), `readerGrace` (6s) are **chosen, not measured**. No latency data exists
for real `claude agents --json`. `drainGrace` was removed in `71b3ab3`.

---

## 5. The workflow — `workflows/feature-with-review.js`

Acceptance criteria → design → adversarial design review (Codex + Fable) → implement →
Codex code review until clean. Tracked in Linear + Notion.

**First real run (VOI-24): 37 agents, 2.2M tokens, 100 minutes.** It worked — and the fix
it produced was *sharper than specified*, distinguishing "reader threads exited" from
"every byte was read" (`fullyDrained`).

Seven fixes were applied after watching that run:

1. Review loops **until no medium/high**, 8-round backstop + stall detector; findings
   carried forward, never dropped (dropping makes "until clean" unreachable).
2. **Same-file change sites merged into one agent** — VOI-24's 7 build agents → 2. Six
   agents serially re-reading one file cost ~450k tokens and no agent held the whole picture.
3. Skip the wave audit when sequential — it detects concurrent clobbering, impossible with
   one agent (~265k Opus tokens wasted).
4. Cumulative allowlist — `git status` is cumulative, the allowlist was per-wave, so every
   earlier wave's file read as a stray.
5. Haiku for the audit (was Opus at ~38k tokens per `git status`).
6. Acceptance criteria derived from the **requirement, before any design exists** — if the
   agent choosing the solution also writes the criteria, they drift toward what was built.
7. Plain `codex exec`, not `codex exec review <scope>` (§3.4).

**Parallelism is `sequential` by default.** `auto` uses model-proposes / code-verifies /
runtime-detects: the model finds coupling paths can't show (shared enums, generated code,
cross-site tests), code re-splits any wave that isn't provably disjoint, and `git status`
catches strays afterward. **Detection is not prevention** — sequential is the only guarantee.

**`remaining: [...]` in workflow output is stale by construction** — the last round
dispatches fixes and then hits the cap before re-reviewing, so findings can be reported as
outstanding when they're already fixed.

---

## 6. Dead ends — do not retry

- `claude --resume <id> -p` for live dispatch — forks an invisible branch.
- `claude -p` for anything latency-sensitive — 14.3s TTFT floor + skill leakage.
- `claude setup-token` as a bearer for the raw Messages API — ToS gray area, and it works
  only because the system prompt impersonates Claude Code. Ships to a public marketplace.
- PTY injection / Superset `terminals_send` for either agent — unnecessary; native messaging
  works on any session.
- `codex app-server daemon start` — needs the managed standalone install; the raw
  `codex app-server --listen ws://` doesn't.
- Injecting into a thread owned by a bare `codex` — hard-blocked, no workaround.
- `posix_spawn` reimplementation of `Foundation.Process` — NSTask already gives group semantics.
- JSONL-append for Stop events — partial reads, interleaving, rotation loss. Use a spool
  directory with atomic rename (`mktemp` + `mv` to `<name>.event`). **Watch the filename**:
  `mktemp ".incoming.XXXX"` + rename to `$TMP.event` produces a *hidden* file the watcher
  skips — every event silently dropped.
- Orphan-commit baselines for review snapshots — no merge-base, diff scopes to nothing.
  Make the empty commit the **root** of history.
- Fully parallel implementation agents in one working tree — unenforced declarations, shared
  `.build/`, shared git index.
- tldraw (license), Kokoro for conversation (TTFB), zipformer-20M (78% WER), Buzz (reduces to
  sherpa-onnx), Pipecat as a Node runtime (doesn't exist), LiveKit for a local canvas (needs
  an SFU to talk to yourself).
- `open Canvas.app` for verification — doesn't persist; run the binary directly.
- Grepping a busy session's transcript for delivery — false-negatives (§3.1).

---

## 7. Standing user preferences

- **"we don't want to close the interactive Claude or Codex session that is on"** — stated
  three times; the project's gating constraint.
- **"I do not want to pay for WebRTC."** Non-negotiable.
- Users bring their own API keys — LLM first, eventually TTS/ASR.
- **Don't screenshot the desktop.** Per-window capture of the app's own window only, or just
  ask what they see.
- Gate debug instrumentation behind a flag rather than deleting it.
- **Don't make system-level installs or mint credentials unilaterally.**
- **Don't edit permissions to unblock a denied command** — and don't wrap a blocked command
  in a script to get it past the classifier.
- Every step should carry a test.
- Verify at runtime rather than from docs: *"Are you sure? Can you check pipecat's
  implementation and run it to confirm"*.
- Commits are made but **not pushed** unless asked.

---

## 8. Open items

- **VOI-24 remainder**: measure real `claude agents --json` drain latency; set `timeout` /
  `readerGrace` from the distribution instead of guesses.
- **Residual test inconsistency**: three `let started = Date()` remain in
  `SessionDiscoveryTests.swift`, one at line 379 *inside* the test written to prove monotonic
  behaviour. Its `elapsed < 2` upper bound means a backward clock step reads short and still
  passes — milder than the lower-bound cases that were converted.
- **VOI-18 … VOI-23** open: M2 read-back, M3 push-to-talk, M4 canvas, M5 hands-free, M6 car.
- **Codex side never visually confirmed** — VOI-13 left In Progress; the shared-daemon test
  used two headless scripts, never a real `codex --remote` TUI.
- The workflow has run **once**. Its until-clean loop and acceptance-criteria phase are
  implemented and unit-tested but have **never executed**.

---

*Assembled by distilling 26MB → 0.7MB (dropping tool-result bulk, keeping user turns,
assistant prose, tool calls, and error-bearing results only), splitting into six chunks,
and fanning one agent per chunk — the claude-rlm pattern, because no context window holds
the source.*
