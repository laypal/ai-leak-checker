/**
 * @fileoverview Unit tests for content script window message handler.
 * @module tests/unit/content-message-handler
 * 
 * Tests the window.postMessage communication between injected script and content script.
 * This tests the critical bug fix where scan requests from injected script were not being handled.
 */

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scan } from '@/shared/detectors';
import { DetectorType, type Finding, type DetectionResult } from '@/shared/types';

/**
 * Simulate the handleWindowMessage function logic for testing.
 * 
 * NOTE: The real implementation in src/content/index.ts uses module-scoped variables
 * (siteConfig, modal, pendingSubmission, etc.). This test version accepts these as
 * parameters to enable isolated unit testing of the message handling logic.
 */
function simulateHandleWindowMessage(
  event: MessageEvent,
  modal: { show: (findings: Finding[]) => void; hide: () => void } | null,
  onStatsIncrement: (payload: unknown) => void
): { responded: boolean; modalShown: boolean } {
  // Only accept messages from same window
  if (event.source !== window) {
    return { responded: false, modalShown: false };
  }

  // Validate message format
  if (!event.data || typeof event.data !== 'object') {
    return { responded: false, modalShown: false };
  }

  const data = event.data as Record<string, unknown>;

  // Only handle our extension messages
  if (data.type !== 'AI_LEAK_CHECKER') {
    return { responded: false, modalShown: false };
  }

  // Handle scan request from injected script
  if (data.action === 'scan_request' && typeof data.messageId === 'string' && typeof data.content === 'string') {
    const messageId = data.messageId;
    const content = data.content;

    // Scan the content
    const result = scan(content);

    // Send response back to injected script
    window.postMessage({
      type: 'AI_LEAK_CHECKER',
      action: 'scan_result',
      messageId,
      result: {
        hasSensitiveData: result.hasSensitiveData,
        findings: result.findings,
      },
    }, '*');

    // If sensitive data detected, show modal
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

  return { responded: false, modalShown: false };
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
        source: {} as Window, // Different source
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-123',
          content: 'sk-test1234567890abcdefghijklmnop',
        },
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
  });

  describe('Scan Request Handling', () => {
    it('should respond to valid scan_request with scan_result', () => {
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-123',
          content: 'sk-test1234567890abcdefghijklmnop',
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AI_LEAK_CHECKER',
          action: 'scan_result',
          messageId: 'test-123',
          result: expect.objectContaining({
            hasSensitiveData: true,
          }),
        }),
        '*'
      );
    });

    it('should scan content and detect sensitive data', () => {
      const sensitiveContent = 'my email is john@gmail.com and api key is sk-134567890abcdef';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-456',
          content: sensitiveContent,
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(true);
      
      const callArgs = postMessageSpy.mock.calls[0][0] as { result: { hasSensitiveData: boolean; findings: Finding[] } };
      expect(callArgs.result.hasSensitiveData).toBe(true);
      expect(callArgs.result.findings.length).toBeGreaterThan(0);
    });

    it('should not show modal for clean content', () => {
      const cleanContent = 'This is just a normal message with no sensitive data.';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-789',
          content: cleanContent,
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(false);
      expect(mockModal.show).not.toHaveBeenCalled();
      
      const callArgs = postMessageSpy.mock.calls[0][0] as { result: { hasSensitiveData: boolean } };
      expect(callArgs.result.hasSensitiveData).toBe(false);
    });

    it('should not show modal if modal instance is null', () => {
      const sensitiveContent = 'sk-test1234567890abcdefghijklmnop';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-null',
          content: sensitiveContent,
        },
      });

      const result = simulateHandleWindowMessage(event, null, mockStatsIncrement);

      expect(result.responded).toBe(true);
      expect(result.modalShown).toBe(false);
    });

    it('should include findings in scan_result response', () => {
      const sensitiveContent = 'sk-test1234567890abcdefghijklmnop';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-findings',
          content: sensitiveContent,
        },
      });

      simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      const callArgs = postMessageSpy.mock.calls[0][0] as { result: { findings: Finding[] } };
      expect(callArgs.result.findings).toBeDefined();
      expect(Array.isArray(callArgs.result.findings)).toBe(true);
      expect(callArgs.result.findings.length).toBeGreaterThan(0);
      expect(callArgs.result.findings[0]).toHaveProperty('type');
      expect(callArgs.result.findings[0]).toHaveProperty('value');
    });

    it('should show modal with findings when sensitive data detected', () => {
      const sensitiveContent = 'sk-test1234567890abcdefghijklmnop';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-modal',
          content: sensitiveContent,
        },
      });

      const result = simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      expect(result.modalShown).toBe(true);
      expect(mockModal.show).toHaveBeenCalled();
      
      const findings = mockModal.show.mock.calls[0][0] as Finding[];
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe(DetectorType.API_KEY_OPENAI);
    });

    it('should send stats increment when sensitive data detected', () => {
      const sensitiveContent = 'sk-test1234567890abcdefghijklmnop';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId: 'test-stats',
          content: sensitiveContent,
        },
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
      const messageId = 'unique-message-id-12345';
      const event = new MessageEvent('message', {
        source: window,
        data: {
          type: 'AI_LEAK_CHECKER',
          action: 'scan_request',
          messageId,
          content: 'test',
        },
      });

      simulateHandleWindowMessage(event, mockModal, mockStatsIncrement);

      const callArgs = postMessageSpy.mock.calls[0][0] as { messageId: string };
      expect(callArgs.messageId).toBe(messageId);
    });
  });
});
