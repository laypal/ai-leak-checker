# EXT-HK-3: Stricter selector-config validation

**Area:** Extension · selectors · **Priority:** P2 · **Status:** ✅ Closed, **not needed** (owner decision 2026-08-25)

## Outcome

`validateSelectorConfig` (`src/shared/utils/selector-validation.ts`) keeps its
structural checks; it does not enforce every schema-required key from
`configs/selectors.schema.json`.

## Why

The runtime reads the TypeScript constant `BUNDLED_SELECTORS`, which the
compiler already type-checks; `configs/selectors.json` is a mirror. With
EXT-7.8 decided as bundled-only, the JSON never becomes the source of truth,
so a stricter validator only guards against a hand edit nobody consumes.

## Decision log

- 2026-08-25, owner: close. Re-open only if the JSON ever becomes load-bearing.
