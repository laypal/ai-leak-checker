# EXT-7.3: User value allowlist UI

**Area:** Extension · popup + modal · **Priority:** P1 · **Status:** 🟡 Partial (code + gate green 2026-09-15; Chrome smoke test pending owner) · **Estimate:** ~4 h
**Requirement:** FR-DET-007 · **Playbook:** read `PLAYBOOK.md` first.

## Why

The engine already filters findings against `Settings.allowlist`, but there is
no UI to add or remove entries. Every false positive a user hits is permanent
friction. This task adds the UI only; the engine side stays as it is.

## Current-state facts (re-verified 2026-09-15 on `main` @ `43f6e6a`)

- `Settings.allowlist: string[]` exists, default `[]`: `src/shared/types/storage.ts:31`.
- It is honoured at scan time: `buildScanOptions()` passes it through at
  `src/shared/detectors/scan-options.ts:42`; the engine filters findings by
  trimmed substring match in `src/shared/detectors/engine.ts` (~line 172).
  Empty entries are already skipped.
- There is **no UI** anywhere to add/remove entries. No cap is enforced.
- The engine matches **plain strings only**. Regex allowlisting is out of
  scope (would be engine work; see EXT-8.2). Import/export belongs to the
  options page (EXT-8.1).

## Deliverables

- [x] `src/shared/utils/allowlist-edit.ts`: pure `addAllowlistEntry(list, raw)`
      (trim, reject empty, reject < 4 chars, dedupe case-sensitively, enforce
      **max 100**) and `removeAllowlistEntry(list, value)`. Return
      `{ ok: true, list } | { ok: false, reason: 'empty' | 'too_short' | 'duplicate' | 'limit' }`.
- [x] Popup Settings tab editor (`src/popup/AllowlistEditor.tsx`): text input + "Add" button + chips with a
      remove ×, persisting via the existing `updateSetting('allowlist', next)`.
      Inline reason text on a rejected add. Count indicator ("37 / 100").
- [x] Modal action "Don't warn about this": adds the finding's value through
      the same path, then dismisses that finding (re-scan or filter in place).

## TDD plan (in order; RED first)

1. `tests/unit/allowlist-edit.test.ts`:
   ```ts
   import { addAllowlistEntry, removeAllowlistEntry } from '@/shared/utils/allowlist-edit';

   it('trims and adds a new entry', () => {
     expect(addAllowlistEntry([], '  sk-test-abc  ')).toEqual({ ok: true, list: ['sk-test-abc'] });
   });
   it('rejects the 101st entry with limit reason', () => {
     const full = Array.from({ length: 100 }, (_, i) => `value-${i}`);
     expect(addAllowlistEntry(full, 'one-more')).toEqual({ ok: false, reason: 'limit' });
   });
   it('rejects empty, whitespace, and entries shorter than 4 chars', () => { /* 'empty' / 'too_short' */ });
   it('rejects duplicates case-sensitively', () => { /* 'duplicate' */ });
   it('removes an entry and leaves others untouched', () => { /* removeAllowlistEntry */ });
   ```
2. Popup editor wired to the helper. Persistence path is already tested; if
   any non-trivial render logic appears, extract it pure and test it.
3. Modal: extend `WarningModalCallbacks` (`src/content/modal.ts:14`) with
   `onAllowlist(finding)`. Test with the `modal.test.ts` pattern
   (`shadowMode: 'open'`): a button exists per finding and fires the callback
   with the right finding.
4. Content side: on `onAllowlist`, send the updated list via `SETTINGS_UPDATE`
   (background already merges) and suppress the finding. Test with the
   injectable-`scanFn` pattern in `tests/unit/content-message-handler.test.ts`.
5. One integration-level assertion through `scanWithSettings`: an allowlisted
   string raises no finding.

## Acceptance criteria (BDD)

- [x] **Given** a string is allowlisted, **When** it appears in a prompt, **Then** no finding is raised for it.
- [x] **Given** 100 entries, **When** adding the 101st, **Then** the UI shows a limit message and storage is unchanged.
- [ ] (manual, pending) **Given** allowlist entries, **When** the browser restarts, **Then** they persist (`chrome.storage.local`; that is the established store for `Settings`).
- [x] **Given** the modal shows a finding, **When** "Don't warn about this" is clicked, **Then** the value lands in the allowlist and that finding no longer blocks submission.

## Do / Don't

- **Do** route every write through `updateSetting` → `SETTINGS_UPDATE`. Never write `chrome.storage` from the popup.
- **Do** mask allowlist values in any console output (`maskValue`). They may *be* secrets.
- **Don't** put the finding value anywhere near `innerHTML`. The new button label is constant; values go through the existing escaped render path.
- **Don't** add regex support, import/export, or an options page here.
- **Don't** log, export, or transmit allowlist entries with stats.

## Verify

Gate (§3 of PLAYBOOK) + manual: add an entry in the popup → type it on
chatgpt.com → no modal; remove it → modal returns, no page refresh needed.

## Shipped 2026-09-15 (branch `feature/ext-7.3-7.6-7.5`)

- Tests: `tests/unit/allowlist-edit.test.ts`, `modal.allowlist.test.ts`,
  `content-allowlist.test.ts` (pure `allowlistTransition` keeps
  `pendingSubmission.findingMeta`/`detectorTypes` in step so a later
  Mask & Continue does not redact the allowlisted value), and a scan-path
  assertion in `scan-options.test.ts`.
- Deviations: `onAllowlist` is optional on `WarningModalCallbacks` (keeps the
  existing modal test constructors compiling). Rejection logs print only the
  detector type, never the value. The content script keeps raw finding values
  in memory only while the modal is open (`currentModalFindings`), cleared on
  every exit path; nothing is persisted.
- Known limitation: engine is substring match, so a 4-char entry suppresses
  every finding containing it. The 4-char floor is a cheap guard, not a fix.
- Remaining: manual Chrome check (add entry in popup → no modal on chatgpt.com;
  remove → modal returns; restart persistence).

## Decision log

- Min entry length 4: a short entry like `abc` would suppress unrelated
  findings by substring. Cheap guard, shown in the UI.
- Store stays `chrome.storage.local` (an older sheet said `sync`; local is
  what `Settings` uses everywhere).
