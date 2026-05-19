---
name: manim-essentials
description: Use when writing Manim Community Edition code for an explainer video. Covers the conventions, idioms, and pitfalls that separate amateur from professional Manim animations.
---

# Manim Community Edition essentials

This skill captures the patterns that distinguish good Manim code from beginner code. It targets **Manim Community Edition** (`pip install manim`), not the original `manimgl`.

## The minimal scene

```python
from manim import *

class Explainer(Scene):
    def construct(self):
        title = Text("The ONE thing", font_size=48)
        self.play(Write(title), run_time=1.5)
        self.wait(2)
        self.play(FadeOut(title))
```

Render: `manim -pql scene.py Explainer`

## Composition pattern: one Scene per beat

For a 5-beat Vox-style video, write five Scene subclasses and a composite. This lets you iterate on a single beat without re-rendering everything.

```python
class Hook(Scene):
    def construct(self): ...

class Tension(Scene):
    def construct(self): ...

# ... etc.

class Explainer(Scene):
    def construct(self):
        Hook.construct(self)
        Tension.construct(self)
        Metaphor.construct(self)
        Reveal.construct(self)
        Recap.construct(self)
```

To render a single beat: `manim -pql scene.py Tension`. To render the full video: `manim -pqh scene.py Explainer`.

## Animation primitives you'll use 90% of the time

| Animation | Use for |
|---|---|
| `Write(mobject)` | Text and math appearing as if written |
| `Create(mobject)` | Geometric shapes drawing themselves |
| `FadeIn(mobject)` / `FadeOut(mobject)` | Smooth entry/exit |
| `Transform(a, b)` | Morph `a` into `b` (mutates `a`) |
| `ReplacementTransform(a, b)` | Same, but `b` replaces `a` cleanly |
| `Indicate(mobject)` | Quick pulse to draw attention |
| `Wiggle(mobject)` | Playful jiggle |
| `Circumscribe(mobject)` | Draws a temporary box around it |

**Don't use:** `ShowCreation` (deprecated alias for `Create`).

## Always set run_time

```python
self.play(Write(equation), run_time=2)         # slow, lets viewer read
self.play(FadeOut(equation), run_time=0.4)     # quick exit
```

Manim defaults to 1 second. That's almost never right. Pacing is the entire game — set `run_time` deliberately on every `play()`.

## Positioning: relative, not absolute

```python
title = Text("Title").to_edge(UP)
subtitle = Text("Subtitle").next_to(title, DOWN, buff=0.3)
example = MathTex(r"e^{i\pi} + 1 = 0").move_to(ORIGIN)
```

Use `LEFT, RIGHT, UP, DOWN, ORIGIN` constants. Avoid raw coordinates like `np.array([2.3, -1.1, 0])` unless you have a specific reason.

## Math and text

```python
# Math — use raw strings, LaTeX syntax
equation = MathTex(r"\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}")

# Text — for non-math content
caption = Text("This is the famous Gaussian integral.", font_size=32)

# Highlighting a substring in math
eq = MathTex(r"a^2", "+", "b^2", "=", "c^2")
self.play(eq[0].animate.set_color(BLUE))  # color just a^2
```

`MathTex` arguments are separate tex strings that become indexable parts — useful for highlighting.

## Transforming equations

Manim's superpower:

```python
before = MathTex(r"y = mx + b")
after  = MathTex(r"y - b = mx")
self.play(TransformMatchingTex(before, after), run_time=1.5)
```

`TransformMatchingTex` matches identical substrings and moves them, fading in/out only the parts that changed. This is *the* idiom for derivations.

## Coordinate systems and graphs

```python
axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 5, 1], axis_config={"include_numbers": True})
graph = axes.plot(lambda x: x**2, color=BLUE)
label = axes.get_graph_label(graph, label="x^2")
self.play(Create(axes), Create(graph), Write(label))
```

## Color palette discipline

Pick 2–3 colors per video and stick with them. Manim's named colors:

```
WHITE, BLACK, GREY (and GREY_A..E)
BLUE, RED, GREEN, YELLOW, PURPLE, PINK, ORANGE, TEAL
+ shade variants: BLUE_A (lightest) ... BLUE_E (darkest), default is BLUE_C
```

Vox-style restraint: one primary color for the subject, one accent for emphasis, white/grey for everything else.

## Camera and zoom

Most explainer beats don't need camera moves. When you do:

```python
self.play(self.camera.frame.animate.scale(0.5).move_to(point))
```

Note: this requires `MovingCameraScene`, not the default `Scene`.

## Common pitfalls

- **LaTeX not installed.** Manim needs a working LaTeX install for `MathTex`. Document this in the project README.
- **Forgetting `self.wait()`.** A scene that ends without `wait` cuts immediately. Always end on `self.wait(1)` or longer.
- **Mobjects that "jump" between scenes.** If beat 1 ends with `equation` and beat 2 starts with a *new* `equation` mobject in the same place, viewers see a snap. Use `Transform` across the seam or `FadeOut` then `FadeIn` deliberately.
- **Imperative timing for parallel motion.** Use `AnimationGroup` or pass multiple animations to one `self.play()` call to run them in parallel.

## Render quality flags

| Flag | Quality | Use case |
|---|---|---|
| `-pql` | Low (480p15) | Iteration |
| `-pqm` | Medium (720p30) | Review |
| `-pqh` | High (1080p60) | Final render |
| `-pqk` | 4K | Only when you need it; long render times |

The `p` means "preview" — opens the file when done. The `q*` is the quality.
