# voice-canvas

A canvas attached to the coding session you're already in.

Run `/canvas` inside Claude Code and a local server opens a web page bound to *that* session. You frame a problem there — chat now, voice later — and when it's ready you dispatch it into the same live session. Not a copy of it, not a resumed fork of it: the terminal you were already looking at picks up the turn and keeps going.

**In development.** Dispatch, session context, and outcome summaries work and are tested. Voice and the infinite canvas are not built yet.

## Why it exists

Coding agents are good at the work and bad at the part before it — the part where you don't yet know what you want. That framing conversation wants to be spoken and drawn, not typed into a terminal. But every tool that gives you a nice interface for it dispatches into a *new* session, so the agent that does the work isn't the one you were talking to.

This keeps them the same session.

## How dispatch works

Each live Claude Code session listens on a Unix socket at `/tmp/cc-socks/<pid>.sock` and accepts newline-delimited JSON:

```
{"type":"auth","token":"<CLAUDE_CODE_MESSAGING_TOKEN>"}
{"type":"user","message":{"role":"user","content":"…"}}
```

Writing there injects a real turn into the running TUI. The canvas server is a plain web server with no Claude session of its own, so it speaks this protocol directly rather than using the `SendMessage` tool.

`claude --resume <id> -p` does **not** work for this — it forks a disk-only branch the open terminal never sees. That was tested and disproven, not assumed.

Dispatch is a function, not a button that happens to sit next to a model. The chat model calls `dispatch_to_agent`; the UI button calls the same `dispatch()`. One implementation, two triggers, so they can't drift.

## The context layer

A working session's transcript reaches tens of megabytes. None of it goes to the chat model. Instead a model reads it in the background — headless `claude -p --json-schema`, billed to your existing subscription — and the chat sees only the digest.

| Direction | Extracted | Measured |
|---|---|---|
| Session → canvas | goal, state, decisions with reasoning, open questions | 10.2 MB → 2,203 chars |
| Canvas → you | what was done, what was verified *vs.* merely claimed, blockers | 28 KB trajectory → one summary |

The trajectory schema deliberately asks what was **not** verified, so the summary reports its own gaps instead of narrating success.

## Layout

```
commands/canvas.md          the /canvas entry point
scripts/open-canvas.mjs     resolve session → canvas, capture inbox credentials
scripts/canvas-server.mjs   HTTP + SSE server
lib/dispatch.mjs            socket protocol, session discovery
lib/tools.mjs               dispatch_to_agent, the model-callable function
lib/trajectory.mjs          what the agent did, since a marked offset
lib/session-digest.mjs      cached digest of the attached session
lib/extractor.mjs           subscription-backed structured extraction
lib/providers/              anthropic-messages · openai-responses · openai-chat
lib/canvas-store.mjs        SQLite: current state + append-only events
```

Zero npm dependencies — SQLite is `node:sqlite`, everything else is Node built-ins.

## Providers

Bring your own key. The chat model can be Anthropic (API key or `claude setup-token`), OpenAI, anything on OpenRouter, or a local Ollama — the OpenAI-chat adapter takes any `baseUrl`, so fully local is a config change rather than a rewrite. With no config file, the provider is inferred from whichever credential is in your environment.

Config lives at `~/.voice-canvas/config.json`.

## Not done yet

- Voice in/out (planned as an optional Pipecat sidecar, so the plugin stays dependency-free for everyone else)
- Infinite canvas with embedded HTML/video artifacts
- Codex dispatch — the mechanism is proven via a shared `codex app-server`, but this path currently errors rather than pretending to work
