# EXT-7.5: Strict mode (block without override)

**Area:** Extension · modal + content · **Priority:** P1 · **Status:** 🔲 Not started · **Estimate:** ~3 h · *(Pro hook, ships ungated for now)*
**Requirement:** FR-CFG-004 · **Playbook:** read `PLAYBOOK.md` first.

## Why

The popup already has a Strict Mode toggle that persists `settings.strictMode`
through the standard broadcast path, but nothing consumes it. The modal always
renders "Send Anyway". A visible toggle that does nothing is worse than no
toggle.

## Current-state facts (verified 2026-07-12; re-verify)

- Popup toggle: `src/popup/popup.tsx:516-523` ("Strict Mode (no bypass option)").
- `Settings.strictMode: boolean`, default `false`: `src/shared/types/storage.ts:28`.
- Modal: `new WarningModal(callbacks, options?)`; `show(findings: Finding[])` at `src/content/modal.ts:56`. Buttons come from a template: `.redact-btn` (Mask & Continue → `onContinue`), `.send-btn` (Send Anyway → `onSendAnyway`, hardcoded at `modal.ts:381`), `.cancel-btn` (→ `onCancel`), wired in `attachHandlers` (`modal.ts:430-433`). A `.send-anyway-warning` paragraph accompanies the button.
- Content holds live settings (`currentSettings`) at every `modal.show(...)` call site.

## Deliverables

- [ ] `show(findings, opts?: { strictMode?: boolean })`. When strict: omit `.send-btn` **and** `.send-anyway-warning` from the rendered template; `attachHandlers` tolerates the missing button.
- [ ] Content passes `currentSettings.strictMode` at every `show` call site. Escape still cancels. No code path calls `callbacks.onSendAnyway()` while strict.
- [ ] Modal heading strip indicates strict mode ("Strict mode: sending blocked until masked"). Constant string.
- [ ] Popup toggle gets a one-line explainer under the label.

## TDD plan (in order; RED first)

1. `tests/unit/modal.strict.test.ts` (`@vitest-environment jsdom`):
   ```ts
   import { WarningModal } from '@/content/modal';

   it('omits Send Anyway when strictMode is on', () => {
     const modal = new WarningModal(callbacks, { shadowMode: 'open' });
     modal.show(findings, { strictMode: true });
     const shadow = document.getElementById('ai-leak-checker-modal')!.shadowRoot!;
     expect(shadow.querySelector('.send-btn')).toBeNull();
     expect(shadow.querySelector('.send-anyway-warning')).toBeNull();
     expect(shadow.querySelector('.redact-btn')).not.toBeNull();
     expect(shadow.querySelector('.cancel-btn')).not.toBeNull();
   });
   it('renders Send Anyway when strictMode is off (regression)', () => { /* default show() */ });
   it('re-show with a different strictMode re-renders correctly', () => { /* strict → hide → non-strict */ });
   ```
2. Implement the conditional template + the guard in `attachHandlers`.
3. Content wiring test via the `content-message-handler.test.ts` pattern: after `applySettings({ strictMode: true })` the modal-show pathway receives `strictMode: true`; flip live and assert the next show is non-strict.

## Acceptance criteria (BDD)

- [ ] **Given** strict mode on, **When** the modal opens, **Then** "Send Anyway" is absent and no interaction path submits unmasked (Enter/submit stays blocked until Mask or Cancel).
- [ ] **Given** the toggle changes while a tab is open, **When** the next detection fires, **Then** the modal reflects the new mode without reload.
- [ ] **Given** strict mode off, **Then** behaviour is identical to today (existing modal tests stay green).

## Do / Don't

- **Do** rebuild the template per `show()`; never cache `strictMode` in the modal instance beyond the current show.
- **Do** keep the `send-anyway-warning` copy tied to the button; both disappear together.
- **Don't** add a licensing gate here (EXT-9.x).
- **Don't** touch storage or messaging; the setting already flows.

## Verify

Gate + manual: toggle strict in popup → trigger a detection on chatgpt.com → only Mask/Cancel offered; untoggle → Send Anyway returns.

## Decision log

- `show(findings, opts)` over a `setStrictMode()` setter: stateless and testable.
