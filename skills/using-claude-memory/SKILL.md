---
name: using-claude-memory
description: Use when the explainer-director agent reads Claude Code memory to personalize a video. Covers what to look for, what to ignore, and the privacy rule (never embed raw memory content in narration).
---

# Reading Claude memory respectfully

The Claude Code memory system lives at `~/.claude/projects/<project-slug>/memory/`. The structure:

- `MEMORY.md` — an index listing all memory files, one line each.
- Individual `.md` files for each memory, with frontmatter declaring type (`user`, `feedback`, `project`, `reference`).

## What to use

| Memory type | Useful for | Example signal |
|---|---|---|
| `user` | Audience, expertise, role | "user is a backend engineer with deep Go experience" → use compute/networking analogies |
| `feedback` | Tone preferences | "user wants terse responses, no trailing summaries" → keep narration tight |
| `reference` | External systems they know | "team tracks experiments in PostHog" → use PostHog as a reference if relevant to topic |
| `project` | Current focus areas | (Usually not directly useful for personalization — too time-bound) |

## What to ignore

- **In-progress task state.** Memories about ongoing work the user is doing don't shape narration personalization.
- **Specific files, branch names, commit IDs.** Not narration-shaping.
- **Memories from unrelated projects.** Only read the current project's memory dir; do NOT enumerate other project dirs.

## The privacy rule

**Never embed raw memory content in `storyboard.md`, `narration.txt`, or any user-facing output.**

Memories are notes Claude took for itself, not narration material. Specifically:

- DO use memories to decide *framing* ("user is a backend engineer → use server-room analogy") without quoting them.
- DO list memory file names in `audience-brief.md` under "Memory hints used" for traceability.
- DON'T copy memory text into narration.
- DON'T mention specific past projects, tools, or relationships from memory in narration.
- DON'T cite memory in the storyboard (e.g. don't write "User mentioned in memory_2024_03 that...")

If a user wants to verify what memory the director used, they can check `audience-brief.md`'s memory-hints list and read those files themselves.

## How to read memory

```bash
# List memories
ls ~/.claude/projects/<slug>/memory/

# Read the index
cat ~/.claude/projects/<slug>/memory/MEMORY.md

# Read specific entries
cat ~/.claude/projects/<slug>/memory/user_role.md
```

The director should:
1. Read `MEMORY.md` to see what's available.
2. Identify memories that look audience-relevant (user role, expertise, tone preferences).
3. Read those specific files.
4. Synthesize into `audience-brief.md` with no raw quotes.

## Sibling-plugin context

If the user has additional context plugins installed (e.g. `gbrain`, `honcho`), the director should detect them and invoke their slash commands for additional audience context. Detection method: run `claude --help` or read `~/.claude/plugins/installed.json` (subject to availability). This is best-effort — if detection fails, fall back to memory-only context.

The same privacy rule applies: synthesize, don't quote.

## If memory is missing

If `~/.claude/projects/<slug>/memory/` doesn't exist or is empty, the director proceeds with no memory context. The `audience-brief.md` should note "no memory context found" and rely entirely on the user's answers to the 1–2 audience questions.
