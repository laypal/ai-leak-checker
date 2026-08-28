# OpenCode Best Practices

Working rules for this setup. Read once; `OPENCODE-DEV.md` is the quick reference.

## Model routing

| Task | Agent | Why |
|------|-------|-----|
| Executing a task file | `build` (default) | Cheap coder; the task file carries the thinking |
| Reviewing a task file for gaps, breaking it into steps | `plan` | Reasoning model, read-only |
| Privacy/code review before commit | `@reviewer` | Read-only, structured verdict |
| One fully-specified task with a test gate | `@worker` | Cheap grind in its own thread |
| Proving the gate is green | `@verifier` | Raw output as evidence |
| Stuck after 2 attempts, or DECISION NEEDED | `@advisor` | Decision + plan, not code |
| Index / STATUS / handover writing | `@docs` | No bash, no web |

Stay on `build` unless another agent offers something you need.

## Delegation and escalation

- Delegate only when the task has a fixed spec AND a test gate. Every file in
  `docs/tasks/` has both; anything else stays on the main loop.
- Never delegate: manifest permission changes, storage-schema changes,
  messaging-contract changes, releases, or planning itself.
- Escalate to `@advisor` after 2 failed attempts (same threshold as an
  `ERRORS.md` entry).
- Workers and verifier return proof, not claims: raw typecheck/test output in
  the report.

## Verify, don't trust

Task files carry "Current-state facts (verified <date>)". Re-verify the
file:line references before acting on them; the code may have moved. If a
doc contradicts the code, the code wins, then fix the doc in the same commit.

## Task hygiene

- Status and the "Next up" order in `docs/tasks/index.md` change in the same
  commit as the code.
- "Done" means every AC verified, gate green with output seen, and (for
  user-facing work) a manual check in Chrome. Otherwise it is 🟡 Partial.
- Move verified-done task files to `docs/tasks/completed/`.
- Any orienting file past 400 lines gets split (`.claude/rules/tasks.md`).

## Caching

DeepSeek caches prompt prefixes automatically (cache-hit tokens are billed at
a fraction of the miss rate). The `instructions[]` files form the prefix; keep
them stable and small. Do not put a frequently-edited file (STATUS, the task
index) in `instructions[]`.

## Context management

- Compaction is automatic. At 70% context prepare a handover; at 85% run
  `/handover`.
- `build` is capped at 50 steps, `plan` at 25. If a task needs more, split it.

## Writing and voice

Prose (handovers, docs) goes through `stop-slop` (and `voice-apply` where the private profile is available). No em
dashes, no marketing buzzwords, no fabricated metrics, UK English. Keep tables
and status markers intact.
