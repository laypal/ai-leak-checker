# EXT-10.4: Firefox port

**Area:** Extension · build + manifest · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~2 days
**Playbook:** read `PLAYBOOK.md` first. Research current Firefox MV3 state (Context7 / MDN) **before** starting; it moves.

## Outline

- `browser.*` vs `chrome.*`: feature-detect or `webextension-polyfill`. Firefox MV3 background is an **event page** (`background.scripts`), not a service worker; the manifest needs both keys or a build-time variant.
- `browser_specific_settings.gecko.id` is required for AMO; separate signed build. Check `storage.session` and `scripting` API parity.
- Build: dual-target output in `scripts/build-entries.js` (`dist/chrome`, `dist/firefox`) + a manifest transform step.
- AMO submission checklist mirrors the CWS one; `store/` assets are reusable.

## TDD plan (RED first)

1. Pure `transformManifest(base, target: 'chrome' | 'firefox')` with tests for both outputs (background key shape, gecko id present only for firefox).
2. Extend `tests/build/build-output.test.ts` to assert both `dist/` targets.
3. Unit tests for any polyfill shim.

## Acceptance criteria (BDD)

- [ ] **Given** `npm run build`, **Then** `dist/chrome` and `dist/firefox` both exist and each passes the build-output tests.
- [ ] **Given** the Firefox build loaded via `about:debugging`, **When** a canonical key is typed on chatgpt.com, **Then** the modal blocks submission.
- [ ] Chrome behaviour unchanged.

## Do / Don't

- **Do** keep a single source; differences live in the transform step.
- **Don't** widen permissions for either target.
