# EXT-HK-3: Stricter selector-config validation (optional)

**Area:** Extension · selectors · **Priority:** P2 · **Status:** ❓ Decision needed (is it wanted?) · **Estimate:** ~1 h
**Deferred from:** PR review 2026-06-07.

## Why

`validateSelectorConfig` (`src/shared/utils/selector-validation.ts`) checks
structure but not the full schema-required set in
`configs/selectors.schema.json`.

## If wanted

- [ ] Update `validateSelectorConfig` to enforce the schema-required keys **and** the `validConfig` fixture in `tests/unit/selector-validation.test.ts` together (RED: fixture missing a required key fails).
- [ ] `npm run check:selectors` still passes on the shipped config.

## Do / Don't

- **Don't** change runtime selector behaviour; validation only.

## Decision log

- _(pending owner: worth doing, or close as not needed?)_
