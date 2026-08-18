---
name: brain-drive
description: Use when you need to look something up in, or write something to, the shared brain — decisions, prior art, project state, entities, learnings.
---

# Using the drive

gbrain is the team's shared drive, reachable over MCP. Markdown is the system of
record; the database is a derived index; GitHub holds the history. A page written
here is visible to every agent and survives everything.

## Look before you work

Most questions have been answered once already.

1. `search` — semantic, over chunks. Start here. Roughly 5s warm.
2. `recall` / `context_pack` — when you want assembled context rather than hits
3. `get_page` — once you know the slug
4. `traverse_graph` / `get_backlinks` — to find what a page connects to

Slugs are path-qualified: `projects/foo`, `concepts/bar`, `companies/baz`. Bare
wikilinks in page bodies resolve by basename.

## Writing

`put_page` with a path-qualified slug. The write is durable — it lands in the
database, is written to markdown, committed, and pushed to GitHub.

File by what the page *is*:

| Directory | For |
|---|---|
| `projects/` | a thing being built, its state and decisions |
| `concepts/` | an idea that outlives any one project |
| `companies/` · `people/` | entities |
| `reference/` | how something works, looked up not read |
| `notes/` | everything else |

Two-layer format: compiled truth above the `---` rule (rewrite it freely as
understanding improves), append-only timeline below (never rewrite history).

## Skills

Skills live in the drive too — `list_skills`, `get_skill`,
`list_brain_skillpack`. If a task looks repetitive, check whether a skill already
covers it before improvising.

## What not to write

Not the diff (git has it). Not the transcript (the relay has it). Not what the
system of record owns — link to Linear or GitHub instead. Write the *reasoning*:
what was decided, why, and what you would do differently.
