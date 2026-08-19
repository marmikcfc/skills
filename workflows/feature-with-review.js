export const meta = {
  name: 'feature-with-review',
  description: 'Acceptance criteria → design → adversarial design review (Codex + Fable) → implement → Codex code review until clean, tracked in Linear and Notion',
  whenToUse: 'Implementing a non-trivial feature where you want acceptance criteria fixed before the design, the design challenged by independent models, and the result reviewed until no medium/high findings remain. args: {feature, repo, linearTeam, linearIssue?, notionPageId?, designRounds? (max 3), maxReviewRounds? (backstop, default 8), parallelism: sequential|auto, codexEffort (default high), codexModel?}',
  phases: [
    { title: 'Acceptance', detail: 'Derive pass/fail criteria from the REQUIREMENT, before any design exists', model: 'opus' },
    { title: 'Design', detail: 'Opus agent writes a design that must satisfy those criteria', model: 'opus' },
    { title: 'Design review', detail: 'Codex and Fable critique independently' },
    { title: 'Revise', detail: 'Fold blocking feedback into the design', model: 'opus' },
    { title: 'Record design', detail: 'Every round to Linear and Notion' },
    { title: 'Implement', detail: 'One Sonnet agent per FILE; sequential by default, verified-disjoint waves under parallelism:auto' },
    { title: 'Code review', detail: 'codex exec over the uncommitted diff, looping until no medium/high findings or the reviewer stalls' },
    { title: 'Record build', detail: 'Rounds and outcomes to Linear and Notion' },
  ],
}

// ---------------------------------------------------------------- inputs

const a = args || {}
const FEATURE = a.feature
const REPO = a.repo || '.'
const TEAM = a.linearTeam
const ISSUE = a.linearIssue || null
const NOTION = a.notionPageId || null
const DESIGN_ROUNDS = a.designRounds || 3
// The code-review loop runs UNTIL no medium/high findings remain. This is a
// backstop, not the intended exit — see the loop for why an unbounded "review
// until clean" cannot be trusted to terminate on its own.
const MAX_REVIEW_ROUNDS = a.maxReviewRounds || a.reviewRounds || 8
// Fixes dispatched per round. Findings beyond this are CARRIED FORWARD, never
// dropped: silently discarding findings makes "until clean" unreachable, since
// the reviewer just re-reports them every round and the loop never converges.
const MAX_FIXES_PER_ROUND = a.maxFixesPerRound || 10
// 'sequential' (default) | 'auto'. Agents share one working tree, so 'auto' only
// parallelises where a model AND a deterministic check both agree it is safe.
const PARALLELISM = a.parallelism || 'sequential'

if (!FEATURE) throw new Error('args.feature is required — describe what is being built')
if (!TEAM && !ISSUE) throw new Error('args.linearTeam or args.linearIssue is required — rounds are tracked there')

// Codex runs through `codex exec`, NOT the plugin companion.
//
// Two reasons, both about not losing information. `--output-schema` makes Codex
// itself emit schema-conforming JSON, so no Claude agent has to read its prose
// and retype it — a translation step that can soften or invent findings, and
// which I was previously mitigating with "do not soften" in a prompt rather
// than removing. Scope comes from the prompt telling Codex to diff the working
// tree, NOT from `exec review` — that subcommand refuses a scope flag and a
// prompt together, which the first VOI-24 run discovered at runtime. There is
// still no frozen-clone-plus-merge-base dance; getting that wrong is what
// silently scoped two reviews to NOTHING and returned vacuous approves.
//
// `approval_policy=never` is required: without it `codex exec` blocks forever
// waiting for an approval nobody can give. Verified — it hangs indefinitely,
// then returns clean JSON once set.
// Effort is HIGH for both the design review and the code review, and that is
// not the same decision as the courier agents' 'low'. The courier is a Claude
// agent that writes a file, runs a command, and copies JSON back — no reasoning
// to pay for. This dial is Codex's own thinking, which IS the review.
//
// Codex here runs gpt-5.6-terra, an Opus-class model, so high effort is worth
// buying: the review is the only independent check on work that Claude both
// designed and implemented, and a shallow review of your own work is close to
// no review. `-c` overrides ~/.codex/config.toml, which sits at "medium" —
// every round before this one silently ran at that default.
//
// The MODEL is deliberately not pinned. config.toml carries a model_migrations
// table (gpt-5.4 → gpt-5.6-terra), so inheriting means migrations apply on
// their own; pinning would freeze this workflow on a model that quietly goes
// stale. Pass args.codexModel only to override for one run.
const CODEX_MODEL_FLAG = a.codexModel ? ` -m ${a.codexModel}` : ''
const CODEX_FLAGS = `-c approval_policy=never -c sandbox_mode=read-only -c model_reasoning_effort=${a.codexEffort || 'high'}${CODEX_MODEL_FLAG}`

// Strict variants for --output-schema: structured outputs require
// additionalProperties:false and every property listed in required, so optional
// fields are expressed as "may be empty" rather than "may be absent".
const CODEX_FEEDBACK_JSON = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'blocking', 'nonBlocking'],
  properties: {
    verdict: { type: 'string', enum: ['approve', 'needs-changes'] },
    summary: { type: 'string' },
    blocking: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'why', 'where', 'recommendation'],
        properties: {
          claim: { type: 'string' },
          why: { type: 'string' },
          where: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    nonBlocking: { type: 'array', items: { type: 'string' } },
  },
}, null, 2)

const CODEX_REVIEW_JSON = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['approve', 'needs-attention'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'line', 'claim', 'failureScenario', 'recommendation'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          file: { type: 'string' },
          line: { type: 'number' },
          claim: { type: 'string' },
          failureScenario: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
  },
}, null, 2)

// ---------------------------------------------------------------- schemas

// Derived from the REQUIREMENT alone, before any design exists.
//
// When the same agent decides both the solution and how it will be judged, the
// criteria drift toward whatever was built. Fixing them first makes the design
// satisfy the ask rather than redefine it — the same reason a test has to be
// seen failing before it is trusted: the check must be independent of the thing
// it checks.
const ACCEPTANCE = {
  type: 'object',
  required: ['criteria', 'outOfScope'],
  properties: {
    criteria: {
      type: 'array',
      description: 'Observable pass/fail conditions. No implementation detail — these must stay true no matter how it is built.',
      items: {
        type: 'object',
        required: ['id', 'statement', 'observableBy', 'failsTodayBy'],
        properties: {
          id: { type: 'string', description: 'Short stable handle, e.g. AC1' },
          statement: { type: 'string', description: 'What must be true when this is done' },
          observableBy: { type: 'string', description: 'How you would check it — a test, a command, a measurement' },
          failsTodayBy: { type: 'string', description: 'Concretely how this fails at the CURRENT commit. If it already passes, it is not a criterion for this work — say so.' },
          alreadyPasses: { type: 'boolean', description: 'True if this already holds today, meaning it is a regression guard rather than new work' },
        },
      },
    },
    outOfScope: { type: 'array', items: { type: 'string' }, description: 'Things a reader might assume are included but are not' },
    ambiguities: { type: 'array', items: { type: 'string' }, description: 'Where the requirement admits more than one reading' },
  },
}

const DESIGN = {
  type: 'object',
  required: ['summary', 'changeSites', 'testPlan', 'risks'],
  properties: {
    summary: { type: 'string', description: 'What is being built and why, 3-6 sentences' },
    changeSites: {
      type: 'array',
      description: 'EXACT places code changes. One entry per file+symbol. No vague "update the model layer".',
      items: {
        type: 'object',
        required: ['file', 'symbol', 'change', 'rationale'],
        properties: {
          file: { type: 'string', description: 'Repo-relative path. Must already exist unless isNew is true.' },
          symbol: { type: 'string', description: 'Function/type/section being touched' },
          change: { type: 'string', description: 'What specifically changes there' },
          rationale: { type: 'string' },
          isNew: { type: 'boolean' },
          touchesFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'EVERY file this change will modify, not just the primary one. Include shared files: registries, enums with a new case, manifests, barrel/index files, snapshot fixtures. This list decides what can run in parallel, so an omission here is what causes two agents to overwrite each other.',
          },
        },
      },
    },
    testPlan: {
      type: 'array',
      description: 'Each test must name the bug it catches and how it would fail before the change.',
      items: {
        type: 'object',
        required: ['name', 'catches', 'failsBeforeChangeBy'],
        properties: {
          name: { type: 'string' },
          catches: { type: 'string' },
          failsBeforeChangeBy: { type: 'string', description: 'Concretely how this test fails at the parent commit' },
        },
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

const FEEDBACK = {
  type: 'object',
  required: ['verdict', 'blocking', 'nonBlocking'],
  properties: {
    verdict: { enum: ['approve', 'needs-changes'] },
    summary: { type: 'string' },
    blocking: {
      type: 'array',
      items: {
        type: 'object',
        required: ['claim', 'why', 'recommendation'],
        properties: {
          claim: { type: 'string' },
          why: { type: 'string', description: 'Concrete failure scenario, not a style preference' },
          where: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    nonBlocking: { type: 'array', items: { type: 'string' } },
  },
}

const IMPL = {
  type: 'object',
  required: ['ok', 'filesTouched', 'summary', 'testsVerifiedFailingFirst'],
  properties: {
    ok: { type: 'boolean' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    testsVerifiedFailingFirst: {
      type: 'boolean',
      description: 'True ONLY if each new test was observed failing before the change and passing after',
    },
    evidence: { type: 'string', description: 'Actual command output proving tests pass. Not a claim.' },
    deviations: { type: 'array', items: { type: 'string' }, description: 'Where the build departed from the design, and why' },
  },
}

const CODE_REVIEW = {
  type: 'object',
  required: ['verdict', 'findings'],
  properties: {
    verdict: { enum: ['approve', 'needs-attention'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'file', 'claim', 'failureScenario'],
        properties: {
          severity: { enum: ['high', 'medium', 'low'] },
          file: { type: 'string' },
          line: { type: 'number' },
          claim: { type: 'string' },
          failureScenario: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
  },
}

const PARTITION = {
  type: 'object',
  required: ['waves', 'sharedFiles'],
  properties: {
    waves: {
      type: 'array',
      description: 'Groups that may run CONCURRENTLY. Waves run in order; everything in a wave runs at once. Two sites belong in the same wave only if nothing they touch overlaps.',
      items: {
        type: 'object',
        required: ['unitIndexes', 'why'],
        properties: {
          unitIndexes: { type: 'array', items: { type: 'number' }, description: 'Indexes into the units array (one unit per file)' },
          why: { type: 'string', description: 'Why these are genuinely independent' },
        },
      },
    },
    sharedFiles: {
      type: 'array',
      items: { type: 'string' },
      description: 'Files more than one site touches. These force sequencing.',
    },
    hiddenCoupling: {
      type: 'array',
      items: { type: 'string' },
      description: 'Couplings NOT visible from file paths: generated code, a shared build manifest, a test that asserts over several of these at once, an ordering dependency. This is the field that earns the partition — file overlap alone can be computed without a model.',
    },
  },
}

const VIOLATION = {
  type: 'object',
  required: ['modifiedFiles'],
  properties: {
    modifiedFiles: { type: 'array', items: { type: 'string' }, description: 'Repo-relative paths from git status --porcelain, verbatim' },
  },
}

const SCRIBE = {
  type: 'object',
  required: ['linearOk', 'notionOk'],
  properties: {
    linearOk: { type: 'boolean' },
    notionOk: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' }, description: 'Why a write failed, verbatim' },
  },
}

// ---------------------------------------------------------------- helpers

// Tracking must never silently no-op. MCP servers with interactive auth can be
// absent in a headless run, so a scribe reports what it could NOT write and the
// payload is returned either way for the caller to backfill.
const ledger = []

async function record(phase, round, title, body) {
  ledger.push({ phase, round, title, body })
  const target = ISSUE
    ? `Comment on Linear issue ${ISSUE}`
    : `Create or update a Linear issue in team "${TEAM}" tracking this feature, then comment on it`
  const notionStep = NOTION
    ? `Then APPEND (never rewrite) a section to Notion page ${NOTION}.`
    : `No Notion page id was supplied — set notionOk false and say so in failures.`

  const result = await agent(
    `You are a scribe. Record this verbatim; do not summarise away specifics, numbers, or file paths.

${target}. Title the entry: "${title}".

Body to record:
---
${body}
---

${notionStep}

Load the Linear and Notion MCP tools via ToolSearch first. If a tool is unavailable or a
write fails, DO NOT retry more than once and DO NOT invent success — report it in failures
with the actual error. Reporting a failure honestly is the correct outcome; a false
success corrupts the record this workflow exists to produce.`,
    { label: `record:${phase}-r${round}`, phase: phase === 'design' ? 'Record design' : 'Record build', schema: SCRIBE, effort: 'low' }
  )
  if (result && (!result.linearOk || !result.notionOk)) {
    log(`⚠ tracking incomplete for ${phase} round ${round}: ${(result.failures || []).join('; ')}`)
  }
  return result
}

function renderDesign(d) {
  const sites = d.changeSites.map(s => `- \`${s.file}\` → ${s.symbol}${s.isNew ? ' (new)' : ''}: ${s.change}`).join('\n')
  const tests = d.testPlan.map(t => `- ${t.name} — catches: ${t.catches}; fails before by: ${t.failsBeforeChangeBy}`).join('\n')
  return `${d.summary}\n\n**Change sites**\n${sites}\n\n**Test plan**\n${tests}\n\n**Risks**\n${(d.risks || []).map(r => `- ${r}`).join('\n')}\n\n**Open questions**\n${(d.openQuestions || []).map(q => `- ${q}`).join('\n')}`
}

function renderFeedback(who, f) {
  const b = (f.blocking || []).map(x => `- **${x.claim}** (${x.where || 'n/a'}) — ${x.why}\n  → ${x.recommendation}`).join('\n')
  return `**${who}: ${f.verdict}**\n${f.summary || ''}\n\nBlocking:\n${b || '- none'}\n\nNon-blocking:\n${(f.nonBlocking || []).map(x => `- ${x}`).join('\n') || '- none'}`
}

// Every file a site is expected to touch, primary included.
function filesOf(site) {
  const set = new Set(site.touchesFiles || [])
  set.add(site.file)
  return set
}

function overlaps(a, b) {
  for (const f of a) if (b.has(f)) return true
  return false
}

// Sites on the SAME primary file become ONE unit, always.
//
// They can never run concurrently anyway, so splitting them buys no
// parallelism — and it costs badly. The VOI-24 run put six sites on
// SessionDiscovery.swift into six sequential agents: each re-read the whole
// file (54-85k tokens apiece, ~450k total) and layered edits on the previous
// agent's output, with no single agent ever holding the whole picture of that
// file's change. One agent doing all six is cheaper AND more coherent.
function unitsByFile(sites) {
  const byFile = new Map()
  for (const site of sites) {
    const existing = byFile.get(site.file)
    if (existing) {
      existing.sites.push(site)
      for (const f of filesOf(site)) existing.files.add(f)
    } else {
      byFile.set(site.file, { file: site.file, sites: [site], files: filesOf(site) })
    }
  }
  return [...byFile.values()]
}

// Same greedy grouping, now over units rather than raw sites.
function greedyWavesOfUnits(units) {
  const waves = []
  for (const unit of units) {
    let placed = false
    for (const wave of waves) {
      if (!overlaps(unit.files, wave.files)) {
        for (const f of unit.files) wave.files.add(f)
        wave.units.push(unit)
        placed = true
        break
      }
    }
    if (!placed) waves.push({ files: new Set(unit.files), units: [unit] })
  }
  return waves
}


// A model-proposed partition is a HYPOTHESIS, never an instruction. It can see
// coupling that file paths cannot — generated code, a manifest, a test that
// spans several sites — but it can also simply be wrong, and being wrong here
// silently destroys work. So: accept the model's grouping only where it is
// provably disjoint, and split any wave that is not.
function verifyPartition(proposed, units) {
  const accepted = []
  const rejected = []

  for (const wave of proposed.waves || []) {
    const members = (wave.unitIndexes || [])
      .filter(i => Number.isInteger(i) && i >= 0 && i < units.length)
      .map(i => units[i])
    if (!members.length) continue

    const seen = new Set()
    let conflict = null
    for (const m of members) {
      for (const f of m.files) {
        if (seen.has(f)) { conflict = f; break }
        seen.add(f)
      }
      if (conflict) break
    }

    if (conflict) {
      // Do not trust and do not discard: re-split this wave deterministically.
      rejected.push({ why: wave.why, conflict, count: members.length })
      for (const w of greedyWavesOfUnits(members)) accepted.push(w)
    } else {
      accepted.push({ files: seen, units: members })
    }
  }

  // Anything the model forgot to place still has to be built.
  const placed = new Set(accepted.flatMap(w => w.units.map(u => u.file)))
  const missing = units.filter(u => !placed.has(u.file))
  if (missing.length) for (const w of greedyWavesOfUnits(missing)) accepted.push(w)

  return { waves: accepted, rejected, missing: missing.length }
}

// ---------------------------------------------------------------- 1. design

phase('Acceptance')

// Deliberately BEFORE the design, and with no design to read.
//
// If the agent that chooses the solution also writes the criteria, the criteria
// bend toward the solution — you get tests for what was built rather than for
// what was asked. Fixing them first means the design has to satisfy the ask
// instead of quietly restating it.
const acceptance = await agent(
  `Derive the acceptance criteria for this requirement, in the repo at ${REPO}.

REQUIREMENT (this is the whole input — there is no design yet, and you are not writing one):
${FEATURE}

You decide how success will be judged. Later agents design and implement against these,
so a criterion that is vague or that describes an implementation rather than an outcome
gives them room to declare victory without earning it.

Rules:
- Each criterion must be OBSERVABLE — a test, a command, a measurement someone could run.
- State how each one FAILS TODAY, concretely, at the current commit. Read the code to
  check. If a criterion already passes, set alreadyPasses true and keep it as a regression
  guard — but be honest that it is not new work.
- Describe outcomes, not mechanisms. "Discovery does not report success when output is
  incomplete" is a criterion. "Add a drainGrace constant" is a design decision, and not
  yours to make here.
- Read the repo for test conventions and available seams so the criteria are checkable in
  THIS codebase — but do not let what is easy to build narrow what you require.
- Put every genuine reading of an ambiguous requirement in ambiguities rather than silently
  picking one.`,
  { label: 'acceptance', phase: 'Acceptance', model: 'opus', effort: 'high', schema: ACCEPTANCE }
)

if (!acceptance) throw new Error('acceptance agent returned nothing — cannot proceed without criteria')

const renderAcceptance = ac =>
  `${(ac.criteria || []).map(c => `- **${c.id}** ${c.statement}\n  observable by: ${c.observableBy}\n  fails today: ${c.failsTodayBy}${c.alreadyPasses ? ' (ALREADY PASSES — regression guard)' : ''}`).join('\n')}\n\n**Out of scope**\n${(ac.outOfScope || []).map(x => `- ${x}`).join('\n') || '- (none stated)'}\n\n**Ambiguities**\n${(ac.ambiguities || []).map(x => `- ${x}`).join('\n') || '- (none stated)'}`

const acceptanceText = renderAcceptance(acceptance)
log(`${(acceptance.criteria || []).length} acceptance criteria fixed before design` +
    ((acceptance.ambiguities || []).length ? `; ${acceptance.ambiguities.length} ambiguity(ies) flagged` : ''))
await record('design', 0, 'Acceptance criteria (from the requirement, pre-design)', acceptanceText)

phase('Design')

let design = await agent(
  `Design this change for the repo at ${REPO}.

FEATURE:
${FEATURE}

ACCEPTANCE CRITERIA — fixed before this design existed. They are the definition of done.
You may not weaken, reinterpret, or drop one to make the design easier; if you believe a
criterion is wrong or unachievable, say so in openQuestions and design for it anyway.

${acceptanceText}

READ THE ACTUAL CODE FIRST. Every change site you name must be a real file and a real
symbol you have opened and read. A design that names a plausible-sounding file which does
not exist is worse than no design — it sends implementers to the wrong place.

Requirements:
- Name EXACTLY where each change goes: file path and symbol. No "update the service layer".
- Your testPlan must cover EVERY criterion above. Reference the criterion id in the catches field.
- For each test, state concretely how it would FAIL at the current commit. A test that
  passes before the change proves nothing, and this is the most common defect in this
  codebase's history.
- In touchesFiles, list every file the change will modify, not just the primary one.
- State risks honestly, including anything you are unsure of.`,
  { label: 'design', phase: 'Design', model: 'opus', effort: 'high', schema: DESIGN }
)

if (!design) throw new Error('design agent returned nothing — cannot proceed')

await record('design', 0, 'Design v1', renderDesign(design))

// ------------------------------------------------- 2. design review rounds

let designApproved = false
let designRound = 0

while (designRound < DESIGN_ROUNDS && !designApproved) {
  designRound++
  phase('Design review')

  const rendered = renderDesign(design)

  // Two independent critics, deliberately different: Codex reads the repo through
  // its own harness; Fable is a different model family. Redundant reviewers agree
  // with each other; diverse ones find different things.
  const [codexFeedback, fableFeedback] = await parallel([
    () => agent(
      `Relay a Codex design review. You are a courier, not a reviewer — the judgement is
Codex's and must reach the caller unaltered.

1. Write this JSON Schema to /tmp/codex-design-r${designRound}.schema.json exactly as given:
${CODEX_FEEDBACK_JSON}

2. Write the review prompt to /tmp/codex-design-r${designRound}.prompt.txt:
---
Adversarially review this DESIGN, before any code is written. Challenge whether the
approach is right, not merely whether it is implementable.

The ACCEPTANCE CRITERIA below were fixed BEFORE this design and are the definition of done.
Check the design against them: a criterion with no change site or no test covering it is a
blocking gap, and a design that has quietly reinterpreted one to make itself easier is a
blocking gap too.

ACCEPTANCE CRITERIA:
${acceptanceText} Open every file the design
names and verify it exists and contains what the design claims — a design that names a
plausible file which does not exist is the failure mode to catch here. Flag any test whose
described failure-before-the-change is not credible. Only mark something blocking if you
can state a concrete failure scenario.

DESIGN:
${rendered}
---

3. From ${REPO}, run:
   codex exec ${CODEX_FLAGS} --output-schema /tmp/codex-design-r${designRound}.schema.json -o /tmp/codex-design-r${designRound}.out.json - < /tmp/codex-design-r${designRound}.prompt.txt

4. Read /tmp/codex-design-r${designRound}.out.json and return it VERBATIM as your structured
   output. Copy the fields across unchanged.

Do not add findings, remove findings, reword them, or substitute your own judgement — the
whole point of an independent critic is defeated if you edit it on the way through. If the
command fails or the output file is missing, return verdict needs-changes with one blocking
item whose claim is the actual error text.`,
      { label: `codex-design-r${designRound}`, phase: 'Design review', schema: FEEDBACK, effort: 'low' }
    ),
    () => agent(
      `Adversarially review this design for the repo at ${REPO}. You are a second, independent
critic — do not assume the design is sound.

ACCEPTANCE CRITERIA, fixed before the design and binding on it:
${acceptanceText}

DESIGN:
${rendered}

Open the files it names and verify they exist and contain what it claims. Focus on:
- any acceptance criterion with no change site or no test covering it
- any criterion the design has silently weakened or redefined
- change sites that are wrong, missing, or would not achieve the stated goal
- tests that would pass at the current commit (i.e. prove nothing)
- assumptions that fail under real-world conditions: concurrency, restarts, partial
  failure, hostile or merely unlucky input
- whether a materially simpler approach gets the same result

Only raise something as blocking if you can state a concrete failure scenario. Style
preferences are non-blocking.`,
      { label: `fable-design-r${designRound}`, phase: 'Design review', model: 'fable', effort: 'low', schema: FEEDBACK }
    ),
  ])

  const critics = [['Codex', codexFeedback], ['Fable', fableFeedback]].filter(x => x[1])
  if (!critics.length) {
    log(`round ${designRound}: both critics failed — stopping design loop, treating design as unreviewed`)
    break
  }

  const feedbackText = critics.map(c => renderFeedback(c[0], c[1])).join('\n\n')
  await record('design', designRound, `Design review round ${designRound}`, feedbackText)

  const blocking = critics.flatMap(c => c[1].blocking || [])
  if (!blocking.length) {
    designApproved = true
    log(`design approved by ${critics.map(c => c[0]).join(' and ')} at round ${designRound}`)
    break
  }

  log(`round ${designRound}: ${blocking.length} blocking item(s) — revising`)
  phase('Revise')

  const revised = await agent(
    `Revise this design against the review feedback, for the repo at ${REPO}.

CURRENT DESIGN:
${rendered}

FEEDBACK:
${feedbackText}

For each blocking item: either fix the design, or push back with a concrete reason it is
wrong. Do not silently ignore any of them, and do not cave to a point you believe is
mistaken — record the disagreement in openQuestions. Re-verify that every change site
still names a real file and symbol.`,
    { label: `revise-r${designRound}`, phase: 'Revise', model: 'opus', effort: 'high', schema: DESIGN }
  )

  if (revised) {
    design = revised
    await record('design', designRound, `Design v${designRound + 1} (revised)`, renderDesign(design))
  } else {
    log(`revision round ${designRound} returned nothing — keeping previous design`)
  }
}

if (!designApproved) {
  log(`design loop ended after ${designRound} round(s) WITHOUT approval — proceeding, but the design is contested`)
}

// ---------------------------------------------------------------- 3. build

phase('Implement')

const sites = design.changeSites

// One unit per FILE, always — see unitsByFile. Sites on the same file cannot run
// concurrently under any policy, so this costs no parallelism and saves an agent
// (and a full re-read of the file) per extra site.
const units = unitsByFile(sites)
if (units.length < sites.length) {
  log(`merged ${sites.length} change site(s) into ${units.length} per-file unit(s) — same-file sites go to ONE agent`)
}

// PARALLELISM = 'sequential' is the honest default for a repo with a shared
// build system: agents in one tree also share .build and the git index, so
// even perfectly disjoint source edits can interfere through the toolchain.
// 'auto' asks a model where concurrency is genuinely safe, then verifies it.
let waves
if (PARALLELISM === 'sequential' || units.length < 2) {
  waves = units.map(u => ({ files: u.files, units: [u] }))
  log(`sequential mode: ${units.length} unit(s), one at a time`)
} else {
  const proposed = await agent(
    `Partition these work units into waves that can safely run CONCURRENTLY in ONE shared
working tree at ${REPO}. Each unit is all the changes to ONE file, handled by one agent.

${units.map((u, i) => `[${i}] ${u.file} — ${u.sites.length} change(s): ${u.sites.map(s => s.symbol).join(', ')}\n     declares touching: ${[...u.files].join(', ')}`).join('\n')}

Overlapping file paths are the easy case and I can compute those without you. What I need
you for is coupling that paths do NOT reveal — open the code and look for:
- a shared manifest, registry, enum, or barrel/index file two sites will both edit
- generated or derived code where one site's change regenerates another's file
- a single test or snapshot that asserts across several of these sites at once
- an ordering dependency: site B is meaningless until site A lands

When unsure, put the units in SEPARATE waves. A wave that is too conservative costs time.
A wave that is wrong destroys an agent's work with no warning and no diff to recover from,
because two agents will have written the same file from different starting states.

Report every such coupling in hiddenCoupling even where you have already separated it —
that list is reviewed by a human.`,
    { label: 'partition', phase: 'Implement', model: 'opus', effort: 'high', schema: PARTITION }
  )

  if (!proposed) {
    waves = greedyWavesOfUnits(units)
    log(`partition agent returned nothing — falling back to deterministic grouping: ${waves.length} wave(s)`)
  } else {
    const checked = verifyPartition(proposed, units)
    waves = checked.waves
    for (const r of checked.rejected) {
      log(`⚠ rejected a proposed wave of ${r.count}: both members touch "${r.conflict}" — re-split deterministically`)
    }
    if (checked.missing) log(`⚠ partition omitted ${checked.missing} unit(s) — appended`)
    if ((proposed.hiddenCoupling || []).length) {
      log(`coupling the file paths did not show: ${proposed.hiddenCoupling.join(' | ')}`)
    }
    log(`partition verified: ${waves.length} wave(s) over ${units.length} unit(s)`)
  }
}

const built = []
const strayed = []
// Cumulative, NOT per-wave. `git status` reports the whole working tree, so
// checking it against one wave's allowlist flags every earlier wave's file as a
// stray — a false positive by construction, and the kind that trains you to
// ignore the warning.
const declaredSoFar = new Set()

for (let i = 0; i < waves.length; i++) {
  const batch = waves[i]
  const wavePeers = batch.units.length
  for (const u of batch.units) for (const f of u.files) declaredSoFar.add(f)

  const results = await parallel(batch.units.map(unit => () => agent(
    `Implement EVERY change to ONE file in the repo at ${REPO}, as part of an approved design.

FULL DESIGN (context — other files belong to other agents, do not touch them):
${renderDesign(design)}

YOUR FILE: ${unit.file}
You own all ${unit.sites.length} change(s) to it, and you are the only agent who will edit
it. Hold the whole file's change in your head and make it coherent — do not treat these as
separate patches:

${unit.sites.map((s, n) => `  ${n + 1}. ${s.symbol}: ${s.change}\n     why: ${s.rationale}`).join('\n')}

Non-negotiable: for any test you add, RUN IT AGAINST THE UNCHANGED CODE FIRST and confirm
it fails. A test that passes before your change tests nothing. If it passes before, your
fixture is wrong — fix the fixture, not the assertion. Set testsVerifiedFailingFirst true
only if you actually did this and observed it.

Put real command output in evidence. Do not claim tests pass without running them. If you
could not complete the change, set ok false and say why — a truthful failure is more
useful than a plausible-looking edit.

${wavePeers > 1 ? `CONCURRENCY — ${wavePeers - 1} other agent(s) are editing this same working tree RIGHT NOW.

You may write only: ${[...unit.files].join(', ')}

Files owned by a peer this wave, which you must NOT write under any circumstance:
${batch.units.filter(u => u !== unit).flatMap(u => [...u.files]).join(', ') || '(none)'}

If your change turns out to need a file you do not own — a shared enum, a manifest, a
registry — STOP. Set ok false and name that file. Do not edit it "quickly": a peer is
mid-edit and one of you will silently overwrite the other, with no conflict marker and no
diff to recover from.

Do not run \`git add\`, \`git stash\`, \`git checkout\`, or anything else that moves the whole
tree — it moves it under your peers too. Build and test only your own target if your
toolchain allows scoping; a full build may collide with a peer's.`
      : `You are the only agent editing this tree right now, so a full build and test run is safe.`}

List every file you actually wrote in filesTouched, including any you did not expect.`,
    { label: `build:${unit.file}`, phase: 'Implement', model: 'sonnet', effort: 'high', schema: IMPL }
  )))
  built.push(...results.filter(Boolean))

  // The audit exists to catch one agent clobbering a CONCURRENT peer. With a
  // single agent in the wave there is no peer and nothing to clobber, so running
  // it would be pure cost — the VOI-24 run spent ~265k tokens auditing seven
  // solo waves for a condition that could not occur.
  if (wavePeers > 1) {
    const actual = await agent(
      `In ${REPO}, run \`git status --porcelain\` and return every modified, added, or untracked
repo-relative path exactly as git reports it. Do not interpret, filter, or tidy the list.
Make no changes of any kind.`,
      // haiku: this runs one command and copies the output. Opus was costing
      // ~38k tokens a call to do it.
      { label: `audit-wave-${i + 1}`, phase: 'Implement', model: 'haiku', effort: 'low', schema: VIOLATION }
    )
    if (actual) {
      const outside = (actual.modifiedFiles || []).filter(
        f => !declaredSoFar.has(f) && !f.startsWith('.build') && !f.startsWith('node_modules')
      )
      if (outside.length) {
        strayed.push({ wave: i + 1, files: outside })
        log(`⚠ wave ${i + 1} touched ${outside.length} file(s) nobody declared: ${outside.join(', ')} — agents ran concurrently here, so review these by hand before trusting them`)
      }
    }
  }
  log(`wave ${i + 1}/${waves.length} complete (${wavePeers} agent(s)${wavePeers > 1 ? ' in parallel' : ''})`)
}

const failed = built.filter(b => !b.ok)
const unproven = built.filter(b => b.ok && !b.testsVerifiedFailingFirst)
if (failed.length) log(`⚠ ${failed.length} change site(s) failed to build`)
if (unproven.length) log(`⚠ ${unproven.length} site(s) shipped tests never observed failing first — treat as unverified`)

await record('build', 0, 'Implementation complete',
  built.map(b => `- ${b.ok ? '✅' : '❌'} ${b.filesTouched.join(', ')} — ${b.summary}${b.testsVerifiedFailingFirst ? '' : ' ⚠ tests NOT verified failing-first'}${(b.deviations || []).length ? `\n  deviations: ${b.deviations.join('; ')}` : ''}`).join('\n'))

// ---------------------------------------------------------- 4. code review

// Loop until no medium/high findings remain — that is the intended exit.
//
// Why the round cap and the stall detector both exist anyway: a reviewer can
// always find something, and each fix creates new surface for the next round to
// object to. This project is the evidence — sixteen manual rounds, where bounded
// readers came out of fixing the process-group leak, and the drain-window bug
// came out of fixing the truncation bug. "Review until clean" against an
// adversarial reviewer is not guaranteed to terminate, so it needs a way to
// notice it is going in circles rather than only a way to run out of rounds.
let reviewApproved = false
let reviewRound = 0
let stalls = 0
const reviewLog = []
// Findings the round could not dispatch. Carried forward, never dropped.
let carried = []
let previousSignatures = new Set()

const signatureOf = f => `${f.severity}|${f.file}|${(f.claim || '').slice(0, 120)}`

while (reviewRound < MAX_REVIEW_ROUNDS && !reviewApproved) {
  reviewRound++
  phase('Code review')

  const review = await agent(
    `Relay a Codex code review of the work in ${REPO}. You are a courier, not a reviewer.

1. Write this JSON Schema to /tmp/codex-review-r${reviewRound}.schema.json exactly as given:
${CODEX_REVIEW_JSON}

2. Write the focus text to /tmp/codex-review-r${reviewRound}.prompt.txt:
---
Review the UNCOMMITTED changes in this repository. Run \`git status --porcelain\` and
\`git diff\` FIRST to see exactly what changed, and review only that — not the repository
at large.

For each finding state a concrete failure scenario — specific inputs or state leading to a
wrong result — not a style preference. Pay particular attention to any test that would
still pass if the change were reverted, since such a test proves nothing.

Change sites this work was supposed to touch:
${design.changeSites.map(s => `- ${s.file} → ${s.symbol}: ${s.change}`).join('\n')}
---

3. From ${REPO}, run:
   codex exec ${CODEX_FLAGS} --output-schema /tmp/codex-review-r${reviewRound}.schema.json -o /tmp/codex-review-r${reviewRound}.out.json - < /tmp/codex-review-r${reviewRound}.prompt.txt

   NOTE: plain \`codex exec\`, NOT \`codex exec review\`. That subcommand takes EITHER a scope
   flag (--uncommitted / --base / --commit) OR a prompt, never both — it exits with
   "the argument '--uncommitted' cannot be used with [PROMPT]", including via stdin.
   The focus text is what keeps the review pointed at this work, so the prompt wins and
   carries the scope itself. Do NOT build a snapshot clone or compute a merge-base;
   that hand-rolled scoping is what silently reviewed NOTHING twice before.

4. BEFORE trusting the result, sanity-check the scope: run \`git status --porcelain\` and
   confirm there are actually changed files. A clean tree means the review saw nothing, and
   an "approve" from an empty diff is meaningless — in that case return needs-attention with
   a high finding saying the review scope was empty.

5. Read the output file and return it VERBATIM as your structured output.

Do not soften, reword, drop, or add findings.`,
    { label: `codex-review-r${reviewRound}`, phase: 'Code review', schema: CODE_REVIEW, effort: 'low' }
  )

  if (!review) {
    log(`review round ${reviewRound} returned nothing — stopping review loop`)
    break
  }

  reviewLog.push(review)
  const findingsText = (review.findings || [])
    .map(f => `- [${f.severity}] ${f.claim} (${f.file}${f.line ? ':' + f.line : ''})\n  ${f.failureScenario}\n  → ${f.recommendation || 'n/a'}`)
    .join('\n')
  await record('build', reviewRound, `Code review round ${reviewRound}: ${review.verdict}`,
    `${review.summary || ''}\n\n${findingsText || 'No findings.'}`)

  // Fresh findings plus anything an earlier round could not get to, deduped.
  const fresh = (review.findings || []).filter(f => f.severity === 'high' || f.severity === 'medium')
  const merged = []
  const seenSig = new Set()
  for (const f of [...carried, ...fresh]) {
    const sig = signatureOf(f)
    if (seenSig.has(sig)) continue
    seenSig.add(sig)
    merged.push(f)
  }

  // The real exit: nothing of medium or high severity is left. Low findings do
  // not block. Note this checks `merged`, not `fresh` — a carried finding is
  // still outstanding even if this round's reviewer did not repeat it.
  if (!merged.length) {
    reviewApproved = true
    log(`clean at review round ${reviewRound}: no medium or high findings outstanding` +
        (review.verdict === 'approve' ? '' : ' (verdict was needs-attention, but only low-severity items remain)'))
    break
  }

  // Going in circles? If this round surfaced nothing the previous round had not
  // already raised, the fixes are not landing — either the reviewer is repeating
  // itself or fix A is undoing fix B. Two such rounds and we stop, because more
  // rounds will not help and each one costs a full review.
  const currentSignatures = new Set(merged.map(signatureOf))
  const novel = [...currentSignatures].filter(s => !previousSignatures.has(s))
  if (reviewRound > 1 && novel.length === 0) {
    stalls++
    log(`⚠ review round ${reviewRound} raised nothing new (stall ${stalls}/2) — fixes are not reducing the finding set`)
    if (stalls >= 2) {
      log(`stopping: two consecutive rounds with no new findings and none resolved. ${merged.length} finding(s) remain unfixed.`)
      break
    }
  } else {
    stalls = 0
  }
  previousSignatures = currentSignatures

  const dispatch = merged.slice(0, MAX_FIXES_PER_ROUND)
  carried = merged.slice(MAX_FIXES_PER_ROUND)
  log(`review round ${reviewRound}: ${merged.length} actionable — fixing ${dispatch.length}` +
      (carried.length ? `, carrying ${carried.length} to the next round` : ''))
  const fixes = await parallel(dispatch.map(f => () => agent(
    `Fix one review finding in ${REPO}.

  [${f.severity}] ${f.claim}
  where: ${f.file}${f.line ? ':' + f.line : ''}
  failure scenario: ${f.failureScenario}
  recommendation: ${f.recommendation || 'none given'}

First decide whether the finding is actually correct. Reviewers are wrong sometimes — if
this one is, set ok false and explain precisely why, with evidence from the code, rather
than making a change you believe is wrong.

If it is correct, fix it and add a regression test. VERIFY THE TEST FAILS BEFORE YOUR FIX.
Put the real command output in evidence.`,
    { label: `fix:${f.file}`, phase: 'Code review', model: 'sonnet', effort: 'high', schema: IMPL }
  )))
  built.push(...fixes.filter(Boolean))
}

if (!reviewApproved) {
  log(`⚠ review loop ended after ${reviewRound} round(s) with medium/high findings still outstanding` +
      (reviewRound >= MAX_REVIEW_ROUNDS ? ` — hit the ${MAX_REVIEW_ROUNDS}-round backstop` : ''))
}

// ---------------------------------------------------------------- 5. report

return {
  feature: FEATURE,
  design: {
    approved: designApproved,
    rounds: designRound,
    changeSites: design.changeSites.length,
    openQuestions: design.openQuestions || [],
    risks: design.risks || [],
  },
  implementation: {
    sites: built.length,
    failed: failed.map(b => ({ files: b.filesTouched, summary: b.summary })),
    unverifiedTests: unproven.map(b => b.filesTouched).flat(),
    deviations: built.flatMap(b => b.deviations || []),
    parallelism: PARALLELISM,
    // Non-empty means an agent wrote outside its declared set. If that wave ran
    // concurrently, these files may hold one agent's work overwritten by another.
    undeclaredWrites: strayed,
  },
  review: {
    approved: reviewApproved,
    rounds: reviewRound,
    remaining: reviewApproved ? [] : (reviewLog[reviewLog.length - 1]?.findings || []),
  },
  // Returned regardless of whether the scribes succeeded, so the caller can
  // backfill anything the MCP writes dropped.
  ledger,
}
