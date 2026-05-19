# video-gen

A Claude Code plugin for generating Vox-style animated explainer videos using **Remotion** (React) and **Manim** (Python). Pick a topic, plan the narrative, produce the code, render the video.

## What it does

You give Claude a topic. The plugin:
1. Decides whether **Manim** or **Remotion** is the right tool for the topic
2. Plans a Vox-style 5-beat storyboard (hook → tension → metaphor → reveal → recap)
3. Generates runnable code that produces the video
4. Hands you the render command

The goal isn't a generic AI video. It's an **explainer that actually teaches**, structured the way the best explainer channels structure theirs.

## Install

```bash
# In Claude Code
/plugin marketplace add marmikcfc/video-gen
/plugin install video-gen@video-gen
```

## Usage

```
/explain why does ice float
/storyboard the friend paradox in social networks
/render
```

## What's inside

| Surface | What it is |
|---|---|
| `/explain <topic>` | End-to-end: storyboard → code → render command |
| `/storyboard <topic>` | Just the storyboard, no code |
| `/render` | Detect Manim/Remotion in cwd and print the render command |
| `explainer-director` agent | Vox-style narrative planning |
| `manim-engineer` agent | Generates Manim Community Edition code |
| `remotion-engineer` agent | Generates Remotion (React + TS) projects |
| `vox-explainer-structure` skill | The 5-beat pedagogy |
| `choosing-the-tool` skill | When to pick Manim vs Remotion |
| `manim-essentials` skill | Manim conventions and pitfalls |
| `remotion-essentials` skill | Remotion conventions and pitfalls |

## Requirements

- **For Manim videos:** Python 3.9+, `pip install manim`, and a working LaTeX install (`brew install --cask mactex-no-gui` on macOS).
- **For Remotion videos:** Node 18+, `npx remotion --help` should work.

The plugin generates code; you install the toolchains.

## License

MIT
