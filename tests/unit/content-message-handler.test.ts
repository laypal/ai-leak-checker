/**
 * @file content-message-handler.test.ts
 * @description Unit tests for content script window.postMessage handler. Covers
 * scan_request/scan_result flow, validation, and the fix where injected-script
 * scan requests were not handled.
 * @module tests/unit/content-message-handler
 *
 * @dependencies
 * - vitest (describe, it, expect, beforeEach, afterEach, vi)
 * - @/shared/detectors (scan)
 * - @/shared/types (Finding, DetectionResult, DetectorType)
 * - tests/fixtures/ai-leak-checker-scan (payload fixtures)
 *
 * @security
 * - Fixtures use synthetic/safe strings; no real secrets. postMessage tests
 *   assert sanitized payloads (no finding.value) and restricted targetOrigin.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scan } from '@/shared/detectors';
import { DetectorType, type Finding, type DetectionResult } from '@/shared/types';
import {
  aiLeakCheckerScanRequestSensitive,
  aiLeakCheckerScanRequestClean,
  aiLeakCheckerScanRequestGeneric,
  SCAN_MESSAGE_ID_GENERIC,
} from '../fixtures/ai-leak-checker-scan';

const TARGET_ORIGIN = (): string => window.location.origin;

/**
 * Simulate the handleWindowMessage function logic for testing.
 * Mirrors production: sanitized result (hasSensitiveData only, no findings),
 * targetOrigin = window.location.origin.
 */
function simulateHandleWindowMessage(
  event: MessageEvent,
  modal: { show: (findings: Finding[]) => void; hide: () => void } | null,
  onStatsIncrement: (payload: unknown) => void,
  scanFn: (text: string) => DetectionResult = scan
): { responded: boolean; modalShown: boolean } {
  if (event.source !== window) return { responded: false, modalShown: false };
  if (!event.data || typeof event.data !== 'object') return { responded: false, modalShown: false };

  const data = event.data as Record<string, unknown>;
  if (data.type !== 'AI_LEAK_CHECKER') return { responded: false, modalShown: false };
  if (
    data.action !== 'scan_request' ||
    typeof data.messageId !== 'string' ||
    typeof data.content !== 'string'
  ) {
    return { responded: false, modalShown: false };
  }

  const messageId = data.messageId;
  const content = data.content;

  let result: DetectionResult;
  try {
    result = scanFn(content);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    window.postMessage(
      {
        type: 'AI_LEAK_CHECKER',
        action: 'scan_result',
        messageId,
        result: { hasSensitiveData: false, error: errorMessage },
      },
      TARGET_ORIGIN()
    );
    return { responded: true, modalShown: false };
  }

  window.postMessage(
    {
      type: 'AI_LEAK_CHECKER',
      action: 'scan_result',
      messageId,
      result: { hasSensitiveData: result.hasSensitiveData },
    },
    TARGET_ORIGIN()
  );

  if (result.hasSensitiveData && modal) {
    modal.show(result.findings);
    onStatsIncrement({
      field: 'actions.cancelled',
      byDetector: result.summary.byType,
    });
    return { responded: true, modalShown: true };
  }

  return { responded: true, modalShown: false };
}

describe('Content Script Window Message Handler', () => {
  let mockModal: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let mockStatsIncrement: ReturnType<typeof vi.fn>;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockModal = {
      show: vi.fn(),
      hide: vi.fn(),
    };
    mockStatsIncrement = vi.fn();
    postMessageSpy = vi.spyOn(window, 'postMessage');
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Message Validation', () => {
    it('should ignore messages from different source', () => {
      const event = new MessageEvent('message', {
        source: {} as Window,
        data: aiLeakCheckerScanRequestGeneric,
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore messages without data', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: null,
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore messages with wrong type', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'OTHER_TYPE',
          action: 'scan_request',
          messageId: 'test-123',
          content: 'test',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore messages with wrong action', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'other_action',
          messageId: 'test-123',
          content: 'test',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore scan_request when messageId is missing', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          content: 'sk-test1234567890abcdefghijklmnop',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore scan_request when content is missing', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-123',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore scan_request when messageId is not a string', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 42,
          content: 'sk-test1234567890abcdefghijklmnop',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should ignore scan_request when content is not a string', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-123',
          content: { body: 'sk-test1234567890abcdefghijklmnop' },
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(false);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scan Request Handling', () => {
    it('should respond to valid scan_request with scan_result', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: aiLeakCheckerScanRequestGeneric,
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AI_LEAK_CHECKER',
          action: 'scan_result',
          messageId: SCAN_MESSAGE_ID_GENERIC,
          result: expect.objectContaining({
            hasSensitiveData: true,
          }),
        }),
        window.location.origin
      );
    });

    it('should scan content and detect sensitive data', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: aiLeakCheckerScanRequestSensitive,
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(true);
      const callArgs = postMessageSpy.mock.calls[0][0] as { result: { hasSensitiveData: boolean } };
      expect(callArgs.result.hasSensitiveData).toBe(true);
    });

    it('should not show modal for clean content', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: aiLeakCheckerScanRequestClean,
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(false);
      expect(mockModal.show).not.toHaveBeenCalled();
      const callArgs = postMessageSpy.mock.calls[0][0] as { result: { hasSensitiveData: boolean } };
      expect(callArgs.result.hasSensitiveData).toBe(false);
    });

    it('should not show modal if modal instance is null', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          ...aiLeakCheckerScanRequestGeneric,
          messageId: 'test-null',
        },
      });

      const result = simulateHandleWindowMessage(event, null, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(false);
    });

    it('should send hasSensitiveData in scan_result and show modal with findings (no finding values in postMessage)', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: { ...aiLeakCheckerScanRequestGeneric, messageId: 'test-findings' },
      });

      simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      const callArgs = postMessageSpy.mock.calls[0][0] as { result: Record<string, unknown> };
      expect(callArgs.result.hasSensitiveData).toBe(true);
      expect(callArgs.result.findings).toBeUndefined();
      expect(mockModal.show).toHaveBeenCalled();
      const findings = mockModal.show.mock.calls[0][0] as Finding[];
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]).toHaveProperty('type');
    });

    it('should show modal with findings when sensitive data detected', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: { ...aiLeakCheckerScanRequestGeneric, messageId: 'test-modal' },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.modalShown).toBe(true);
      expect(mockModal.show).toHaveBeenCalled();
      const findings = mockModal.show.mock.calls[0][0] as Finding[];
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe(DetectorType.API_KEY_OPENAI);
    });

    it('should send stats increment when sensitive data detected', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: { ...aiLeakCheckerScanRequestGeneric, messageId: 'test-stats' },
      });

      simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(mockStatsIncrement).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'actions.cancelled',
          byDetector: expect.any(Object),
        })
      );
    });
  });

  describe('Message ID Matching', () => {
    it('should include correct messageId in response', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: { ...aiLeakCheckerScanRequestGeneric, messageId: 'unique-message-id-12345' },
      });

      simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      const callArgs = postMessageSpy.mock.calls[0][0] as { messageId: string };
      expect(callArgs.messageId).toBe('unique-message-id-12345');
    });
  });

  describe('Scan error handling', () => {
    it('should catch scan errors, postMessage scan_result with error, return responded true modalShown false, and not call modal or stats', () => {
      const messageId = 'err-msg-1';
      const throwingScan = (_text: string): DetectionResult => {
        throw new Error('scan failed');
      };

      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId,
          content: 'any',
        },
      });

      const result = simulateHandleWindowMessage(
        event,
        mockModal,
        mockStatsIncrement,
        throwingScan
      );

      expect(result).toEqual({ responded: true, modalShown: false });
      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_result',
          messageId,
          result: { hasSensitiveData: false, error: 'scan failed' },
        },
        window.location.origin
      );
      expect(mockModal.show).not.toHaveBeenCalled();
      expect(mockStatsIncrement).not.toHaveBeenCalled();
    });
  });
});
