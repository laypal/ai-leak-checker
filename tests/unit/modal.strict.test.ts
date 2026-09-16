/**
 * @file modal.strict.test.ts
 * @description Unit tests for strict-mode rendering: "Send Anyway" and its
 * caption are omitted, a strict notice is shown, and Escape still cancels
 * without ever invoking onSendAnyway.
 * @module tests/unit/modal.strict
 *
 * @dependencies
 * - vitest (describe, it, expect, beforeEach, afterEach, vi)
 * - jsdom (@vitest-environment)
 * - @/content/modal (WarningModal)
 * - @/shared/types (Finding, DetectorType)
 *
 * @security
 * - Finding values use a synthetic `sk-test...` OpenAI-shaped fixture to
 *   avoid real-looking secrets in tests.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WarningModal, type WarningModalCallbacks } from '@/content/modal';
import { DetectorType, type Finding } from '@/shared/types';

describe('WarningModal strict mode', () => {
  let modal: WarningModal;
  let callbacks: WarningModalCallbacks;
  let mockOnSendAnyway: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  const findings: Finding[] = [
    {
      type: DetectorType.API_KEY_OPENAI,
      value: 'sk-test1234567890abcdefghijklmnop',
      start: 0,
      end: 35,
      confidence: 0.95,
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    mockOnSendAnyway = vi.fn();
    mockOnCancel = vi.fn();
    callbacks = {
      onContinue: vi.fn(),
      onSendAnyway: mockOnSendAnyway,
      onCancel: mockOnCancel,
    };
    modal = new WarningModal(callbacks, { shadowMode: 'open' });
  });

  afterEach(() => {
    modal.hide();
    document.body.innerHTML = '';
  });

  function getShadowRoot(): ShadowRoot {
    const container = document.getElementById('ai-leak-checker-modal');
    if (!container?.shadowRoot) throw new Error('modal shadow root not found');
    return container.shadowRoot;
  }

  it('omits Send Anyway and its warning, shows the strict notice, keeps other buttons', () => {
    modal.show(findings, { strictMode: true });
    const sr = getShadowRoot();

    expect(sr.querySelector('.send-btn')).toBeNull();
    expect(sr.querySelector('.send-anyway-warning')).toBeNull();
    expect(sr.querySelector('.strict-notice')).toBeTruthy();
    expect(sr.querySelector('.redact-btn')).toBeTruthy();
    expect(sr.querySelector('.cancel-btn')).toBeTruthy();
  });

  it('default show() (non-strict) still renders Send Anyway and no strict notice', () => {
    modal.show(findings);
    const sr = getShadowRoot();

    expect(sr.querySelector('.send-btn')).toBeTruthy();
    expect(sr.querySelector('.strict-notice')).toBeNull();
  });

  it('re-renders per call: strict then non-strict then strict again', () => {
    modal.show(findings, { strictMode: true });
    modal.hide();
    modal.show(findings);
    expect(getShadowRoot().querySelector('.send-btn')).toBeTruthy();

    modal.hide();
    modal.show(findings, { strictMode: true });
    expect(getShadowRoot().querySelector('.send-btn')).toBeNull();
  });

  it('in-place update (no hide): strict then non-strict shows Send Anyway again', () => {
    modal.show(findings, { strictMode: true });
    expect(getShadowRoot().querySelector('.send-btn')).toBeNull();

    // No hide() between calls - exercises the in-place update branch used
    // by handleAllowlist's re-show of remaining findings.
    modal.show(findings);

    expect(getShadowRoot().querySelector('.send-btn')).toBeTruthy();
    expect(getShadowRoot().querySelector('.strict-notice')).toBeNull();
  });

  it('in-place update (no hide): non-strict then strict hides Send Anyway', () => {
    modal.show(findings);
    expect(getShadowRoot().querySelector('.send-btn')).toBeTruthy();

    // No hide() between calls.
    modal.show(findings, { strictMode: true });

    expect(getShadowRoot().querySelector('.send-btn')).toBeNull();
    expect(getShadowRoot().querySelector('.strict-notice')).toBeTruthy();
  });

  it('Escape cancels and never calls onSendAnyway while strict', () => {
    modal.show(findings, { strictMode: true });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnSendAnyway).not.toHaveBeenCalled();
  });
});
