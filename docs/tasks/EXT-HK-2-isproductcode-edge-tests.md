# EXT-HK-2: `isProductCode` edge-case tests

**Area:** Extension · tests · **Priority:** P2 · **Status:** 🔲 Not started · **Estimate:** ~30 min
**Deferred from:** PR review 2026-06-07.

## Why

`isProductCode` in `src/shared/utils/placeholders.ts` is part of the
built-in allowlist that suppresses false positives; its edge behaviour is
untested.

## Deliverables

- [ ] Additive cases in `tests/unit/placeholders.test.ts`: empty string → false; 1k+ char input → false; special characters → false; leading / trailing / consecutive hyphens.

## Acceptance criteria

- [ ] New cases pass without changing `placeholders.ts`. If one fails, stop and open a task for the fix rather than changing the function here.
- [ ] `npm run test:corpus` rate unchanged.

## Do / Don't

- **Don't** modify production code in this task.
