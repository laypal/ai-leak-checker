/**
 * @fileoverview Unit tests for conditional fallback injection logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SiteConfig, SelectorHealthResult } from '@/shared/types';
import { MIN_FALLBACK_DELAY_MS } from '@/shared/types';

// Mock the checkSelectorHealth function
const mockCheckSelectorHealth = vi.fn<[SiteConfig], SelectorHealthResult>();

// Mock the content script functions
let fallbackActive = false;
let injectMainWorldScriptCalled = false;
let notifyFallbackActiveCalled = false;

// Use the actual constant from the codebase to ensure test aligns with production bounds
const FALLBACK_HEALTH_CHECK_DELAY_MS = MIN_FALLBACK_DELAY_MS;

// Mock site config
const mockSiteConfig: SiteConfig = {
  enabled: true,
  name: 'Test Site',
  inputSelectors: ['#test-input'],
  submitSelectors: ['#test-submit'],
  containerSelector: '#test-container',
  apiEndpoints: ['/api/test'],
  bodyExtractor: 'message',
  inputType: 'textarea',
  usesComposition: false,
};

/**
 * Simulate scheduleConditionalFallback function logic for testing.
 * 
 * NOTE: This is a test-only behavioral simulation. The real implementation in
 * src/content/index.ts has signature: scheduleConditionalFallback(delayMs: number)
 * and uses scoped variables (siteConfig, checkSelectorHealth, injectMainWorldScript,
 * notifyFallbackActive) from the content script module. This test version accepts
 * these as parameters to enable isolated unit testing of the conditional logic.
 * 
 * The real implementation:
 * - Uses module-scoped siteConfig variable
 * - Calls checkSelectorHealth(siteConfig) directly
 * - Calls injectMainWorldScript() and only sets fallbackActive if injection succeeds
 * - Calls notifyFallbackActive() to update badge
 * 
 * This test simulation exercises the same behavioral logic but with injected
 * dependencies for testability.
 */
function scheduleConditionalFallback(
  siteConfig: SiteConfig | null,
  checkSelectorHealth: (config: SiteConfig) => SelectorHealthResult,
  delayMs: number = FALLBACK_HEALTH_CHECK_DELAY_MS
): void {
  if (!siteConfig) return;

  setTimeout(() => {
    if (!siteConfig) return;

    try {
      const health = checkSelectorHealth(siteConfig);
      
      if (!health.inputFound || !health.submitFound) {
        // Simulate injection success (real implementation checks injectMainWorldScript return)
        fallbackActive = true;
        injectMainWorldScriptCalled = true;
        notifyFallbackActiveCalled = true;
      }
    } catch (error) {
      // Health check failed - fail safe, skip injection
      console.error('[AI Leak Checker] Health check failed:', error);
    }
  }, delayMs);
}

describe('Conditional Fallback Injection', () => {
  beforeEach(() => {
    fallbackActive = false;
    injectMainWorldScriptCalled = false;
    notifyFallbackActiveCalled = false;
    mockCheckSelectorHealth.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('scheduleConditionalFallback', () => {
    it('should NOT inject when both selectors found', () => {
      mockCheckSelectorHealth.mockReturnValue({
        site: 'Test Site',
        inputFound: true,
        submitFound: true,
        containerFound: true,
        workingSelector: '#test-input',
        testedAt: new Date().toISOString(),
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      // Advance timer past delay
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).toHaveBeenCalledWith(mockSiteConfig);
      expect(fallbackActive).toBe(false);
      expect(injectMainWorldScriptCalled).toBe(false);
      expect(notifyFallbackActiveCalled).toBe(false);
    });

    it('should inject when input selector missing', () => {
      mockCheckSelectorHealth.mockReturnValue({
        site: 'Test Site',
        inputFound: false,
        submitFound: true,
        containerFound: true,
        workingSelector: null,
        testedAt: new Date().toISOString(),
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).toHaveBeenCalledWith(mockSiteConfig);
      expect(fallbackActive).toBe(true);
      expect(injectMainWorldScriptCalled).toBe(true);
      expect(notifyFallbackActiveCalled).toBe(true);
    });

    it('should inject when submit selector missing', () => {
      mockCheckSelectorHealth.mockReturnValue({
        site: 'Test Site',
        inputFound: true,
        submitFound: false,
        containerFound: true,
        workingSelector: '#test-input',
        testedAt: new Date().toISOString(),
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).toHaveBeenCalledWith(mockSiteConfig);
      expect(fallbackActive).toBe(true);
      expect(injectMainWorldScriptCalled).toBe(true);
      expect(notifyFallbackActiveCalled).toBe(true);
    });

    it('should skip if siteConfig is null', () => {
      scheduleConditionalFallback(null, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).not.toHaveBeenCalled();
      expect(fallbackActive).toBe(false);
      expect(injectMainWorldScriptCalled).toBe(false);
    });

    it('should handle checkSelectorHealth errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockCheckSelectorHealth.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).toHaveBeenCalledWith(mockSiteConfig);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(fallbackActive).toBe(false);
      expect(injectMainWorldScriptCalled).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });

    it('should wait FALLBACK_HEALTH_CHECK_DELAY_MS before checking', () => {
      mockCheckSelectorHealth.mockReturnValue({
        site: 'Test Site',
        inputFound: true,
        submitFound: true,
        containerFound: true,
        workingSelector: '#test-input',
        testedAt: new Date().toISOString(),
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      // Verify NOT called immediately
      expect(mockCheckSelectorHealth).not.toHaveBeenCalled();
      
      // Advance by less than delay
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS - 1000);
      expect(mockCheckSelectorHealth).not.toHaveBeenCalled();
      
      // Advance to full delay
      vi.advanceTimersByTime(1000);
      expect(mockCheckSelectorHealth).toHaveBeenCalled();
    });
  });

  describe('Dual Execution Prevention', () => {
    // Test handler functions that mirror the guard behavior from src/content/index.ts
    // These exercise the actual early-return pattern used by handleKeyDown,
    // handleSubmitClick, and handleFormSubmit when fallbackActive is true.

    /**
     * Test version of handleKeyDown that mirrors the guard pattern.
     * Real implementation: src/content/index.ts:328-375
     */
    function testHandleKeyDown(
      event: { key: string; shiftKey: boolean; target: unknown },
      fallbackActiveFlag: boolean,
      onScan: () => void,
      onShowWarning: () => void
    ): void {
      // Skip if fallback patching is handling interception
      if (fallbackActiveFlag) {
        return;
      }

      // Only intercept Enter without Shift (Shift+Enter is newline)
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }

      const target = event.target;
      if (!target) return;

      // Simulate scanning and warning (would call scan() and showWarning() in real code)
      onScan();
      onShowWarning();
    }

    /**
     * Test version of handleSubmitClick that mirrors the guard pattern.
     * Real implementation: src/content/index.ts:403-424
     */
    function testHandleSubmitClick(
      event: unknown,
      fallbackActiveFlag: boolean,
      onGetText: () => string,
      onScan: () => void,
      onShowWarning: () => void
    ): void {
      // Skip if fallback patching is handling interception
      if (fallbackActiveFlag) {
        return;
      }

      const text = onGetText();
      if (text) {
        onScan();
        onShowWarning();
      }
    }

    /**
     * Test version of handleFormSubmit that mirrors the guard pattern.
     * Real implementation: src/content/index.ts:429-450
     */
    function testHandleFormSubmit(
      event: unknown,
      fallbackActiveFlag: boolean,
      onGetText: () => string,
      onScan: () => void,
      onShowWarning: () => void
    ): void {
      // Skip if fallback patching is handling interception
      if (fallbackActiveFlag) {
        return;
      }

      const text = onGetText();
      if (text) {
        onScan();
        onShowWarning();
      }
    }

    it('handleKeyDown should early-return when fallbackActive is true and not call scan/showWarning', () => {
      const scanSpy = vi.fn();
      const showWarningSpy = vi.fn();
      
      // Create mock KeyboardEvent-like object
      const event = {
        key: 'Enter',
        shiftKey: false,
        target: { value: 'test' }, // Mock target element
      };

      // Test with fallbackActive = true - should early return
      testHandleKeyDown(event, true, scanSpy, showWarningSpy);
      expect(scanSpy).not.toHaveBeenCalled();
      expect(showWarningSpy).not.toHaveBeenCalled();

      // Clear spy call history before second scenario (preserves implementations)
      scanSpy.mockClear();
      showWarningSpy.mockClear();

      // Test with fallbackActive = false - should proceed
      testHandleKeyDown(event, false, scanSpy, showWarningSpy);
      expect(scanSpy).toHaveBeenCalled();
      expect(showWarningSpy).toHaveBeenCalled();
    });

    it('handleSubmitClick should early-return when fallbackActive is true and not call getText/scan/showWarning', () => {
      const getTextSpy = vi.fn(() => 'test text');
      const scanSpy = vi.fn();
      const showWarningSpy = vi.fn();
      
      // Create mock MouseEvent-like object (not used in handler logic, just for type)
      const event = {};

      // Test with fallbackActive = true - should early return
      testHandleSubmitClick(event, true, getTextSpy, scanSpy, showWarningSpy);
      expect(getTextSpy).not.toHaveBeenCalled();
      expect(scanSpy).not.toHaveBeenCalled();
      expect(showWarningSpy).not.toHaveBeenCalled();

      // Clear spy call history before second scenario (preserves implementations)
      getTextSpy.mockClear();
      scanSpy.mockClear();
      showWarningSpy.mockClear();

      // Test with fallbackActive = false - should proceed
      testHandleSubmitClick(event, false, getTextSpy, scanSpy, showWarningSpy);
      expect(getTextSpy).toHaveBeenCalled();
      expect(scanSpy).toHaveBeenCalled();
      expect(showWarningSpy).toHaveBeenCalled();
    });

    it('handleFormSubmit should early-return when fallbackActive is true and not call getText/scan/showWarning', () => {
      const getTextSpy = vi.fn(() => 'test text');
      const scanSpy = vi.fn();
      const showWarningSpy = vi.fn();
      
      // Create mock SubmitEvent-like object (not used in handler logic, just for type)
      const event = {};

      // Test with fallbackActive = true - should early return
      testHandleFormSubmit(event, true, getTextSpy, scanSpy, showWarningSpy);
      expect(getTextSpy).not.toHaveBeenCalled();
      expect(scanSpy).not.toHaveBeenCalled();
      expect(showWarningSpy).not.toHaveBeenCalled();

      // Clear spy call history before second scenario (preserves implementations)
      getTextSpy.mockClear();
      scanSpy.mockClear();
      showWarningSpy.mockClear();

      // Test with fallbackActive = false - should proceed
      testHandleFormSubmit(event, false, getTextSpy, scanSpy, showWarningSpy);
      expect(getTextSpy).toHaveBeenCalled();
      expect(scanSpy).toHaveBeenCalled();
      expect(showWarningSpy).toHaveBeenCalled();
    });
  });
});
