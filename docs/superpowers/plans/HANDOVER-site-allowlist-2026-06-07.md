# Handover — Per-Site Pause (`siteAllowlist`) feature

**Date:** 2026-06-07
**Branch:** `feature/site-allowlist` (off `main` @ pre-PR#23; **pushed to origin 2026-08-25**, needs `git rebase main` first)
**Public task file:** `docs/tasks/EXT-7.4-site-allowlist.md` on `main` (after the scaffolding PR merges) is the status of record; this note and the plan below are the detail.
**Execution mode:** Subagent-Driven Development (superpowers) — fresh implementer per task + 2-stage review (spec compliance → code quality).

## Where we are

Brainstorm → approved design → plan → executing. **Tasks 1 and 2 of 7 are DONE** (both passed spec + quality review). Paused before Task 3 at user request.

### Source of truth (read these first next session)
- **Design spec:** `docs/superpowers/specs/2026-06-07-site-allowlist-design.md`
- **Implementation plan (task-by-task, exact code):** `docs/superpowers/plans/2026-06-07-site-allowlist.md`
- This handover.

### Commits so far (newest first)
```
a3149f9 refactor(site-allowlist): use scan('') for paused gate; add @returns   <- Task 2 review fix
0ab2336 feat(site-allowlist): gate content scanWithSettings on excluded host    <- Task 2
d27f3c1 refactor(site-allowlist): clarify toggle JSDoc + document single-www    <- Task 1 review fix
1edfb1a feat(site-allowlist): pure hostname match helpers + tests               <- Task 1
68e6374 docs(site-allowlist): task-by-task implementation plan
48ad4e3 docs(site-allowlist): approved design spec for per-site pause
```

## What the feature does (decisions locked during brainstorm)
1. **Per-site pause only** — the `siteAllowlist` toggle. The user `allowlist` string editor (plan T5) is **out of scope / deferred** to a later branch.
2. **Host detection:** popup learns the current host via a `GET_SITE` round-trip to the content script (never reads `tab.url`). Content-script presence = "supported site"; no reply = hide the toggle. No new permissions (`activeTab`+`storage` only).
3. **Paused indicator:** **badge + popup notice.** Per-tab `⏸` grey badge (mirrors existing `SET_FALLBACK_BADGE`) + a "Scanning paused on <host>" notice in the popup. (This badge piece is a deliberate addition beyond the original `docs/internal/SITE_ALLOWLIST_SPEC.md`.)
4. **Enforcement is DRY:** gate at `scanWithSettings()` so all 5 scan call sites + the injected fetch-fallback inherit the pause; live toggle works with zero listener teardown.
5. **Matching:** exact normalized hostname (lowercase + strip one leading `www.`); no subdomain globbing.

## Done in detail
- **Task 1** — `src/shared/utils/site-match.ts` (pure `normalizeHost`, `isHostExcluded`, `toggleSiteExclusion`) + `tests/unit/site-match.test.ts` (13 tests). Pure, no chrome/DOM deps.
- **Task 2** — content script gate: `isCurrentSiteExcluded()` + `scanWithSettings()` returns `scan('')` (canonical empty result) when excluded. `tests/unit/content-site-exclusion.test.ts` (3 tests, mirrors gate with real helper+engine).

## Remaining work (Tasks 3–7) — exact code is in the plan
- **Task 3** — Add `GET_SITE` + `SET_PAUSED_BADGE` to `MessageType` enum + payload/message types in `src/shared/types/messages.ts`, re-export from `src/shared/types/index.ts`. (model: haiku ok)
- **Task 4** — Background `SET_PAUSED_BADGE` handler in `src/background/index.ts` (mirror the `SET_FALLBACK_BADGE` case ~line 241: `⏸`/`#6c757d` when paused, `updateBadgeForTab(tabId)` when not). New test `tests/unit/paused-badge.test.ts`. (sonnet)
- **Task 5** — Content `src/content/index.ts`: add `notifyPausedState()` (mirror `notifyFallbackActive` ~line 350), call it at end of `initialize()` and inside the `SETTINGS_UPDATED` case after `applySettings`; add a `GET_SITE` case to `handleMessage` returning `{ host: window.location.hostname }`. (sonnet)
- **Task 6** — Popup `src/popup/popup.tsx`: `useEffect` on mount → `chrome.tabs.query({active,currentWindow})` (tab.id only) → `chrome.tabs.sendMessage(GET_SITE)`; render "Pause scanning on <host>" toggle + paused notice after the Sensitivity section (~line 380); toggle calls `updateSetting('siteAllowlist', toggleSiteExclusion(host, list))`. Verify `useEffect` is imported from `preact/hooks`. (sonnet)
- **Task 7** — Docs: `docs/architecture/ARCHITECTURE.md` (~L278 siteAllowlist line), move item TODO→DONE in `docs/internal/EXTENSION_{TODO,DONE}.md`, `docs/STATUS.md` if it enumerates settings.

## Then: final gate + finish
After Task 7, run the validation gate and a final whole-implementation code review, then use superpowers:finishing-a-development-branch.
```
npm run typecheck && npm run lint && npx vitest run && npm run test:corpus && npm run build
```
Manual smoke (reload unpacked): toggle pause on chatgpt.com → badge `⏸`, no modal on a fake `sk-` key, no refresh needed; untoggle → resumes; popup on an unsupported site doesn't error/show the toggle.

## Notes / gotchas
- Implementers occasionally stage `package-lock.json` (a benign `0.1.6→0.1.7` version sync — package.json is already 0.1.7, lockfile was stale). Already committed in 1edfb1a; harmless. Tell implementers to stage only their task's files.
- Tasks 2 & 4 tests are **contract-lock mirrors** (house pattern — module-private content/background fns can't be imported), so they may pass before the production edit. That's intentional; the production wiring is verified by typecheck + the manual smoke gate, not by these unit tests. A regression that removes the gate would NOT fail the unit test — flagged by the Task 2 reviewer as an accepted architectural limitation.
- `lint` has 8 pre-existing `no-console` warnings in background/content — don't add new ones.
- Corpus FP baseline is 3.19% (gate <4%); this feature shouldn't move it.

## To resume
Re-enter subagent-driven-development, set up the TodoWrite (Tasks 3–7 + final review), and dispatch the Task 3 implementer with the full Task 3 text from the plan. Versioning: a Chrome Web Store version bump is NOT part of this branch (already at 0.1.7 unpublished) — decide separately before store upload.
