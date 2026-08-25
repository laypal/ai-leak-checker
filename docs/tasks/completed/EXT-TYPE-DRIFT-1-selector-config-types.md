# EXT-TYPE-DRIFT-1: SiteConfig vs selectors.json reconciled

**Area:** Extension · types · **Priority:** P2 · **Status:** ✅ Done 2026-06-07

## Outcome

Additive resolution, zero shipped-behaviour change: the runtime consumes the
TS `BUNDLED_SELECTORS` constant (never the JSON), so the JSON got an
accurate **file-format** model (`SelectorConfigFile` etc.) plus the
previously missing `configs/selectors.schema.json` (draft-07). Conformance
test: `tests/unit/selectors-config-type.test.ts`.

## Follow-on

- Unify the two shapes when EXT-7.8 (remote config) is decided.
