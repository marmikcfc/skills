---
description: Open (or reuse) this machine's voice-canvas server and print its URL
---

Run this to ensure the voice-canvas local server is running, and report the URL to the user.

# Steps

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/open-canvas.mjs"
```

This starts (or reuses) the local server, finds or creates the canvas for
*this specific session*, and prints the canvas URL on stdout
(e.g. `http://127.0.0.1:54213/c/<canvas-id>`) with a one-line status note on
stderr (new vs. reused).

- If this session already has a canvas, you get back the exact same URL as before.
- If not, a new one is created.

Report the URL to the user plainly, e.g.:

> Canvas ready: http://127.0.0.1:54213/

Do not fetch or open the URL yourself — just report it. If the script errors or prints nothing, show the raw error output and say the server failed to start.
