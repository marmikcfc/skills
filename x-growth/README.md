# x-growth

Grow on X/Twitter through strategic replies — the highest-ROI move on the platform is a thoughtful early reply to a bigger account in your niche, which exposes you to their audience.

## Install

```bash
# In Claude Code
/plugin marketplace add marmikcfc/skills
/plugin install x-growth@skills
```

Then, once:

```
/x-growth-setup
```

## Dependency

[`twitter-cli`](https://github.com/public-clis/twitter-cli) — a terminal client for X that reads your browser cookies, so there are no API keys to manage. `/x-growth-setup` installs it (via `uv` or `pipx`) and verifies authentication.

## Surface

| Surface | What it is |
|---|---|
| `/x-growth-setup` | One-time install + auth check for `twitter-cli` |
| `x-reply-strategist` skill | The full pipeline below |

## Pipeline

1. **Profile** — understand your niche and voice
2. **Search** — find target accounts and high-engagement posts via `twitter-cli`
3. **Monitor** — set up ongoing tracking
4. **Brief** — synthesize into a prioritized digest
5. **Research** — read the full thread, map existing opinions, web-search for evidence
6. **Opine** — steelman + strawman, then form a position with supporting evidence
7. **Reply** — draft gated options

**Core rule:** no reply is drafted until you've seen the briefing and said "yes, reply to this one." Nothing is ever posted without your explicit go-ahead.

Pairs well with [`forming-opinions`](../thinking-models/skills/forming-opinions) from the `thinking-models` plugin — a reply is only worth posting if the opinion behind it survives a stress test.

## License

MIT
