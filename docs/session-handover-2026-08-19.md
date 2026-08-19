# Session handover — 2026-08-18 → 2026-08-19

A 28-hour session across two auto-compactions (both at ~1M tokens), 12,615 records,
26MB of transcript. This document is what survived, extracted by fanning six agents
over the distilled transcript so nothing depended on one context window.

**Read section 1 before doing anything. Section 4 is where you pick up work.**

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

## 2. The product

**Not a plugin with a web page attached. A native macOS menu-bar app that treats your
running coding sessions as first-class objects.**

### The core loop

Open the app and you see every live Claude Code session on the machine — name,
directory, busy or idle. Pick one and you're in a conversation with it: speak, and the
framed brief goes into that **running** session, not a copy of it. The terminal you were
already looking at picks up the turn.

When it finishes, a card lands on that session's canvas describing what it actually did —
what changed, what was verified, what wasn't. **The canvas outlives the session:** close
the terminal and the record stays. Reopen tomorrow and the canvas is there, with a button
to start a fresh session in the same directory.

### Why native

- The mic belongs to the app, so **there is no audio transport at all** — no browser
  capture, no localhost websocket, no WebRTC. (Satisfies the hard constraint.)
- Apple Neural Engine access is the difference between **185 ms and 700 ms** to first
  speech.
- The session-browser UX is app-shaped, not page-shaped.

### Why no plugin is needed

Everything a plugin would have provided is reachable from outside a session:

| Need | Without a plugin |
|---|---|
| Find live sessions | `claude agents --json` — pid, sessionId, cwd, name, busy/idle |
| Send into a session | Write to `/tmp/cc-socks/<pid>.sock`. **Tested with no auth line at all** |
| Know when work finished | App writes a `Stop` hook into `~/.claude/settings.json` |
| Read what happened | Transcript JSONL on disk |

> Hooks are a settings feature; plugins are only packaging.

A plugin remains optional sugar for a `/canvas` slash command. Not on the critical path.

### The stack — provider and license

| Layer | Provider | License | Measured |
|---|---|---|---|
| ASR (streaming) | NVIDIA `parakeet-realtime-eou-120m` (CoreML via FluidAudio) | CC-BY-4.0 | 0% WER |
| ASR (batch, punctuated) | NVIDIA `parakeet-tdt-0.6b-v3`, 25 languages | CC-BY-4.0 | ~350 ms * |
| TTS | Kyutai **PocketTTS** (flow-LM + Mimi codec, voice cloning) | CC-BY-4.0 | 162–231 ms TTFB |
| Turn detector / EOU | Same Parakeet EOU model, emitted inline with transcription | CC-BY-4.0 | inline, 1 pass |
| Audio runtime | **FluidAudio** (Swift) — ~11k lines of pipeline you don't write | Apache-2.0 | — |
| LLM | User's own key — Anthropic Messages · OpenAI Responses · OpenAI Chat (OpenRouter, Ollama) | user's account | 3 wire formats tested |
| Canvas | native SwiftUI (chosen) · Excalidraw MIT (fallback) · tldraw (needs license key) | see below | — |

\* wall-clock including process start and model load — the CLI reloads models per
invocation, so true inference is lower. A persistent sidecar is needed to measure it.

**Two license findings that were surprises:**

- **PocketTTS is CC-BY-4.0, commercially usable with attribution.** sherpa-onnx's README
  calls it "non-commercial" — that is **wrong**. The bundled LICENSE and Kyutai's own
  MODEL_LICENSE both say CC-BY-4.0.
- **tldraw is not open source.** License reports `NOASSERTION`; production needs a
  **License Key**. Development environments are permitted. Bundling it into a shipped app
  is a commercial-licensing conversation, not a dependency choice.

**Attribution is a build task, not a footnote.** Three CC-BY-4.0 models means the app must
visibly credit NVIDIA and Kyutai. An Acknowledgements pane exists
(`Sources/CanvasMac/Views/AcknowledgementsView.swift`) — keep it current.

### Things that will bite (from the decision record)

| Gap | Why it matters |
|---|---|
| No punctuation from streaming ASR | Both streaming models return unpunctuated caps. Fine for a turn detector, worse as LLM input. Needs a restoration pass or a punctuated batch re-run. |
| 8 GB is the real budget | Claude Code + models + app + browser. Streaming EOU showed 3082→4515 ms variance on identical input — smells like memory pressure, not model behaviour. |
| Which session am I talking to? | Interactive session names are `<dirname>-<2 random chars>`. Getting this wrong dispatches work into the wrong repo. |
| Session dies mid-conversation | The socket vanishes. Needs defined behaviour: hold the canvas, say so out loud, offer to restart. |
| Signing & notarization | A distributed Mac app needs a Developer ID, notarization, and mic-permission strings in Info.plist. |
| Privacy | Session digests go to whichever LLM the user configured. Ollama keeps it on-device — make that a visible switch. |
| Codex | Parked by choice. Mechanism proven; the path errors rather than pretending. |

---

## 3. The skateboard plan

Kniberg's rule: **every stage ships something a person can actually use**, not a component
waiting for other components. Each stage below is usable alone.

**The ordering rule that matters:** stages 1–2 need no models at all, and stage 3 needs no
turn detection. You reach a genuinely useful tool before touching the hardest engineering —
which is the whole point of the skateboard.

### 1. Session list + typed dispatch — *skateboard* (VOI-17)

App lists live sessions from `claude agents --json`. Pick one, type a brief, hit send — it
lands in the running session. A Stop hook tells you when it finished.

**Usable as:** a session switcher that beats hunting through terminal tabs.
No voice, no canvas, no models. Proves connect → dispatch → completion.

### 2. Read back what it did — *skateboard+* (VOI-18)

On the Stop hook, distill the trajectory into a summary — what changed, what was verified,
what wasn't — and show it in the app.

**Usable as:** never reading a tool-call log again.
Extraction logic already exists and is tested; it needs **porting, not designing**.

### 3. Push-to-talk — *scooter* (VOI-19)

Hold a key, speak, release. Parakeet transcribes, the LLM frames it, PocketTTS reads the
reply. No turn detection yet — **the key press *is* the turn boundary.**

**Usable as:** hands-free dispatch while reading code.
Sidesteps the hardest problem (endpointing) while proving the whole audio path.

### 4. Canvas with cards — *bike* (VOI-20)

Native pan/zoom canvas per session. Outcome summaries land as cards and persist after the
session dies.

**Usable as:** a durable record of what each session actually did.
Card kinds: markdown first, then HTML via `WKWebView`, then video via `AVPlayer`.

### 5. Hands-free conversation — *motorcycle* (VOI-21)

Drop push-to-talk. EOU detection ends turns, barge-in interrupts playback, and the agent
announces completions at a natural gap instead of cutting you off.

**Usable as:** an actual conversation partner while you work.
**This is where "flawless" is won or lost. Budget real tuning time.**

### 6. Rich artifacts + cloud options — *car* (VOI-22)

Generated video explainers on the canvas, cloud ASR/TTS as opt-in upgrades, voice cloning,
Codex sessions alongside Claude.

**Usable as:** the thing you'd actually show someone.

---

## 4. Where we are, and what's next

### Done

| Ticket | Stage | State |
|---|---|---|
| VOI-16 | M0 native macOS scaffold | **Done** |
| VOI-17 | M1 SKATEBOARD — session list + typed dispatch | **Done** |

Plus the superseded Node track: VOI-5 … VOI-12, VOI-15 all Done (dispatch spike, plugin
skeleton, `/canvas` server, canvas store, chat page, provider layer, dispatch button,
trajectory summary, session context). Those proved the mechanisms that the Swift app now
implements natively.

**Stage 1 is genuinely working**, and beyond the original scope: dispatch, completion
detection via the Stop hook, turn-identity correlation, a spool protocol, bounded process
handling, and 73 passing tests — hardened across 16 rounds of Codex adversarial review.

### Next — in order

**M2 (VOI-18, High) is the next stage and the cheapest win.** The trajectory-extraction
logic already exists and is tested from the Node work (10.2 MB transcript → 2,203 chars,
correctly capturing decisions *with* reasoning). The Stop hook payload supplies
`transcript_path` directly, so no path construction is needed. **This is a port, not a
design.**

**Then M3 (VOI-19, High)** — push-to-talk. Every component is chosen and measured:
FluidAudio Swift runtime, Parakeet streaming ASR, PocketTTS at 162–231 ms TTFB. The key
press is the turn boundary, so endpointing is deliberately out of scope.

**Then M4 → M5 → M6** (VOI-20 → VOI-21 → VOI-22).

### Cross-cutting, do before or alongside

- **VOI-23 (High) — dispatched briefs carry no provenance.** A receiving session refused
  an unattributed brief as a possible injection probe. **This is largely solved already**:
  canvas-mac appends a trailer (`— sent by the user's Canvas app · dispatch <uuid>`) which
  both attributes the message and provides turn correlation. **The ticket is probably
  stale — verify and close it** rather than re-implementing.
- **VOI-24 (Medium) — timing constants are chosen, not measured.** `timeout` (10s) and
  `readerGrace` (6s) have no latency data behind them. Needs instrumentation, not design.

### Codex track — parked deliberately

- **VOI-13 (In Progress) — Codex live-dispatch spike.** The mechanism is proven
  (shared `codex app-server --listen ws://…`, injected word "cascade" recalled), but only
  between two headless scripts. **Never confirmed against a real visible `codex --remote`
  TUI** — that is exactly why it is not Done.
- **VOI-14 (Backlog) — Codex onboarding.** Any session started as plain `codex` is
  *permanently* non-dispatchable; there is no retroactive attach. Every Codex session must
  launch as `codex --remote ws://…`. This is a standing product constraint, not a
  migration.

### Not tracked in Linear but outstanding

- Three `let started = Date()` remain in `SessionDiscoveryTests.swift`, one at line 379
  *inside* the test written to prove monotonic behaviour. Upper-bound assertion, so it
  fails safe — cosmetic.
- The `feature-with-review` workflow has run **once**. Its until-clean loop and
  acceptance-criteria phase are implemented and unit-tested but have **never executed**.

### ⚠️ The Canvas Build Plan artifact is SUPERSEDED

`https://claude.ai/code/artifact/597f511d-7165-4b29-8e58-ba8b56477db6` describes the
**Node-era** plan: tldraw canvas, Pipecat Python sidecar, `add_to_canvas` tool, SSE to a
browser. That plan was replaced wholesale by the macOS pivot — no Node, no Pipecat, no
tldraw, no browser. **Do not build from it.** Its still-valid content is the latency
budget (VAD 200–500 ms is the largest tunable term; LLM TTFT usually dominates) and one
durable insight: *what makes voice feel conversational rather than walkie-talkie is
streaming LLM tokens into TTS sentence-by-sentence, so speech begins before the model has
finished — that single behaviour matters more than every transport decision combined.*

The live spec is the **macOS decision record**:
`https://claude.ai/code/artifact/d8e56c22-b603-4a31-9464-a263d20dccb3`

---

## 5. Where the code is

| Path | Remote | State |
|---|---|---|
| `~/canvas-mac` | `github.com/marmikcfc/geui` (private) | 21 commits, pushed, 73 tests green |
| `~/skills` | `github.com/marmikcfc/skills` | pushed; plugins, this doc, the workflow |
| `~/.claude/workflows/` | — | symlink into `skills/workflows/` |

`canvas-mac` layout: `CanvasCore` (library — `AgentSession`, `Dispatcher`,
`DispatchTracker`, `SessionDiscovery`, `StopEventWatcher`, `StopHookInstaller`,
`TranscriptScanner`) + `CanvasMac` (executable — `CanvasMacApp`, `AppModel`,
`Views/{ContentView, AcknowledgementsView}`). SwiftPM, zero third-party deps, Swift 6
strict concurrency with nothing suppressed.

The earlier Node implementation at `skills/voice-canvas/` is **superseded** but its
measurements remain valid — don't re-benchmark them.

---

## 6. Verified system facts

### 6.1 Claude Code cross-session messaging

- **Socket: `/tmp/cc-socks/<pid>.sock`.** NDJSON. `claude agents --json` gives
  `sessionId → pid`; it is read-only, there is no send-side CLI. **VERIFIED** — codewords
  ZEPHYR, MERIDIAN, OBSIDIAN, LANTERN, CANVAS-SKATEBOARD-PELICAN-7731 all landed as real
  turns from plain Node processes with no Claude session.
- **Auth is NOT required on macOS.** A message sent with deliberately no token arrived.
  `CLAUDE_CODE_MESSAGING_TOKEN` / `CLAUDE_CODE_MESSAGING_SOCKET` exist; the binary logs
  its own inject recipe on startup. **VERIFIED.** This is what made "no plugin" possible.
- **Inbound messages hit a real permission gate** — terminal showed "Allowed by auto mode
  classifier", not silent auto-accept. Peer messages carry an anti-escalation preamble.
- **Claude Code wraps injected text** as `"Another Claude session sent a message:\n…"`,
  so exact content equality can never identify your own dispatch.
- **Busy vs idle sessions record differently**: an idle session writes a standalone `user`
  turn; a **busy** session takes it mid-turn and writes no standalone record. A
  transcript-grep delivery check false-negatives on busy sessions. **VERIFIED.**
- **Sessions may legitimately refuse a brief** as a possible injection probe.
- `claude agents --json` returns **two entry shapes**: `pid`/`status` (interactive,
  dispatchable) and `id`/`state` (background, not). Interactive `name` is
  `<dirname>-<2 random chars>`. `aiTitle` in the transcript would be a better display name.
- **`claude agents --json` is a CLI spawn costing 1–3 s.** Dispatch should prefer a socket
  captured earlier; that fast path must stay the default or a stall lands mid-conversation.

### 6.2 Transcripts and hooks

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
  `last_assistant_message` means the event log holds conversation text, not just metadata.
- The Stop hook must **always `exit 0`** so a Canvas failure can never wedge a session.

### 6.3 `claude -p` (headless)

- **14.3s TTFT (haiku), 21.0s (sonnet).** Streaming doesn't rescue it — the first SSE
  event alone costs 7.5s, because every invocation boots the whole Claude Code
  environment. **Unusable for anything interactive.**
- **Environment contamination**: despite an explicit `--system-prompt`, it replied
  "Classification: Spike —", leaking the repo's own brainstorming skill.
- `--json-schema` works reliably. Fine for background extraction, where 14s is free
  under subscription.

### 6.4 Codex CLI

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
  but **every Codex session must be launched as `codex --remote ws://…` from the start.**

### 6.5 Toolchain gotchas (macOS)

- `date +%s%N` — no `%N` on macOS. Hit 3× across the session.
- `python3` under pyenv breaks (`pyenv: python3.10: command not found`); use `/usr/bin/python3`
  or `uuidgen | tr 'A-Z' 'a-z'`.
- Bash associative-array keys get arithmetic-evaluated: `value too great for base`.
- `git commit -m "$(cat <<'EOF' …)"` breaks on apostrophes — use `-F <file>`.
- **Never patch Swift with `node -e '…`template literals`…'`** — Swift `\(…)` and backticks
  collide with JS template syntax. Perl is worse: `perl -0pi -e` ate `$0` in
  `withUnsafeBytes { write(fd, $0.baseAddress, …) }`.
- **Backticks inside a JS template literal terminate it** → `SyntaxError: missing ) after
  argument list`.
- `node --check` on workflow scripts **always** false-positives (`Illegal return statement`) —
  top-level `return` is legal inside the runtime's async wrapper.
- A linter touches files in `canvas-mac` between Read and Edit — expect
  `File has been modified since read`; re-Read immediately before editing.
- Window inspection: `osascript` System Events is blocked (`-1728`), `python3 Quartz` is
  missing. What works: a compiled Swift helper using `CGWindowListCopyWindowInfo`, then
  `screencapture -x -l <window-id>` — **the app's own window only**.
- `swift build` emits a bare Mach-O, not an `.app`; `Info.plist` is embedded via linker
  flags. `open Canvas.app` doesn't persist — run the binary directly.
- `swift test` reporting `no tests found` despite a correct target = stale build state;
  `swift package clean` fixes it.
- Plugin cache holds **frozen copies** at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
  Symlink it to the repo. **Codex scans `~/.codex/skills` separately.**

### 6.6 Voice stack measurements (M1, 8GB — FluidAudio's "190×" is M4 Pro)

| | Result |
|---|---|
| ASR sherpa-onnx Parakeet 110M int8 (Python) | RTF 0.015, ~67× realtime, ~45ms for 3s |
| ASR same model via `sherpa-onnx-node` | RTF 0.044 (native prebuilts, no toolchain) |
| ASR streaming zipformer-en-2023-06-26 (296MB) | 0.0% WER, first partial 1120ms, RTF 0.066 |
| ASR streaming zipformer-en-20M | **78% WER — broken, not merely weaker** |
| TTS PocketTTS (Swift/CoreML-ANE) | TTFB **162–231ms** |
| TTS PocketTTS (Node/CPU-ONNX) | TTFB 619–947ms — **~4× penalty for staying in Node** |
| TTS Kokoro | TTFB ~2000ms, TTFB == synth time, no streaming |

- **The offline export cannot stream**: `OnlineRecognizer.from_nemo_ctc` on
  `parakeet-tdt-ctc-110m-en` hard-fails with `'window_size' does not exist in the metadata`.
- **Pipecat local STT is batch, not streaming** — **VERIFIED three ways**, including runtime
  instrumentation: `fed 372 chunks of 20ms -> run_stt calls DURING speech: 0`.
- **`@livekit/agents` console mode is not WebRTC** — `TcpSessionTransport`, `fakeJob: true`.
- Two Parakeets on disk, two incompatible formats: `~/.buzz/models/…` is sherpa-onnx ONNX
  (Python/Node); `~/Library/Application Support/FluidAudio/Models/…` is compiled CoreML
  (Swift only).

---

## 7. Decisions not to re-litigate

### 7.1 settings.json race — resolved by product decision, not code

Reported in **8 of 16 review rounds**; five successive designs, four rejected:

1. "compare-and-swap" — an overclaim; you cannot make read-compare-write atomic against
   writers who don't share your lock.
2. flock + `ftruncate`+`pwrite` through the locked fd — **worse**: a crash between the two
   leaves `settings.json` *empty* and Claude Code won't start.
3. temp + fsync + atomic rename + bounded merge-retry.
4. move all slow work before the final equality check.
5. **stop fixing, start measuring and offer an exit.**

Final state: ~1% loss under deliberate contention (2/175), always with a timestamped
backup; automatic mode is an **explicit user-confirmed opt-in**, and a fully working
manual path exists where Canvas never opens the file. **Do not reopen without a
configuration API.**

### 7.2 Correlation — evidence strengthened five times, never made cleverer

sessionID → + transcript offset → + brief text present → + `promptId` equality →
+ peer-origin filter → + a unique dispatch token in a structured trailer.

**It is not an authenticated binding, and the code says so.** The socket takes no auth;
any local process that could forge a trailer can already dispatch arbitrary prompts and
read every transcript. Token entropy is sized against **accidental** collision.

### 7.3 setsid() descendants cannot be contained on macOS

No cgroups, no PID namespaces. Liveness was moved **off the kill**: readers poll a
`dup()`'d fd against their own deadline. `Process.terminate()` is NSTask and **already
signals the group** — the defect was the single-pid `kill(pid, SIGKILL)` escalation.
`kill(-pid, …)` is only safe after proving `getpgid(pid) == pid`.

---

## 8. The workflow — `workflows/feature-with-review.js`

Acceptance criteria → design → adversarial design review (Codex + Fable) → implement →
Codex code review until clean. Tracked in Linear + Notion.

**First real run (VOI-24): 37 agents, 2.2M tokens, 100 minutes.** It worked — and the fix
it produced was *sharper than specified*, distinguishing "reader threads exited" from
"every byte was read" (`fullyDrained`).

Seven fixes applied after watching that run:

1. Review loops **until no medium/high**, 8-round backstop + stall detector; findings
   carried forward, never dropped.
2. **Same-file change sites merged into one agent** — VOI-24's 7 build agents → 2.
3. Skip the wave audit when sequential (~265k Opus tokens wasted otherwise).
4. Cumulative allowlist — `git status` is cumulative, the allowlist was per-wave.
5. Haiku for the audit.
6. Acceptance criteria derived from the **requirement, before any design exists**.
7. Plain `codex exec`, not `codex exec review <scope>` (§6.4).

**Parallelism is `sequential` by default.** `auto` uses model-proposes / code-verifies /
runtime-detects. **Detection is not prevention** — sequential is the only guarantee.

**`remaining: [...]` in workflow output is stale by construction** — the last round
dispatches fixes then hits the cap before re-reviewing.

Discovery is **user-level** (`~/.claude/workflows/`, symlinked to the git copy) so it works
from any cwd. Name-based resolution from user level is **untested** — invoke by
`scriptPath` to be safe.

---

## 9. Dead ends — do not retry

- `claude --resume <id> -p` for live dispatch — forks an invisible branch.
- `claude -p` for anything latency-sensitive — 14.3s TTFT floor + skill leakage.
- `claude setup-token` as a bearer for the raw Messages API — ToS gray area, works only
  because the system prompt impersonates Claude Code, and this ships to a public marketplace.
- PTY injection / Superset `terminals_send` — unnecessary; native messaging works on any session.
- `codex app-server daemon start` — needs the managed standalone install.
- Injecting into a thread owned by a bare `codex` — hard-blocked, no workaround.
- `posix_spawn` reimplementation of `Foundation.Process` — NSTask already gives group semantics.
- JSONL-append for Stop events — use a spool directory with atomic rename. **Watch the
  filename**: `mktemp ".incoming.XXXX"` + rename to `$TMP.event` produces a *hidden* file
  the watcher skips — every event silently dropped.
- Orphan-commit baselines for review snapshots — no merge-base. Make the empty commit the **root**.
- Fully parallel implementation agents in one working tree.
- tldraw (license), Kokoro for conversation (TTFB), zipformer-20M (78% WER), Buzz (reduces to
  sherpa-onnx), Pipecat as a Node runtime (doesn't exist), LiveKit for a local canvas (needs
  an SFU to talk to yourself).
- `open Canvas.app` for verification; grepping a busy session's transcript for delivery.

---

## 10. Standing user preferences

- **"we don't want to close the interactive Claude or Codex session that is on"** — stated
  three times; the project's gating constraint.
- **"I do not want to pay for WebRTC."** Non-negotiable.
- **"I am okay doing a native Swift app also if needed"** / **"Let's leave node. Let's first
  create the best experience on macos for our users."**
- Users bring their own API keys — LLM first, eventually TTS/ASR.
- Canvases must **outlive their sessions**, with a button to start a session.
- **Don't screenshot the desktop.** Per-window capture of the app's own window only, or ask.
- Gate debug instrumentation behind a flag rather than deleting it.
- **Don't make system-level installs or mint credentials unilaterally.**
- **Don't edit permissions to unblock a denied command**, and don't wrap a blocked command
  in a script to evade the classifier.
- Every step should carry a test.
- Verify at runtime rather than from docs.
- Commits are made but **not pushed** unless asked.
- Plan with the skateboard/MVP model.

---

*Assembled by distilling 26MB → 0.7MB (dropping tool-result bulk, keeping user turns,
assistant prose, tool calls, and error-bearing results only), splitting into six chunks,
and fanning one agent per chunk — the claude-rlm pattern, because no context window holds
the source. Product spec and skateboard plan recovered from the published artifacts;
ticket state read from Linear at time of writing.*
