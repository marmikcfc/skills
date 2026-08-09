---
name: launch-video-structure
description: Use when structuring a product launch or announcement video. Defines the 4-beat launch narrative (problem → why-now → reveal → call-to-action). This is a NARRATIVE STRUCTURE, independent of visual style. Different shape from an explainer — do not use the Vox 5-beat structure for launches.
---

# Launch video structure

A launch video is not an explainer. An explainer corrects a misconception ("you might think X, but actually Y"). A launch makes a confident announcement ("here's what we built and why you want it"). The shapes are different — using explainer pedagogy for a launch makes it sound hesitant and academic.

A launch has **4 beats**, not 5.

## The 4 beats

### 1. Problem (10–20 seconds)
Open on the pain the viewer already feels. Not "today we're launching X" — that's about you. Open with *their* problem so they lean in.

Good:
- "Every time you ship code, you wait. And wait. CI takes twenty minutes to tell you something a linter could've caught in two seconds."
- "Your team's knowledge lives in fifteen different tools. Finding anything means asking three people."

Avoid: starting with the product name, the company, or "we're excited to announce."

### 2. Why-now (10–20 seconds)
Why this problem is worth solving *now*, and why existing solutions fall short. This is where the viewer goes from "yeah, that's annoying" to "and nobody's fixed it." Builds the gap your product fills.

The shape: "People have tried X and Y. But they all [fundamental limitation]. What if instead..."

### 3. Reveal (30–60 seconds)
The product. Now you show it. This is the longest beat. Show it *doing the thing* — real UI, real output, the actual experience. Concrete over abstract. Features in service of the problem from beat 1, not a feature list.

- Show, don't describe. Screen recordings, real interface, actual results.
- Tie each capability back to the pain: "Remember those twenty minutes? Now it's two seconds."
- One hero capability done well beats five features rushed.

### 4. Call-to-action (5–15 seconds)
Tell them exactly what to do next. Specific and frictionless.

- "Start free at example.com — no credit card."
- "Install it in one command: `npm i thing`."
- End on the product name + the single next action. This is the one moment the product name belongs front and center.

## The ONE thing

For a launch, the ONE thing is the **value proposition**, not a lesson. One sentence: "What does the viewer get, and why is it better than what they have now?" Every beat serves that sentence.

## Pacing

- **Total: 45–90 seconds** for a launch. Shorter than an explainer. Launches live on landing pages and social — attention is scarce.
- Problem + why-now under 35 seconds. Get to the product fast.
- Reveal is the heart — give it room, but keep it concrete and moving.
- CTA is short and unambiguous.

## Engine choice for launches

Launches are almost always **all HyperFrames**:
- Real product UI, screenshots, screen recordings → HTML/HyperFrames.
- Logos, brand elements, typography → HyperFrames.
- Manim is rarely right for a launch unless the product itself is mathematical (e.g. launching a math tool).

## Visual style for launches

Default to **clean / on-brand**, NOT vox-style. A launch should look like the product's brand — its colors, its typeface, its logo treatment. Kinetic Vox-style typography can undercut a serious product reveal. Only use `vox-style` for a launch if the product's brand IS playful/editorial and the user explicitly wants that look.

## Common failure modes

| Failure | Looks like | Fix |
|---|---|---|
| "We-first opening" | Starts with the company/product name | Open with the viewer's problem |
| "Feature checklist" | Reveal is a list of 8 features | Pick one hero capability, tie it to the problem |
| "Vague reveal" | Describes the product abstractly, never shows it | Show real UI doing the real thing |
| "Soft CTA" | Ends with "learn more" or trails off | One specific frictionless action |
| "Explainer drift" | Uses "you might think... but actually" | That's explainer pedagogy; a launch asserts, it doesn't correct |
