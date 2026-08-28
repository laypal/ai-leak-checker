# EXT-SEC-1: Pre-release security minors closed

**Area:** Extension · background + injected · **Priority:** P1 · **Status:** ✅ Done 2026-06-07 · ships in unpublished 0.1.7

## Outcome

- Background rejects messages where `sender.id !== chrome.runtime.id` (exported pure `isTrustedSender()`; foreign senders get `{ error: 'Unauthorized' }` before any work). Test: `tests/unit/background-sender.test.ts`.
- Injected script posts with `window.location.origin` as `targetOrigin`, not `'*'`.

## Follow-on

- Users get this only when EXT-REL-1 publishes 0.1.7.
