/**
 * @file modal.allowlist.test.ts
 * @description Unit tests for the modal's "Don't warn about this" per-finding
 * allowlist button: one button per finding, clicking fires onAllowlist with
 * the correct finding, and the finding's raw value never appears inside any
 * button's HTML (the button label is a constant string).
 * @module tests/unit/modal.allowlist
 *
 * @dependencies
 * - vitest (describe, it, expect, beforeEach, afterEach, vi)
 * - jsdom (@vitest-environment)
 * - @/content/modal (WarningModal)
 * - @/shared/types (Finding, DetectorType)
 *
 * @security
 * - Finding values use placeholders (e.g. AKIAIOSFODNN7EXAMPLE) to avoid
 *   real-looking secrets in tests.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WarningModal, type WarningModalCallbacks } from '@/content/modal';
import { DetectorType, type Finding } from '@/shared/types';

describe('WarningModal allowlist button', () => {
  let modal: WarningModal;
  let callbacks: WarningModalCallbacks;
  let mockOnAllowlist: ReturnType<typeof vi.fn>;

  const findings: Finding[] = [
    {
      type: DetectorType.API_KEY_AWS,
      value: 'AKIAIOSFODNN7EXAMPLE',
      start: 0,
      end: 20,
      confidence: 0.95,
    },
    {
      type: DetectorType.EMAIL,
      value: 'jane.doe@example.com',
      start: 21,
      end: 42,
      confidence: 0.9,
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    mockOnAllowlist = vi.fn();
    callbacks = {
      onContinue: vi.fn(),
      onSendAnyway: vi.fn(),
      onCancel: vi.fn(),
      onAllowlist: mockOnAllowlist,
    };
    modal = new WarningModal(callbacks, { shadowMode: 'open' });
    modal.show(findings);
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

  it('renders one allowlist button per finding', () => {
    const buttons = getShadowRoot().querySelectorAll('.allowlist-btn');
    expect(buttons.length).toBe(findings.length);
  });

  it('clicking the second button fires onAllowlist with the second finding', () => {
    const buttons = getShadowRoot().querySelectorAll('.allowlist-btn');
    (buttons[1] as HTMLButtonElement).click();

    expect(mockOnAllowlist).toHaveBeenCalledTimes(1);
    expect(mockOnAllowlist).toHaveBeenCalledWith(findings[1]);
  });

  it('never embeds the finding value inside any button HTML', () => {
    const buttons = getShadowRoot().querySelectorAll('.allowlist-btn');
    for (const btn of buttons) {
      expect(btn.innerHTML).not.toContain(findings[0].value);
      expect(btn.innerHTML).not.toContain(findings[1].value);
    }
  });
});
