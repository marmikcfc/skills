---
name: remotion-essentials
description: Use when writing Remotion (React + TypeScript) code for an explainer video. Covers compositions, timing primitives, scene composition with Series, and the patterns that produce clean Vox-style animation.
---

# Remotion essentials

Remotion turns React components into MP4 files. Every frame of the video is a render of your component tree at a given `frame` number. Animation = interpolating styles based on `useCurrentFrame()`.

## Project shape

```
package.json
remotion.config.ts
src/
  Root.tsx           # registers compositions
  Explainer.tsx      # the main composition (root component for the video)
  scenes/
    Hook.tsx
    Tension.tsx
    Metaphor.tsx
    Reveal.tsx
    Recap.tsx
  components/        # reusable visual primitives (Title, Caption, Highlight, etc.)
```

## Registering a composition

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { Explainer } from "./Explainer";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    durationInFrames={150 * 30}   // 150 seconds at 30fps
    fps={30}
    width={1920}
    height={1080}
  />
);
```

Preview: `npx remotion studio`. Render: `npx remotion render src/index.ts Explainer out/video.mp4`.

## The two timing primitives

Everything in Remotion comes down to two functions:

### `useCurrentFrame()`

```tsx
const frame = useCurrentFrame();  // 0, 1, 2, ... as the video plays
```

### `interpolate(input, inputRange, outputRange, opts?)`

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

Map a frame number to any animated value. **Always pass `clamp` extrapolation** unless you specifically want overshoot — without it you get values < 0 or > 1 at the edges, which causes flicker.

### Spring physics

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const { fps } = useVideoConfig();
const frame = useCurrentFrame();
const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
```

Springs feel more natural than linear `interpolate` for "thing appears" or "thing scales in" animations. Use linear interpolate for opacity fades and color shifts; springs for scale/position/rotation entrances.

## Composing scenes with `<Series>`

The cleanest way to lay out a 5-beat video:

```tsx
import { Series } from "remotion";

export const Explainer: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "white" }}>
    <Series>
      <Series.Sequence durationInFrames={240}><Hook /></Series.Sequence>
      <Series.Sequence durationInFrames={450}><Tension /></Series.Sequence>
      <Series.Sequence durationInFrames={1200}><Metaphor /></Series.Sequence>
      <Series.Sequence durationInFrames={900}><Reveal /></Series.Sequence>
      <Series.Sequence durationInFrames={210}><Recap /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

`<Series>` advances `useCurrentFrame()` to start at 0 inside each child. So each scene's `frame=0` is *its own* start, not the global timeline. This is the right mental model.

When you need scenes to overlap (e.g. a continuous background while titles change), use `<Sequence from={frame} durationInFrames={n}>` manually instead.

## Scene component pattern

```tsx
// src/scenes/Hook.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, 200, 240], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <h1 style={{ fontSize: 96, fontFamily: "Inter", color: "#0f172a" }}>
        Why does ice float?
      </h1>
    </AbsoluteFill>
  );
};
```

The opacity ramp `[0, 20, 200, 240] → [0, 1, 1, 0]` is the **trapezoid pattern**: fade in over frames 0–20, hold full opacity 20–200, fade out 200–240. This pattern shows up constantly. Use it liberally.

## Typography

- Use a web font via `@remotion/google-fonts`:
  ```tsx
  import { loadFont } from "@remotion/google-fonts/Inter";
  const { fontFamily } = loadFont();
  ```
- Sizes for 1080p: hero text 80–120px, body 40–56px, captions 28–36px. Going smaller usually means low retention.
- Line-height 1.1–1.2 for hero, 1.4–1.5 for body.

## Color discipline

Same rule as Manim: 2–3 colors per video. A typical Vox palette:

```ts
const palette = {
  bg: "#FFFFFF",
  ink: "#0F172A",     // primary text
  accent: "#2563EB",  // highlights, the "subject"
  muted: "#94A3B8",   // secondary text
};
```

## Static assets

Drop images in `public/`, reference with `staticFile`:

```tsx
import { staticFile, Img } from "remotion";
<Img src={staticFile("chart.png")} />
```

For async-loaded data, wrap in `delayRender()` / `continueRender()` so the renderer waits.

## Common pitfalls

- **Forgetting `clamp`.** Default extrapolation extends linearly past your input range. Use `clamp` 95% of the time.
- **Treating `useCurrentFrame()` like global time.** Inside a `<Series.Sequence>`, frame 0 is the *start of that sequence*. This is a feature, not a bug — but it surprises people.
- **CSS that depends on viewport.** Remotion renders at the composition's resolution. `vw`/`vh` won't behave like you expect. Use px or `%` relative to the composition.
- **Long videos in a single composition.** Past ~5 minutes, render times balloon. Consider splitting into multiple compositions and stitching with ffmpeg.

## Render command reference

```bash
# Preview in browser
npx remotion studio

# Render the default composition to out/video.mp4
npx remotion render

# Render a specific composition by id
npx remotion render src/index.ts Explainer out/video.mp4

# Higher quality (slower)
npx remotion render --crf=18

# Specific frame range (for previewing a single beat)
npx remotion render --frames=0-240
```
