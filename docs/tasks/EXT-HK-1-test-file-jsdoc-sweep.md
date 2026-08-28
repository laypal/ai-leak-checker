# EXT-HK-1: Test-file JSDoc header sweep

**Area:** Extension · housekeeping · **Priority:** P2 · **Status:** 🔲 Not started · **Estimate:** ~1 h
**Deferred from:** PR review, branch `feature/phase7-fp-tuning-selector-health` (2026-06-07).

## Why

~40 test files use `@fileoverview`; the house standard is `@file` +
`@description`. One consistent sweep, not scattered edits.

## Deliverables

- [ ] Every file under `tests/` begins with the `.claude/rules/code-style.md` header (`@file`, `@description`).
- [ ] No other line in any test file changes.

## TDD plan

None (comments only). Add a one-off check in the PR description:
`grep -rL "@file" tests --include=*.ts` returns nothing.

## Acceptance criteria

- [ ] `grep -rL "@file" tests --include=*.ts` is empty.
- [ ] `npm run test` count unchanged.

## Do / Don't

- **Don't** touch assertions, imports, or fixtures. Header lines only.
