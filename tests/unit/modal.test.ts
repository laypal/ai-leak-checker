/**
 * @file modal.test.ts
 * @description Unit tests for the WarningModal component: visibility, re-show
 * after hide, callbacks, and rapid show/hide cycles.
 * @module tests/unit/modal
 *
 * @dependencies
 * - vitest (describe, it, expect, beforeEach, afterEach, vi)
 * - jsdom (@vitest-environment)
 * - @/content/modal (WarningModal)
 * - @/shared/types (Finding, DetectorType)
 *
 * @security
 * - Finding values use placeholders (e.g. GITHUB_TOKEN_PLACEHOLDER) to avoid
 *   real-looking secrets in tests.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WarningModal, type WarningModalCallbacks } from '@/content/modal';
import { DetectorType, type Finding } from '@/shared/types';

describe('WarningModal', () => {
  let modal: WarningModal;
  let callbacks: WarningModalCallbacks;
  let mockOnContinue: ReturnType<typeof vi.fn>;
  let mockOnSendAnyway: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create mock callbacks
    mockOnContinue = vi.fn();
    mockOnSendAnyway = vi.fn();
    mockOnCancel = vi.fn();
    
    callbacks = {
      onContinue: mockOnContinue,
      onSendAnyway: mockOnSendAnyway,
      onCancel: mockOnCancel,
    };
    
    modal = new WarningModal(callbacks, { shadowMode: 'open' });
  });

  afterEach(() => {
    // Cleanup
    if (modal) {
      modal.hide();
    }
    document.body.innerHTML = '';
  });

  describe('Modal Re-showing', () => {
    it('should show modal when not visible', () => {
      const findings: Finding[] = [
        {
          type: DetectorType.API_KEY_OPENAI,
          value: 'sk-test1234567890abcdefghijklmnop',
          start: 0,
          end: 35,
          confidence: 0.95,
        },
      ];

      modal.show(findings);

      const container = document.getElementById('ai-leak-checker-modal');
      expect(container).toBeTruthy();
      expect(container?.style.display).toBe('block');
    });

    it('should hide and re-show modal when already visible', () => {
      const findings1: Finding[] = [
        {
          type: DetectorType.API_KEY_OPENAI,
          value: 'sk-test1234567890abcdefghijklmnop',
          start: 0,
          end: 35,
          confidence: 0.95,
        },
      ];

      const findings2: Finding[] = [
        {
          type: DetectorType.API_KEY_GITHUB,
          value: 'GITHUB_TOKEN_PLACEHOLDER',
          start: 0,
          end: 23,
          confidence: 0.98,
        },
      ];

      // Show modal first time
      modal.show(findings1);
      const container = document.getElementById('ai-leak-checker-modal');
      expect(container?.style.display).toBe('block');

      // Show modal again (should hide first, then show with new findings)
      // The hide() call should be implicit in show() when already visible
      modal.show(findings2);
      
      // Modal should still be visible with new content
      expect(container?.style.display).toBe('block');
      
      // Test uses shadowMode: 'open' (see modal instantiation), so container.shadowRoot is accessible
      expect(container).toBeTruthy();
    });

    it('should allow multiple show/hide cycles', () => {
      const findings: Finding[] = [
        {
          type: DetectorType.API_KEY_OPENAI,
          value: 'sk-test1234567890abcdefghijklmnop',
          start: 0,
          end: 35,
          confidence: 0.95,
        },
      ];

      // Show -> Hide -> Show cycle
      modal.show(findings);
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('block');

      modal.hide();
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('none');

      modal.show(findings);
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('block');
    });

    it('should handle rapid show calls correctly', () => {
      const findings1: Finding[] = [
        {
          type: DetectorType.API_KEY_OPENAI,
          value: 'sk-test1234567890abcdefghijklmnop',
          start: 0,
          end: 35,
          confidence: 0.95,
        },
      ];

      const findings2: Finding[] = [
        {
          type: DetectorType.EMAIL,
          value: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 0.8,
        },
      ];

      // Rapid successive calls
      modal.show(findings1);
      modal.show(findings2);
      modal.show(findings1);

      const container = document.getElementById('ai-leak-checker-modal');
      expect(container?.style.display).toBe('block');
    });
  });

  describe('Modal Visibility State', () => {
    it('should track visibility state correctly', () => {
      const findings: Finding[] = [
        {
          type: DetectorType.API_KEY_OPENAI,
          value: 'sk-test1234567890abcdefghijklmnop',
          start: 0,
          end: 35,
          confidence: 0.95,
        },
      ];

      // Initially hidden
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('none');

      modal.show(findings);
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('block');

      modal.hide();
      expect(document.getElementById('ai-leak-checker-modal')?.style.display).toBe('none');
    });
  });

  describe('Modal Callbacks', () => {
    const defaultFindings: Finding[] = [
      {
        type: DetectorType.API_KEY_OPENAI,
        value: 'sk-test1234567890abcdefghijklmnop',
        start: 0,
        end: 35,
        confidence: 0.95,
      },
    ];

    it('should call onCancel when cancel button clicked', () => {
      modal.show(defaultFindings);

      const container = document.getElementById('ai-leak-checker-modal') as HTMLElement;
      const sr = container.shadowRoot;
      expect(sr).toBeTruthy();
      const cancelBtn = sr!.querySelector('.cancel-btn') as HTMLButtonElement;
      expect(cancelBtn).toBeTruthy();
      cancelBtn.click();
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onContinue when redact button clicked', () => {
      modal.show(defaultFindings);

      const container = document.getElementById('ai-leak-checker-modal') as HTMLElement;
      const sr = container.shadowRoot;
      expect(sr).toBeTruthy();
      const redactBtn = sr!.querySelector('.redact-btn') as HTMLButtonElement;
      expect(redactBtn).toBeTruthy();
      redactBtn.click();
      expect(mockOnContinue).toHaveBeenCalled();
    });

    it('should call onSendAnyway when send button clicked', () => {
      modal.show(defaultFindings);

      const container = document.getElementById('ai-leak-checker-modal') as HTMLElement;
      const sr = container.shadowRoot;
      expect(sr).toBeTruthy();
      const sendBtn = sr!.querySelector('.send-btn') as HTMLButtonElement;
      expect(sendBtn).toBeTruthy();
      sendBtn.click();
      expect(mockOnSendAnyway).toHaveBeenCalled();
    });
  });
});
