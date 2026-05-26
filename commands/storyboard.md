---
description: Run only stages 1+2 of video-gen (brief + storyboard). For iterating the script before any TTS spend.
argument-hint: <description of the video you want>
---

Run ONLY the context-gathering and storyboarding stages of the video-gen pipeline for: **$ARGUMENTS**

This command stops after Stage 2. No TTS, no animation, no render. Use it when you want to iterate on the script before committing to TTS spend.

# What happens

Invoke the `video-director` subagent. It will:
1. Read Claude memory and detect sibling context plugins.
2. Gather source material if relevant (codebase, product page).
3. Pick a narrative structure (explainer, research, launch, story, demo, etc.) and visual style.
4. Ask 1–2 questions covering audience/purpose and style.
5. Write `<cwd>/.video-gen/<slug>/audience-brief.md`.
6. Write `<cwd>/.video-gen/<slug>/storyboard.md` (human review) and `narration.txt` (TTS input).

# After it finishes

Tell the user:
> "Storyboard at `<workdir>/storyboard.md`. Edit it directly, then run `/narrate` when ready for TTS. Or re-run `/storyboard` to regenerate."
