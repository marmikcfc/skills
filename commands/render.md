---
description: Print the exact command to render the current Manim or Remotion project
---

Detect whether the current directory is a Manim or Remotion project:
- Manim: look for `.py` files with `from manim import` and/or a `manim.cfg`
- Remotion: look for `package.json` with a `remotion` dependency and a `src/Root.tsx` or similar entry

Then print the exact render command, including:
- For Manim: quality flag (`-pql` low, `-pqm` medium, `-pqh` high), the scene file, and the scene class name
- For Remotion: `npx remotion render <entry> <composition-id> <output.mp4>` with sensible defaults

If both or neither are detected, ask the user to clarify which project to render. Do NOT execute the render — only print the command and let the user run it.
