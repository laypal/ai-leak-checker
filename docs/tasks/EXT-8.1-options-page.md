# EXT-8.1: Full options page

**Area:** Extension · new entry point · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~8 h
**Depends on:** nothing hard; EXT-7.3 / EXT-7.4 lists get their full management UI here · **Playbook:** read `PLAYBOOK.md` first.

## Why

The popup has no room for detector management, allowlists, import/export, or
an About panel. Phase 8 Pro features (EXT-8.2, EXT-8.3) need this page.

## Current-state facts (verified 2026-07-12; re-verify)

- No `options_ui` in `public/manifest.json`.
- Build is per-entry via `scripts/build-entries.js`; the popup entry shows how an HTML+Preact entry is built. Check `vite.config.ts` and `build-entries.js` before assuming the shape.
- `tests/build/build-output.test.ts` asserts what lands in `dist/`.

## Deliverables

- [ ] `public/manifest.json`: `"options_ui": { "page": "options.html", "open_in_tab": true }`. No new permissions.
- [ ] `src/options/` Preact page mirroring the popup's build shape: tabs Detectors / Sensitivity / Allowlists / Export / About.
- [ ] Settings import/export as JSON. **Export excludes stats.** Import validates shape before applying and writes through the standard `SETTINGS_UPDATE` path.
- [ ] `src/shared/utils/settings-import.ts`: pure `validateSettingsImport(raw: unknown): Result<Partial<Settings>, ImportError>`.
- [ ] Extend `tests/build/build-output.test.ts`: `options.html` + its JS land in `dist/` and the manifest references it.

## TDD plan (in order; RED first)

1. `tests/unit/settings-import.test.ts`: valid subset accepted; unknown keys stripped; wrong types rejected with a reason; `detectors` partial-merge semantics; oversized allowlists clamped to their caps (100 values, per EXT-7.3).
2. Build-output test extension (RED: `options.html` missing).
3. Options page consumes `updateSetting`-equivalent messaging; no direct storage writes. Manual check.

## Acceptance criteria (BDD)

- [ ] **Given** exported settings JSON from one profile, **When** imported in another, **Then** the resulting `Settings` are identical (minus stats).
- [ ] **Given** a malformed file, **Then** a clear error and no partial write.
- [ ] **Given** `chrome://extensions` → Details → Extension options, **Then** the page opens in a tab and every tab renders without console errors.

## Do / Don't

- **Do** reuse popup components where they exist; no second settings model.
- **Don't** write `chrome.storage` from the page; go through the message path.
- **Don't** include stats or allowlist values in logs.
- **Don't** add permissions.

## Verify

Gate + `npm run test:build` + manual open from `chrome://extensions`.
