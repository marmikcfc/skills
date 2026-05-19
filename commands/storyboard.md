---
description: Run only stages 1+2 of video-gen (context + storyboard). For iterating the script before any TTS spend.
argument-hint: <topic>
---

Run ONLY the context-gathering and storyboarding stages of the video-gen pipeline for: **$ARGUMENTS**

This command stops after Stage 2. No TTS, no animation, no render. Use it when you want to iterate on the script before committing to TTS spend.

# What happens

Invoke the `explainer-director` subagent. It will:
1. Read Claude memory and detect sibling context plugins.
2. Ask 1–2 audience questions.
3. Write `<cwd>/.video-gen/<slug>/audience-brief.md`.
4. Write `<cwd>/.video-gen/<slug>/storyboard.md` (human review) and `narration.txt` (TTS input).

# After it finishes

Tell the user:
> "Storyboard at `<workdir>/storyboard.md`. Edit it directly, then run `/narrate` when ready for TTS. Or re-run `/storyboard` to regenerate."
