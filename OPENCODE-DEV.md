# OpenCode Dev Context — ai-leak-checker

**Repo:** ai-leak-checker — a live Chrome/Edge (MV3) extension that detects API keys, credentials, PII and card numbers locally before they reach ChatGPT / Claude. Privacy is the product: zero network calls, prompt content never stored.
**Owner:** Lyall, UK, solo dev
**Stack:** `STACK.md` (TypeScript strict, Vite, Preact popup, Vitest + Playwright, npm)

---

## This OpenCode setup

| Agent | Model (default) | Use for |
|-------|-----------------|---------|
| `build` (default) | `deepseek/deepseek-chat` | Executing a task file from `docs/tasks/` |
| `plan` | `deepseek/deepseek-reasoner` | Reviewing a task file for gaps; breaking it into steps |
| `@reviewer` | `deepseek/deepseek-reasoner` | Privacy + code review before commit (read-only) |
| `@worker` | `deepseek/deepseek-chat` | One fully-specified task with a test gate |
| `@verifier` | `deepseek/deepseek-chat` | Runs the validation gate, reports raw evidence |
| `@advisor` | `deepseek/deepseek-reasoner` | Stuck after 2 attempts, or a DECISION NEEDED task |
| `@docs` | `deepseek/deepseek-chat` | `docs/tasks/index.md`, STATUS, handovers |

Model ids are the OpenCode `deepseek` provider defaults. Confirm what your
key can reach with `opencode models deepseek`; swap ids in `opencode.json`
and each `.opencode/agents/*.md` frontmatter (`openrouter/deepseek/...` works
the same way). Stronger tiers, if authenticated: `anthropic/claude-opus-4-8`
for `plan`/`advisor`.

---

## Key constraints

- **Hard invariants** (`CLAUDE.md`): never store or transmit prompt content;
  no network calls; no new manifest permissions; no `eval`/`innerHTML` with
  user data; typed messages with sender gates. Green tests do not excuse a
  violation.
- **Minimal solutions:** implement exactly the task file. No adjacent
  refactoring. Files ≤400 lines, functions ≤50.
- **Fixtures:** canonical placeholder secrets only (`AKIAIOSFODNN7EXAMPLE`,
  `sk-test…`). GitHub push protection blocks realistic fakes.
- **Commands are npm** on this branch (`npm run typecheck && npm run lint &&
  npm run test && npm run test:corpus`).

---

## Session rules

- Start at `docs/tasks/index.md` → "Next up" → open the task file → read
  `docs/tasks/PLAYBOOK.md` once.
- Task status and the "Next up" order change in the same commit as the code
  (`.claude/rules/tasks.md`).
- Delegate only fixed-spec + test-gated tasks (`@worker`); escalate to
  `@advisor` after 2 failed attempts; `@verifier` proves the gate before any
  "done".
- Cheap-model runs follow the loop in `.opencode/fable-AGENTS.md`.
- At 70% context: prepare handover. At 85%: run `/handover`.
- Log 2+-attempt failures to `ERRORS.md`. Check it before retrying anything.

---

## When to consult other files

| Need | File |
|------|------|
| What to work on next | `docs/tasks/index.md` |
| How to execute a task (branch, TDD loop, gate, invariants, patterns) | `docs/tasks/PLAYBOOK.md` |
| Architecture | `docs/architecture/index.md` |
| Test layout and strategy | `docs/testing/index.md` |
| Selector maintenance | `docs/selectors/index.md` |
| False-positive suppression layers | `docs/detection/FALSE_POSITIVES.md` |
| Claude Code / Cursor agent usage | `docs/agents/index.md` |
| Handover ritual, voice | `AGENTS.md` (voice profile is private) |

---

**Last Updated:** 2026-08-25
