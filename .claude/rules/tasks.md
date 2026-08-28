# Task Sheet & Context-File Hygiene

Applies to every agent (Claude Code, OpenCode, Cursor) on every task.

## Where tasks live

- `docs/tasks/index.md` — status tables and the prioritised **Next up** (top 5).
  Status and routing only; it never restates task detail.
- `docs/tasks/<ID>-<kebab-title>.md` — one task per file: context, verified
  facts, deliverables, TDD plan, BDD acceptance criteria, do / don't, verify gate.
- `docs/tasks/completed/` — task files moved here once verified done.
- `docs/tasks/PLAYBOOK.md` — how to execute any task (branch, TDD loop,
  validation gate, invariants, house patterns). Read once per session.

IDs are never reused. Status legend: `🔲 Not started` · `🔄 In progress` ·
`🟡 Partial` · `✅ Done` · `🚫 Blocked (named blocker)` · `❓ Decision needed`.

## Rules

1. **Start at the index.** Pick from **Next up** unless the user names a task.
   If the top item is not `✅ Ready`, surface the blocker to the user instead
   of starting something else silently.
2. **Same commit.** The code change, the task file's status/AC ticks, and the
   index row (plus a re-ordered Next up) land in **one commit**. A commit that
   changes behaviour without moving the backlog leaves two sources of truth.
3. **Done means verified.** Move a task to `completed/` only when every AC is
   ticked against reality, the validation gate passed with output seen, and
   user-facing behaviour was checked in Chrome. Otherwise mark `🟡 Partial`
   and say in the task file which half shipped.
4. **Re-order Next up on every status change.** Finishing a task usually
   changes what comes next. Keep it at 5 with a "Why now" and a "Ready?" column.
5. **Record deviations, don't rewrite ACs.** If what shipped differs from the
   spec, note it under the AC. Record rejected options and why.
6. **Facts get re-verified.** Before acting on a `file:line` in a task file,
   check it against the code. If stale, fix the task file in the same commit.
7. **New work gets a file.** Anything discovered mid-task that is out of scope
   becomes a new `docs/tasks/<ID>-*.md` with at least context + ACs, and an
   index row, not a TODO comment.

## Context-file size rule

Any file **loaded to orient** (task files, index, STATUS, PLAYBOOK, rules,
agent instructions, `OPENCODE-DEV.md`, `CLAUDE.md`, `AGENTS.md`) that passes
**400 lines** gets split the next time it is touched: a directory with an
`index.md` (routing only) and per-section leaves, cut on headings, bodies
copied verbatim, verified by line counts. Leave a 5-line stub at the old path.

Exempt (read deliberately, one at a time): `docs/tasks/completed/`,
`docs/reviews/`, `docs/requirements/`, `project-documentation/`,
`sessions-memory/`.

`scripts/check-context-size.mjs` runs as a Claude Code PostToolUse hook and
warns when a watched file crosses the line. Run it by hand any time:
`node scripts/check-context-size.mjs`.
