# EXT-7.8: Remote selector config delivery

**Area:** Extension · selectors · **Priority:** P2 · **Status:** ✅ Closed, **decided: bundled-only** (owner decision 2026-08-25)

## Outcome

No remote config. Selectors stay bundled in `src/shared/types/selectors.ts`
(`BUNDLED_SELECTORS`) and `configs/selectors.json`; fixes ship as store
releases. The daily selector-health workflow
(`.github/workflows/selector-health.yml`) opens an issue when a site breaks,
which is the trigger for a release.

## Why

Remote config means a network call, which collides with the "zero network
calls" claim the product is marketed and privacy-policied on. Keeping the
claim literally true is worth the slower fix loop.

## Decision log

- 2026-08-25, owner: **(a) bundled-only + release cadence**. Options (b)
  opt-in signed JSON refresh and (c) softening the claim were rejected.
- Follow-on that was parked on this decision: unify `SelectorConfigFile` ↔
  runtime `SiteConfig` (EXT-TYPE-DRIFT-1 follow-up). Still optional; open a
  task only if the drift causes a bug.
- Practical rule for agents: a selector fix is a release. Bump both version
  files (`package.json`, `public/manifest.json`), run EXT-REL-style checks,
  hand the zip to the owner.
