# understanding

Explain a codebase or a technical idea at whatever depth is asked for.

Four skills, each answering a different question:

| Skill | Answers |
|---|---|
| `eli5` | "I have no context — what is this?" |
| `five-levels` | "Give me this at level 2." (child → teenager → undergrad → grad → expert) |
| `explaining-technical-concepts` | "Explain this to engineers, properly." |
| `codebase-orientation` | "I just opened this repo. Where do I start?" |

## Why this plugin exists

`explaining-technical-concepts` used to live inside `video-gen`, where it only
loaded for people who had installed a video pipeline. Its own description
covers PR descriptions, RFCs, design docs and codebase walkthroughs — none of
which are video. Extracting it, and building out the depths around it, makes
the whole set reachable on its own.

## The depth dial

The four compose as a ladder rather than a menu:

```
eli5                          level 1–2, no assumed context
five-levels                   pick your rung, 1 through 5
explaining-technical-concepts level 3–4, engineering audience
codebase-orientation          the map the upper levels describe
```

`explain-diff` (separate plugin) is the same idea aimed at a *change* rather
than at a codebase.

## Install

```
/plugin install understanding@skills
```
