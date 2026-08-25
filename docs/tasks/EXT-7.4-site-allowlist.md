# EXT-7.4: Site allowlist ("pause on this site")

**Area:** Extension · content + popup · **Priority:** P1 · **Status:** 🟡 Partial (T1 + T2 done on `feature/site-allowlist`) · **Estimate:** ~3 h remaining
**Requirement:** FR-CFG-003 · **Playbook:** read `PLAYBOOK.md` first.

## Why

`Settings.siteAllowlist` exists but nothing honours it: a dead config key in
a launched privacy tool is a trust risk. Users need a one-click "pause on this
site" that stops scanning live, without a reload.

## Current-state facts (verified 2026-07-12; re-verify)

- Branch `feature/site-allowlist` exists (local to the owner's machine; if you
  cannot see it, ask, or re-do T1/T2 from this file, they are small):
  - `1edfb1a` T1: `src/shared/utils/site-match.ts` (`normalizeHost`, `isHostExcluded`) + `tests/unit/site-match.test.ts`.
  - `0ab2336` + `a3149f9` T2: content `scanWithSettings` gated on an excluded host (returns `scan('')`, an empty result) + `tests/unit/content-site-exclusion.test.ts`.
  - The branch predates PR #23 (detector settings wiring); it needs a rebase.
- Settings flow: popup `updateSetting` → `SETTINGS_UPDATE` → background merges and broadcasts `SETTINGS_UPDATED`; content `applySettings` applies live (`src/content/index.ts:55-87`).
- Manifest permissions are `storage` + `activeTab` + three host permissions. No `tabs`.

## Deliverables

- [ ] Rebase: `git rebase main feature/site-allowlist`. Take `main`'s side on `package-lock.json` conflicts. Confirm `scanWithSettings` gating still composes with the detector-settings wiring from PR #23.
- [ ] T3: test that `applySettings({ siteAllowlist: [host] })` live-gates the next scan (verification only; no new code expected).
- [ ] T4: popup "Pause on this site" toggle. Pure `toggleSiteExclusion(host, list)` in `site-match.ts`; popup reads the active-tab host via `chrome.tabs.query({ active: true, currentWindow: true })` and calls `updateSetting('siteAllowlist', next)`. Shows "Paused on this site" state. Hidden/disabled on unsupported sites.
- [ ] T6: docs. `docs/architecture/` `siteAllowlist` line, this file, `docs/STATUS.md`.

## TDD plan (in order; RED first)

1. `tests/unit/site-toggle.test.ts`:
   ```ts
   import { toggleSiteExclusion } from '@/shared/utils/site-match';

   it('adds the normalized host when absent', () => {
     expect(toggleSiteExclusion('WWW.ChatGPT.com', [])).toEqual(['chatgpt.com']);
   });
   it('removes the host when present', () => {
     expect(toggleSiteExclusion('chatgpt.com', ['chatgpt.com', 'claude.ai'])).toEqual(['claude.ai']);
   });
   ```
2. T3 assertion in `tests/unit/content-site-exclusion.test.ts` via `applySettings`.
3. Popup wiring. Unit-test with a `chrome.tabs.query` stub (the `storage.test.ts` chrome-stub pattern) or cover manually + E2E.

## Acceptance criteria (BDD)

- [ ] **Given** a domain is in `siteAllowlist`, **When** the page loads or the toggle flips (no refresh), **Then** no scan fires, no modal shows, and the injected fetch-fallback path posts `{ hasSensitiveData: false }`.
- [ ] **Given** the popup on an excluded supported site, **Then** it shows the paused state and the toggle re-enables live.
- [ ] **Given** an unsupported site (no host permission), **Then** the popup does not error and the toggle is hidden or disabled.

## Do / Don't

- **Do** gate at scan time. Don't tear down listeners; that breaks live re-enable.
- **Do** store normalized hosts: lowercase, `www.` stripped, exact match only.
- **Do** verify manually that `chrome.tabs.query` returns `tab.url` under `activeTab` when the popup opens (it is a user gesture). If `url` is empty, fall back to a `GET_SITE` message to the content script.
- **Don't** add the `tabs` permission. That is a manifest change and a Chrome Web Store re-review.
- **Don't** add wildcard subdomains. Descoped by the approved design (v1 is exact host).
- **Don't** weaken the sender gate on `SETTINGS_UPDATED`.

## Verify

Gate + manual: toggle on chatgpt.com → scanning stops live; untoggle → resumes.

## Decision log

- Exact-host match, scan-time gating, no wildcards: approved design 2026-06-07.
- T5 (per-finding allowlist from the modal) is EXT-7.3, not here.
