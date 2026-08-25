# EXT-7.7: "Site temporarily unsupported" runtime UX

**Area:** Extension · content + background + popup · **Priority:** P2 · **Status:** 🔲 Not started · **Estimate:** ~4 h
**Carried from:** 7.2 selector health · **Playbook:** read `PLAYBOOK.md` first.

## Why

When every selector fallback fails *and* the fetch-patch fallback is not
confirmed operating, the user gets silence. A security tool failing silently
is the worst outcome.

## Current-state facts (verified 2026-07-12; re-verify)

- Content retries selectors for 32 s (`fallbackDelayMs`, `src/shared/types/storage.ts:62`), then activates the injected fetch/XHR patch and sets a tab-specific ⚠ badge (`SET_FALLBACK_BADGE`; see `tests/unit/badge.test.ts`, `tests/unit/conditional-injection.test.ts`).
- Gap: no state distinguishes "fallback active, still protected" from "nothing attached, unprotected", and the popup surfaces neither.

## Deliverables

- [ ] `src/shared/utils/protection-state.ts`: pure `deriveProtectionState(selectorsFound: boolean, fetchPatchActive: boolean): 'protected' | 'fallback' | 'unsupported'`.
- [ ] Content detects the terminal state and sends a typed `PROTECTION_STATE` message (add to `src/shared/types/messages.ts`).
- [ ] Background stores per-tab state (session-scoped, metadata only) and sets the badge: distinct colour for `unsupported` (red) vs `fallback` (existing ⚠).
- [ ] Popup shows the active tab's state: "Protected" / "Protected via fallback" / "Site UI changed, protection unavailable".

## TDD plan (in order; RED first)

1. `tests/unit/protection-state.test.ts`: the 4-row truth table
   (`true,*` → protected; `false,true` → fallback; `false,false` → unsupported).
2. Content message test via the `content-message-handler.test.ts` pattern: after the retry window with no selectors and no patch confirmation, `PROTECTION_STATE: 'unsupported'` is sent once.
3. Background handler test via the `background-sender.test.ts` chrome-stub pattern: badge text/colour per state; foreign senders rejected.
4. Popup rendering: pure `protectionLabel(state)` + test; wiring manual.

## Acceptance criteria (BDD)

- [ ] **Given** all selectors fail and the fetch patch is blocked, **Then** within `fallbackDelayMs + 5 s` the popup and badge show unsupported.
- [ ] **Given** selectors fail but the fetch patch confirms, **Then** the state is fallback and the existing ⚠ badge behaviour is unchanged.
- [ ] **Given** selectors work, **Then** nothing changes for the user.

## Do / Don't

- **Do** keep the state in memory / `chrome.storage.session`; it is per-tab runtime metadata, not stats.
- **Do** keep the sender gate on the new message.
- **Don't** add any network call ("we're on it" is a static string, not a report).
- **Don't** widen permissions.

## Verify

Gate + manual with a doctored `BUNDLED_SELECTORS` build (break every selector for chatgpt.com, load unpacked, wait 40 s, check badge + popup).
