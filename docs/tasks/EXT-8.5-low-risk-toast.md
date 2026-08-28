# EXT-8.5: Low-risk toast notifications

**Area:** Extension · content UI · **Priority:** P2 · **Status:** 🔲 Not started · **Estimate:** ~4 h
**Playbook:** read `PLAYBOOK.md` first.

## Why

Findings whose **max confidence < 0.5** currently open the full blocking
modal. A non-blocking corner toast ("Possible sensitive data. View details")
is less noisy; "View details" opens the standard modal.

## Deliverables

- [ ] `src/shared/utils/detection-ux.ts`: pure `routeDetectionUx(findings): 'modal' | 'toast' | 'none'`.
- [ ] `src/content/toast.ts`: `Toast` class mirroring `WarningModal`'s shadow-DOM structure and `shadowMode: 'open'` test hook; auto-dismiss after 8 s; "View details" calls back into the modal.
- [ ] Content: route through `routeDetectionUx` at every detection site.

## TDD plan (in order; RED first)

1. `tests/unit/detection-ux.test.ts`: exactly 0.5 → modal; all < 0.5 → toast; any ≥ 0.5 → modal; empty → none.
2. `tests/unit/toast.test.ts` (jsdom): renders in an open shadow root; auto-dismisses with `vi.useFakeTimers()`; "View details" fires the callback.
3. Content wiring test via the injectable-`scanFn` pattern.

## Acceptance criteria (BDD)

- [ ] **Given** only low-confidence findings, **When** the user submits, **Then** a toast shows, submission proceeds, and "View details" opens the modal with the same findings.
- [ ] **Given** any finding ≥ 0.5, **Then** the modal shows exactly as today.

## Do / Don't

- **Do** fail closed: any doubt → modal.
- **Do** build the toast with DOM APIs + `textContent`; no `innerHTML` with finding data.
- **Don't** suppress the modal for high-confidence findings under any path.

## Verify

Gate + manual with a low-confidence sample (a lone high-entropy string without context keywords).
