# EXT-7.4: Site allowlist ("pause on this site")

**Area:** Extension · content + background + popup · **Priority:** P1 · **Status:** ✅ Done (Tasks 1–7 complete) · **Estimate:** ~3 h remaining
**Requirement:** FR-CFG-003 · **Playbook:** read `PLAYBOOK.md` first.

## Why

`Settings.siteAllowlist` exists but nothing honours it: a dead config key in
a launched privacy tool is a trust risk. Users need a one-click "pause on this
site" that stops scanning live, without a reload.

## Branch state (verified 2026-08-25)

`origin/feature/site-allowlist` is **pushed** and is already based on the
current `main` (`f95b555`, PR #23 included); no rebase needed. The full gate
ran green on it on 2026-08-25 (typecheck clean, lint 0 errors / 8 pre-existing
warnings, 436 unit + 5 integration tests, corpus FP 3.19%). Commits, oldest first:

| Commit | What |
| --- | --- |
| `48ad4e3` | Approved design spec: `docs/superpowers/specs/2026-06-07-site-allowlist-design.md` |
| `68e6374` | Task-by-task plan **with exact code for every task**: `docs/superpowers/plans/2026-06-07-site-allowlist.md` (784 lines; read only the task you are on) |
| `1edfb1a` + `d27f3c1` | **Task 1 done:** `src/shared/utils/site-match.ts` (`normalizeHost`, `isHostExcluded`, `toggleSiteExclusion`) + `tests/unit/site-match.test.ts` (13 tests) |
| `0ab2336` + `a3149f9` | **Task 2 done:** content `isCurrentSiteExcluded()`; `scanWithSettings()` returns `scan('')` when excluded + `tests/unit/content-site-exclusion.test.ts` (3 tests) |
| (2026-08-25) | Handover note: `docs/superpowers/plans/HANDOVER-site-allowlist-2026-06-07.md` |

Both done tasks passed a spec-compliance and a code-quality review. The
`package-lock.json` delta on the branch is a benign version sync; take
`main`'s side on conflict.

## Remaining work (Tasks 3–7; exact code in the plan file)

- [x] **Start:** `git fetch && git checkout feature/site-allowlist && npm ci && npm run test` (expect green). If `main` has moved since `f95b555`, rebase onto it first.
- [x] **Task 3:** add `GET_SITE` and `SET_PAUSED_BADGE` to `MessageType` + payload types in `src/shared/types/messages.ts`; re-export from `src/shared/types/index.ts`.
- [x] **Task 4:** background `SET_PAUSED_BADGE` handler in `src/background/index.ts`, mirroring the `SET_FALLBACK_BADGE` case (~line 241): `⏸` / `#6c757d` when paused, `updateBadgeForTab(tabId)` when not. New `tests/unit/paused-badge.test.ts`.
- [x] **Task 5:** content `src/content/index.ts`: `notifyPausedState()` (mirror `notifyFallbackActive` ~line 350), called at the end of `initialize()` and in the `SETTINGS_UPDATED` case after `applySettings`; a `GET_SITE` case in `handleMessage` returning `{ host: window.location.hostname }`.
- [x] **Task 6:** popup `src/popup/popup.tsx`: `useEffect` on mount → `chrome.tabs.query({ active: true, currentWindow: true })` (tab **id only**, never `tab.url`) → `chrome.tabs.sendMessage(GET_SITE)`; render a "Pause scanning on <host>" toggle + "Scanning paused on <host>" notice after the Sensitivity section (~line 380); toggle calls `updateSetting('siteAllowlist', toggleSiteExclusion(host, list))`. No reply from content = unsupported site = hide the toggle.
- [x] **Task 7:** docs: `docs/architecture/` `siteAllowlist` line, this file → `completed/`, `docs/STATUS.md` known-limitations list, `docs/tasks/index.md`.

## TDD plan (RED first, per task)

1. Task 3: typecheck is the gate (a test that constructs each new message type compiles).
2. Task 4: `tests/unit/paused-badge.test.ts` via the `background-sender.test.ts` chrome-stub pattern: paused → `setBadgeText('⏸')` + grey colour for that tab; un-paused → `updateBadgeForTab` called; foreign sender rejected.
3. Task 5: extend `tests/unit/content-site-exclusion.test.ts`: after `applySettings({ siteAllowlist: [host] })` the next scan is empty **and** `SET_PAUSED_BADGE` is sent; `GET_SITE` reply carries the hostname.
4. Task 6: `toggleSiteExclusion` is already tested; popup wiring is verified manually + E2E.

## Acceptance criteria (BDD)

- [x] **Given** a domain is in `siteAllowlist`, **When** the page loads or the toggle flips (no refresh), **Then** no scan fires, no modal shows, and the injected fetch-fallback path posts `{ hasSensitiveData: false }`.
- [x] **Given** the popup on an excluded supported site, **Then** it shows the paused notice, the tab badge shows `⏸`, and the toggle re-enables live.
- [x] **Given** an unsupported site (no content script), **Then** the popup does not error and the toggle is hidden.

## Do / Don't

- **Do** gate at scan time; never tear down listeners.
- **Do** learn the host via `GET_SITE` to the content script; never read `tab.url`. No `tabs` permission.
- **Do** store normalized hosts: lowercase, one leading `www.` stripped, exact match.
- **Don't** add wildcard subdomains (descoped by the approved design).
- **Don't** build the user string-allowlist editor here (that is EXT-7.3).
- **Don't** add new `no-console` warnings (8 pre-existing in background/content).
- **Don't** weaken the sender gate on `SETTINGS_UPDATED`.

## Verify

Gate + manual: reload unpacked → toggle pause on chatgpt.com → badge `⏸`, no modal on a canonical test key, no refresh needed; untoggle → resumes; popup on an unsupported site shows no toggle and no error.

## Decision log

- Exact-host match, scan-time gating, no wildcards: approved design 2026-06-07.
- Badge + popup notice as the paused indicator (a deliberate addition beyond the original internal spec).
- Tasks 2 and 4 unit tests are **contract-lock mirrors** (module-private functions cannot be imported); the production wiring is proven by typecheck + the manual smoke gate. Accepted limitation, flagged in review.
