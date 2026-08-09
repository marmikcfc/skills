---
name: x-reply-strategist
description: Use when the user wants to grow on X/Twitter via strategic replies — covers niche profiling, finding target accounts and posts via twitter-cli, building a prioritized briefing, deep research to form well-evidenced opinions via steelman+strawman+web search, and drafting gated replies only after explicit user approval. Requires twitter-cli; run /x-growth-setup first if not installed.
---

# X Reply Strategist

## Overview

Strategic reply engagement is one of the highest-ROI growth tactics on X: replying early and thoughtfully to bigger accounts in your niche exposes you to their audience.

**Dependency:** This skill uses [`twitter-cli`](https://github.com/public-clis/twitter-cli) — a terminal client for X that reads your browser cookies (no API keys). Run `/x-growth-setup` first if you haven't.

**Pipeline:**

1. **Profile** — understand niche and voice
2. **Search** — find target accounts and high-engagement posts via `twitter-cli`
3. **Monitor** — set up ongoing tracking
4. **Brief** — synthesize results into a prioritized digest
5. **Research** — deep-dive the selected post: read full thread, map existing opinions, web-search for evidence
6. **Opine** — steelman + strawman + form your position with supporting evidence
7. **Reply** — draft gated options — **only after explicit user go-ahead**

**Core rule:** Never draft a reply until the user has seen the briefing and said "yes, reply to this one."

---

## CLI Quick Reference

All commands use `twitter-cli`. Learn this navigation pattern first — it's the core UX loop:

```
search → numbered list → show N → read thread → reply N
```

### Navigation pattern

```bash
# Step 1: Search returns a numbered list
twitter search "AI tools for creators" --exclude retweets --filter

# Output: numbered list of tweets
# 1. @swyx · 2h · ❤️ 342 | 🔁 87
#    "Hot take: RAG is a band-aid..."
# 2. @karpathy · 45m · ❤️ 1.2k | 🔁 304
#    "The thing nobody tells you about..."

# Step 2: Drill into any result by list position
twitter show 1                    # view tweet #1 full text + replies
twitter show 1 --full-text        # disable truncation (always use for reading)
twitter show 1 --json             # structured output

# Step 3: Reply using the same list position
twitter reply 1 "your reply text"
# OR if you have the tweet ID:
twitter reply <tweet_id> "your reply text"
```

`show <N>` uses the numbered position from the **most recent** list command (feed, search, user-posts, list). The number resets each time you run a new list command.

### Full command reference

| Goal | Command |
|---|---|
| Home timeline | `twitter feed --max 20` |
| Search niche | `twitter search "<query>" --exclude retweets --filter --max 20` |
| Filter by author | `twitter search "<query>" --from <handle>` |
| Only since date | `twitter search "<query>" --since 2026-06-14` |
| User's recent posts | `twitter user-posts <handle> --max 20 --full-text` |
| User profile + follower count | `twitter user <handle>` |
| Open tweet #N from last list | `twitter show <N> --full-text` |
| Full thread + replies | `twitter show <N>` or `twitter tweet <tweet_id>` |
| Save results to file | `twitter search "<query>" -o results.yaml` |
| Post a tweet | `twitter post "text"` |
| Reply to tweet | `twitter reply <N or tweet_id> "text"` |
| Like a tweet | `twitter like <N or tweet_id>` |
| Follow user | `twitter follow <handle>` |
| Bookmarks | `twitter bookmarks --max 20` |

### Key flags

| Flag | Effect |
|---|---|
| `--filter` | Sort by engagement score (likes × weight + RTs × weight + …) — surfaces best reply targets |
| `--full-text` | Show complete tweet text without truncation. Always use when reading content |
| `--exclude retweets` | Skip RTs |
| `--lang en` | English only |
| `--since YYYY-MM-DD` | Only tweets after this date |
| `--from <handle>` | Only tweets by this account |
| `--max N` | Result count (use 10–30 for searches, 5–10 for account checks) |
| `--json` | JSON output (for scripting/parsing) |
| `--yaml` | YAML output (preferred for structured reads — non-TTY defaults to YAML automatically) |
| `-o <file>` | Save output to file (`results.yaml`) |
| `-v` | Verbose/diagnostic — use when debugging auth or rate limit errors |
| `-c` | Compact output |

### Output structure (YAML/JSON)

Search and feed results return tweet objects with these key fields:

```yaml
id: "1234567890"           # tweet ID — use for reply/like/show
text: "full tweet text"
author:
  username: handle
  followers_count: 12400
created_at: "2026-06-14T10:32:00Z"
public_metrics:
  like_count: 342
  retweet_count: 87
  reply_count: 23
  bookmark_count: 15
  impression_count: 28400
```

---

## Phase 1: Niche Profiling

Before any search, confirm:

```markdown
## User Profile

Niche: [e.g., "AI tools for creators", "DTC e-commerce", "B2B SaaS growth"]
Specific angle: [e.g., "LLM fine-tuning for non-engineers"]
Goals: [impressions / followers in niche / networking with specific people]
Target account size: [e.g., 5k–100k followers]
Top 5–10 target accounts: [handles to monitor daily]
```

**Voice:** Load `marmik-voice` skill for Marmik's writing style. For other users, ask for 3–5 past tweets as style examples.

**Required sub-skill for voice:** `marmik-voice`

---

## Phase 2: Finding Posts and Accounts

### Verify CLI

```bash
twitter --version
```

If this fails → stop and run `/x-growth-setup`.

### 3-Tier Search Strategy

Run all three tiers, then move to Phase 4 (briefing).

**Tier 1 — Target Account Monitor**
```bash
# For each of the user's 5-10 top accounts:
twitter user-posts <handle> --max 10 --full-text
```

**Tier 2 — High-Engagement Niche Posts**
```bash
twitter search "<term1> OR <term2> OR <term3>" \
  --exclude retweets --filter --lang en --max 20 --full-text
```
Exclude noise: append `-giveaway -follow -crypto` to the query if relevant.

**Tier 3 — Opinion + Question Opportunities**
```bash
twitter search "<term1> OR <term2>" \
  --exclude retweets --filter --max 15 --full-text
# Then manually scan for posts that contain "hot take", "unpopular", "?", "change my mind"
# --filter will surface the highest-engagement ones first
```

**Save to file for processing:**
```bash
twitter search "<query>" --exclude retweets --filter -o ~/x-brief.yaml
```

### Finding New Accounts

```bash
# Search niche keywords, extract authors from high-engagement posts
twitter search "<niche keyword>" --exclude retweets --filter --max 50 --yaml

# Evaluate candidate accounts
twitter user <handle>
twitter user-posts <handle> --max 5 --full-text
```

Target: consistent posting cadence, replies that get engagement, 5k–100k followers.

---

## Phase 3: Monitoring Setup

**Option A — Manual (simplest)**
```bash
# Morning + evening:
twitter search "<niche terms>" --exclude retweets --filter \
  --since $(date +%Y-%m-%d) --max 20 --full-text
```

**Option B — Shell script**
```bash
#!/bin/bash
# ~/scripts/x-brief.sh

QUERY="<term1> OR <term2> OR <term3>"
ACCOUNTS=("handle1" "handle2" "handle3")
TODAY=$(date +%Y-%m-%d)
OUT=~/x-brief-$TODAY.yaml

echo "=== NICHE ===" >> $OUT
twitter search "$QUERY" --exclude retweets --filter --since $TODAY \
  --max 20 --full-text -o /dev/stdout >> $OUT

echo "=== ACCOUNTS ===" >> $OUT
for h in "${ACCOUNTS[@]}"; do
  echo "--- @$h ---" >> $OUT
  twitter user-posts "$h" --max 5 --full-text -o /dev/stdout >> $OUT
done

echo "Briefing saved to $OUT"
```

Cron: `0 8,18 * * * bash ~/scripts/x-brief.sh`

**Option C — Watch mode**
```bash
watch -n 900 "twitter search '<terms>' --exclude retweets --filter --max 10 --full-text"
```

---

## Phase 4: Briefing Synthesis

Format results into a numbered, prioritized digest. **Do NOT suggest a reply yet.**

```
## X Reply Briefing — [Date, Time]

### 🔥 ACT NOW (< 1 hr old, already gaining)
1. @username · 23 min ago · ❤️ 187 | 🔁 34
   > "[full tweet text]"
   Why: [one line — why this is a good reply opportunity]

### 📈 RISING (1–4 hrs, building momentum)
2. @username · 2h · ❤️ 412 | 🔁 91
   > "[tweet text]"
   Why: [...]

### 💡 OPINION TARGETS (hot takes, questions, debate starters)
3. @username · 3h · ❤️ 203 | 🔁 28
   > "[tweet text]"
   Why: [...]

### 👀 WATCH (older but relevant)
4. ...
```

End with:
> "Which do you want to reply to? Give me the number(s). Want deep research before forming an opinion? (yes/quick)"

- **"quick"** → straight to Phase 6 (steelman/strawman only, ~2 min)
- **"yes" / "deep"** → Phase 5 (full research, ~5–10 min)

---

## Phase 5: Deep Research (optional but recommended for opinion posts)

When the user selects a post and wants research before forming an opinion.

**Required sub-skill:** `deep-research`

### Step 1: Read the full thread

```bash
twitter show <N> --full-text
```

Note:
- The author's exact claim
- The tone (assertive, uncertain, provocative, genuine question)
- Thread length and whether it's part of a series

### Step 2: Map existing opinions in the replies

```bash
# Show tweet + its replies
twitter tweet <tweet_id>
```

Scan the top 10–15 replies and categorize:
```
Already being said (don't repeat):
- [summary of dominant reply angles]

Gaps / underrepresented angles:
- [what's NOT being said yet that would add value]

Most-liked replies (understand what's resonating):
- [top 2-3 reply themes by engagement]
```

### Step 3: Web research for evidence

Search for data, studies, precedents, or counterexamples that are relevant to the claim.

**Required sub-skill:** `deep-research`

Run targeted searches:
- The claim's core topic + "study" or "data"
- The claim + "counterexample" or "criticism"
- Recent news that supports or refutes it
- What credible experts or publications say about it

Example prompts to the deep-research skill:
- "Find data or studies on [claim topic]. What does the evidence actually say?"
- "What are the strongest criticisms of [position]? Find specific examples."
- "Are there recent developments (2025–2026) that change the conventional wisdom on [topic]?"

### Step 4: Synthesize research brief

Output a research brief before opinion formation:

```
## Research Brief: @username's post on [topic]

**The claim:** [exact claim in one sentence]

**What the thread already covers:**
- [dominant angles in replies — what NOT to repeat]
- [gaps where there's room to add value]

**What the evidence says:**
- Supporting: [data point / study / example that backs the claim]
- Complicating: [data point / counterexample / nuance that adds complexity]
- Against: [strongest evidence against the claim]

**Credible sources found:**
- [source 1: what it says, URL]
- [source 2: ...]

**Underexplored angle:** [the specific thing that's both true and not yet said in the thread]
```

Show the brief to the user. Ask: "Does this match what you wanted to know? Ready to form your take?"

---

## Phase 6: Opinion Formation

Runs after briefing selection (quick mode) or after research (deep mode).

**Required sub-skill:** `thinking-steel-manning`

```
## Opinion Formation: @username on [topic]

**The post claims:** [one sentence]

**Steelman** — strongest version of this take:
[Build the best possible case FOR the post's position. Incorporate any supporting
evidence from research. What would its most sophisticated advocate say, armed
with the best available data?]

**Strawman risk** — the lazy counter to avoid:
[Name the cheap, bad-faith objection. Identify it explicitly so the reply doesn't
accidentally become this. What's the version that sounds smart but collapses under
scrutiny?]

**Your angle** — the specific, evidence-backed contribution:
[Given the steelman, the gaps in the thread, and the research: what's the
genuinely interesting take? This should be something NOT already said in the replies,
grounded in at least one specific data point or example from research if available.
Options: a specific counterexample, a "yes, and..." that adds precision,
a nuance that reframes without dismissing, a question that opens new ground.]

**Evidence to cite in reply (if any):**
[Specific stat, study, or example from research that makes the reply credible
without being a wall of links]
```

Show the opinion formation. **Stop here.** Ask:
> "Does this match your take? Any corrections? Say 'go ahead' when ready."

---

## Phase 7: Reply Drafting (gated — only after explicit go-ahead)

Only after the user says "go ahead", "yes", "looks good", or equivalent.

Load voice: **Marmik** → `marmik-voice` skill. Others → Phase 1 examples.

Read the post one more time:
```bash
twitter show <N> --full-text
```

Generate 3 ranked options:

```
## Reply Options for @username

Option 1 — [Strategy: e.g., Evidence-backed counterpoint] · 8.7/10
> [2–4 lines. Natural punctuation. Voice-matched. Specific — references the
  research evidence if it adds weight without making it feel like a paper.
  No "Great post!", no AI tells.]
Why it works: [value added + engagement hook]
Post timing: [now / within X min / any time]

---

Option 2 — [Strategy] · 7.9/10
> [reply text]
Why: [...]

---

Option 3 — [Strategy] · 7.3/10
> [reply text]
Why: [...]
```

Once the user picks one:

```bash
twitter reply <N> "chosen reply text"
# or with tweet ID:
twitter reply <tweet_id> "chosen reply text"
```

After posting: suggest follow-up — continue the thread, DM if author replies, write a related original post.

---

## Reply Quality Rules

Every reply must:
- Feel 100% human — varied sentence length, natural punctuation, no robotic patterns
- Add specific value: a data point, a named counterexample, a precise reframe, a real question — not vague "insight"
- Be 2–4 lines max (unless the thread is long and context demands more)
- Match the user's voice exactly
- Reference research evidence when it makes the reply more credible — but lightly, not academically
- Contain zero AI tells: no "Certainly!", "This is nuanced", "Great question!", "As an AI...", "That said,"

---

## Daily Workflow

```
Morning (20 min):
  Run Tier 1 + Tier 2 searches → briefing
  Pick 5–8 targets
  For each: research mode (quick or deep) → opinion → go-ahead → draft → post
  Space posts 15–30 min apart

Evening (10 min):
  Run Tier 3 (opinion/question search)
  Pick 3–5 targets, repeat

Weekly:
  Review impressions on reply days vs. non-reply days
  Adjust target account list
  Refresh niche keywords
```

---

## Anti-Patterns

| Pattern | Why it fails | Fix |
|---|---|---|
| Generic praise | Looks like a bot | Lead with a specific insight or question |
| AI-voiced reply | Immediately recognizable, ignored | Load marmik-voice; cut all AI tells |
| Replying to mega-viral posts | Lost in 500+ replies | Target posts with 50–500 likes |
| Not reading the thread before replying | Duplicates what's already said | Always run `twitter show <N>` first |
| Opinion without research | Vague, no credibility, no novelty | At minimum run quick mode; deep for big opinion posts |
| All replies posted simultaneously | Signals automation | Space 15–30 min apart |
| Skipping opinion formation | Replies feel hollow | Always steelman/strawman before drafting |
| Using `twitter tweet <id>` without reading show first | You may be looking at wrong tweet | Use `show <N>` from the briefing list; `tweet <id>` only if you have a confirmed ID |
