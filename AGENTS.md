# AGENTS.md — ai-leak-checker

> Conventions for ANY coding agent working in this repo (Claude Code, OpenCode,
> Cursor, Hermes, …). Claude-specific detail lives in `CLAUDE.md`; OpenCode
> detail in `OPENCODE-DEV.md`. Both point back here.

## Start here (every session)

1. `docs/tasks/index.md` → **Next up** → open the task file.
2. `docs/tasks/PLAYBOOK.md` once: branch rules, TDD loop, validation gate,
   hard invariants, house patterns.
3. `STACK.md` (locked stack) and `ERRORS.md` (what already failed).

The hard invariants in `CLAUDE.md` (no prompt content stored or sent, zero
network calls, no permission widening, no `eval`/`innerHTML` with user data,
typed sender-gated messages) apply to every change. Green tests do not excuse
a violation.

## Task hygiene (framework convention)

Full rule: `.claude/rules/tasks.md`. The short version:

- Status, AC ticks, and the re-ordered **Next up** change in the **same
  commit** as the code.
- **Done means verified**: every AC checked against reality, gate green with
  output seen, user-facing behaviour checked in Chrome. Otherwise `🟡 Partial`.
- Verified-done task files move to `docs/tasks/completed/`.
- Out-of-scope discoveries become a new task file + index row, not a TODO.
- Any orienting file past **400 lines** gets split (index + leaves) the next
  time it is touched.

## Delegation (framework convention)

Agents live in `.claude/agents/` and `.opencode/agents/` (`worker` /
`advisor` / `verifier`, plus `reviewer`, `docs`, `plan` for OpenCode). The
policy is provider-agnostic; swap each agent's `model:` for whatever tiers
you run.

- Delegate only a task with a fixed spec AND a test gate (every
  `docs/tasks/` file qualifies). Never delegate permission, storage-schema,
  or messaging-contract changes, releases, or planning itself.
- Escalate to `advisor` after 2 failed attempts (the `ERRORS.md` threshold).
- `verifier` proves the gate with raw output before any "done" claim.
- Cheap-model and unattended runs follow the loop in
  `.opencode/fable-AGENTS.md`; `verifier` judges them adversarially.

## Documentation & Handover Ritual (framework convention)

`project-documentation/` is the durable record of this project: numbered
topic docs (architecture overview, decision journal, debugging war stories,
lessons learned) with a Blog-ready flag, indexed in `00-index.md`.

At the END of any substantive work session, run without being asked:

1. **Update or create the relevant numbered doc(s).** Decisions go to the
   decision journal; solved bugs go to war stories in the fixed format
   (Symptom → Investigation → Root Cause → Fix → Principle). Start new docs
   from `project-documentation/TEMPLATE.md`.
2. **Write them in the author's voice.** Apply the `voice-apply` skill if a
   profile is available, then `stop-slop` (see Documentation Voice).
3. **Refresh `00-index.md`** with an honest Blog-ready flag.
4. **Only document what actually happened.** Real figures, real dates,
   "built but not deployed" said exactly. No fabricated metrics.

Trivial sessions (a one-line fix, a question answered) can skip the ritual;
any session that produced a decision, a bug fix, or a lesson cannot.

## Documentation Voice (framework convention)

Human-facing prose should read like the owner wrote it, not like generic AI.
The measured voice profile is private (not in this repo); the `voice-apply` /
`voice-analyze` / `voice-create` skills under `.claude/skills/` take a profile
path when one is available. Without it, apply these essentials by hand:

- First-person where natural; present the reasoning.
- Assert on evidence ("test suite passed, 0 failures"), hedge on opinion.
- No em-dash peppering, no marketing speak or AI buzzwords. UK English.
- Concrete: real names, exact figures, dates, `(see: …)` inline references.
- Honest about scope and gaps.
- Preserve functional scaffolding (tables, status markers, headings, code).

Run final text through `stop-slop` before it lands.

## Repo-specific cautions (read before pushing anything)

- `origin` is the **public** extension repo. This branch is the live
  extension; the paid MCP server is developed in a separate private repo and
  must never be pushed here.
- Never commit realistic-looking secrets, even as test fixtures. GitHub push
  protection blocks the whole push. Canonical placeholders only (see
  `docs/tasks/PLAYBOOK.md` §Fixtures).
- Confirm before releases, manifest permission changes, or anything with
  external side effects. "You mentioned this earlier" is not confirmation.
- Don't commit or push unless asked.
