# explain-diff

Turn a diff, branch, or PR into something a person can actually learn from.

Most code-explanation output is a reworded diff: it tells you *what changed* line by line, which is the part you could already see. This does the opposite — it explores the surrounding system first, then explains the change as a story: what forced it, how the old thing behaved, the smallest mental model of the new thing, and how the implementation gets there.

Then it quizzes you, because reading an explanation and understanding it are different events.

## Skills

| Skill | Output |
|---|---|
| `explain-diff-html` | One self-contained HTML file, no CDN or network dependencies, saved outside the repo as `/tmp/YYYY-MM-DD-explanation-<slug>.html` |
| `explain-diff-notion` | A Notion page (via Notion MCP), quiz answers hidden behind toggle blocks |

Both produce the same four sections: **Background → Intuition → Code → Quiz**.

## Use it

```
explain this PR
explain this diff in Notion
walk me through what changed on this branch
```

Or invoke directly with `/explain-diff-html` / `/explain-diff-notion`.

## Why the quiz rules are so specific

A multiple-choice quiz generated without care leaks its own answers. The correct option ends up longest, or most carefully hedged, or always third. You can score full marks without understanding anything — which defeats the entire point of including a quiz.

So both skills carry explicit rules: randomize option order per question, balance correct-answer positions across the set, keep options comparable in length and confidence, and tie every distractor to a real misunderstanding of the change rather than an obviously wrong claim. The HTML variant additionally forbids leaking the answer through styling, `title` attributes, DOM ordering, or accessibility labels.

## Credit

Adapted from [Geoffrey Litt's `explain-diff` gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524). The HTML variant uses the hardened revision contributed by [@yudhiesh-oc](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524?permalink_comment_id=6255388#gistcomment-6255388), which added the investigation workflow, the quiz-quality rules, and the whitespace/escaping constraints. Those rules are backported into the Notion variant here.
