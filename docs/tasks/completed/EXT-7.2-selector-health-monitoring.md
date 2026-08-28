# EXT-7.2: Selector health monitoring

**Area:** Extension · selectors · **Priority:** P0 · **Status:** ✅ Done 2026-06-06 (PR #22)

## Outcome

- `scripts/check-selectors.ts` (`npm run check:selectors`): structural validation (authoritative) + best-effort `--live` Playwright check (auth-aware; reports "skipped" on login walls).
- `src/shared/utils/selector-validation.ts`: pure `validateSelectorConfig`, unit-guarded so the shipped `configs/selectors.json` stays valid.
- `.github/workflows/selector-health.yml`: daily cron 07:00 UTC; failure opens/updates a deduped GitHub issue (pnpm-migrated + repo-scoped 2026-07-05).

## Decision log

- Deliberately **no** live E2E health spec: auth-gated ChatGPT/Claude makes it inherently flaky; the script's `--live` mode + daily workflow cover it.
- Leftovers promoted to EXT-7.7 (unsupported-site runtime UX) and EXT-7.8 (remote config, decision needed).
