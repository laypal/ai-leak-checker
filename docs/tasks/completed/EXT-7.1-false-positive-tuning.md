# EXT-7.1: False-positive tuning

**Area:** Extension · detection engine · **Priority:** P0 · **Status:** ✅ Done 2026-06-06 (PR #22) · ships in unpublished 0.1.7

## Outcome

Corpus false-positive rate **23.71% → 3.19%** at `high` sensitivity (2.19%
`low`, 3.19% `medium`) on the 502-sample corpus. Two suppression layers, both
now load-bearing for any detector work:

- **Structural exclusions** in `entropy.ts` (URLs, pure-hex ≥32, base64 data URIs, filenames, semver), `luhn.ts` (UUID fragments, bare 13-digit non-issuer numbers), `pii.ts` (token-embedded phones).
- **Built-in value allowlist** in `placeholders.ts` (`isPlaceholderSecret` / `isExampleEmail` / `isProductCode`), applied engine-wide via `isKnownSafeValue`. Strong vs weak markers (weak only ≤40 chars) so real long secrets are not suppressed.
- Regression gate: `tests/corpus/run-corpus-test.ts` **fails above 4%** (`npm run test:corpus`). Documented in `docs/detection/FALSE_POSITIVES.md`.

## Decision log

- **Aggressive suppression policy** (owner-approved 2026-06-06).
- Canonical example fixtures (`AKIAIOSFODNN7EXAMPLE` etc.) stay in tests because they are push-protection-safe; do not replace with realistic fakes. Tests needing raw detector behaviour use `scan(text, { disableBuiltinAllowlist: true })`.
- Deferred: in-modal "this isn't sensitive" feedback → EXT-7.3.
