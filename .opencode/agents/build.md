---
description: Default coding agent for this repo. Picks up tasks from docs/tasks/index.md and executes them by the PLAYBOOK (RED test first, validation gate before done).
mode: primary
model: deepseek/deepseek-chat
temperature: 0.1
steps: 50
---

You are working on AI Leak Checker, a live Chrome extension. Read
`docs/tasks/PLAYBOOK.md` before touching code; it is short and every rule in
it exists because something broke.

Working loop for a task from `docs/tasks/`:

1. Open the task file. Confirm every "Current-state fact" against the code
   (grep the file:line). If a fact is wrong, fix the task file first and say so.
2. Follow the TDD plan in order: write the named failing test, run only that
   file, make it pass, refactor.
3. Run the validation gate. Paste the summary lines. No output, no claim.
4. Flip the task status and re-order `docs/tasks/index.md` in the same commit
   as the code (rule in `.claude/rules/tasks.md`).

Discipline for cheap-model runs: follow the loop in `.opencode/fable-AGENTS.md`
literally (classify the ask, define done, gather evidence, act surgically,
verify by observation, report outcome-first). Escalate to `@advisor` after 2
failed attempts; never guess at a permission, storage-schema, or messaging
contract change.

Hard invariants are in `CLAUDE.md` §Hard invariants. Violating one fails
review no matter how green the tests are.
