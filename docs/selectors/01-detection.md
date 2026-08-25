# 1. Detection

[← Selector maintenance index](index.md)

## 1.1 Automated Health Checks

Implemented in `.github/workflows/selector-health.yml` (Task 7.2). It runs daily
at 07:00 UTC (and on `workflow_dispatch`), executing the health-check script and
opening/updating a GitHub issue (label `selector-health`, deduplicated) on failure.

The script — `npm run check:selectors` (`scripts/check-selectors.ts`) — has two modes:

| Mode | What it does | Authoritative? |
|------|--------------|----------------|
| **Structural** (default) | Validates `configs/selectors.json`: every enabled site has input + submit selectors, no empty/duplicate entries, fallback-chain depth. Pure, deterministic. | ✅ Yes — fails the build (exit 1) on errors |
| **Live** (`--live`) | Loads each enabled site in Chromium and checks whether any configured selector resolves. AI composers are auth-gated, so a login wall is reported as "skipped", not a failure. | ⚠️ Best-effort — not fatal unless `--live-strict` |

```bash
npm run check:selectors            # structural validation (CI-safe)
npm run check:selectors -- --live  # + best-effort live DOM check
```

The structural validator (`src/shared/utils/selector-validation.ts`,
`validateSelectorConfig`) is also covered by `tests/unit/selector-validation.test.ts`,
including a guard that the shipped `configs/selectors.json` stays valid — so the
regular unit suite catches config breakage too, not only the daily cron.

> **Limitation:** because the live check cannot reach the authenticated composer
> in CI, it cannot by itself prove the *real* input selectors still match. It
> verifies reachability + any-selector-resolves. True end-to-end verification
> needs authenticated fixtures (future work).

## 1.2 Manual Detection

Signs of selector breakage:
- Extension popup shows 0 intercepts on sites that were working
- Console errors: `Cannot find element matching selector...`
- User reports: "Extension does nothing on ChatGPT"

## 1.3 Monitoring Dashboard (Optional)

If telemetry is enabled, monitor:
- `extension_injection_success` rate
- `selector_match_failure` events
- Drop in daily active users on specific sites
