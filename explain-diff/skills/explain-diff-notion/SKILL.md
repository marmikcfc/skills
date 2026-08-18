---
name: explain-diff-notion
description: Create a rich explanation of a code change, diff, branch, or pull request as a Notion page, with background, intuition, a conceptual code walkthrough, and a five-question quiz using toggle blocks for answers. Use when the user says "explain this PR in Notion", "write up this diff in Notion", or wants a shareable teammate-facing explainer of a software change rather than a local file.
---

# Explain Diff (Notion)

Produce a Notion page that teaches a reader how a specified code change works. Investigate the surrounding system before explaining the diff: the page should make sense to a beginner while still giving an experienced engineer a concise path to the changed behavior.

## Workflow

1. Identify the change and its scope — current checkout, diff, branch, PR metadata, or user-supplied files. If the target is ambiguous, infer the most likely change and state the assumption on the page.
2. Explore surrounding code, tests, configuration, callers, and data models. Trace old and new paths far enough to explain *behavior*, not file-by-file edits. Prefer checked-in examples and tests over speculation.
3. Build the narrative before writing: what motivated the change, how the old system behaved, the smallest useful mental model of the new behavior, how the implementation realizes it, and the edge cases and trade-offs.
4. Create the page with the Notion MCP tools and return its URL.

## Required page structure

- **Background** — Explain the existing system relevant to this change. Because you don't know how much the reader already knows, include a deep background for beginners (noting it can be skipped if they're already familiar), then a narrower background directly relevant to the change.
- **Intuition** — Explain the core intuition, not the full details. Use concrete examples with toy data. Use figures and diagrams liberally.
- **Code** — A high-level walkthrough of the changes, grouped and ordered so they build on each other rather than following arbitrary file order.
- **Quiz** — Five medium-difficulty questions. Hard enough that answering requires actually understanding the substance of the change, but not gotchas. Each question gets multiple-choice options, with a toggle block per option revealing why it is correct or incorrect:

  ```markdown
  1. Question
     ▶ Option 1
      ❌ Explanation for why it was incorrect
     ▶ Option 2
      ❌ Explanation for why it was incorrect
     ▶ Option 3
      ✅ Explanation for why it was correct
     ▶ Option 4
      ❌ Explanation for why it was incorrect
  ```

## Quiz quality rules

Treat quiz design as part of the explanation, not decoration. Inspect all five questions as a set before writing the page.

- Vary the correct option's position across questions, and balance positions as evenly as possible. A reader must not be able to pattern-match the answer from ordering.
- Keep options comparable in length, grammar, specificity, and confidence — the correct one must not be conspicuously longer or more precisely qualified.
- Make every distractor plausible and tied to a real misunderstanding of the change. No joke answers, no "all/none of the above," no trivia that can't be inferred from the page.
- Ask about behavior, causality, contracts, edge cases, or trade-offs — not phrases copied from the text.

## Style and diagrams

Write with the clarity and flow of Martin Kleppmann — engaging, in classic style, with smooth transitions between sections. Explain jargon on first use.

Pick a small number of diagram families and reuse them throughout rather than inventing a new visual per section. Always include example data in diagrams that describe data movement. Use callouts for key concepts, definitions, invariants, and important edge cases.

## Final handoff

Return the URL of the created page, and briefly state what was inspected plus any assumptions you made.

---

Adapted from [Geoffrey Litt's `explain-diff` gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524); quiz-quality rules backported from the [hardened HTML revision](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524?permalink_comment_id=6255388#gistcomment-6255388) by @yudhiesh-oc.
