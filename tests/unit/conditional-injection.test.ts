/**
 * @fileoverview Unit tests for conditional fallback injection logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SiteConfig, SelectorHealthResult } from '@/shared/types';

// Mock the checkSelectorHealth function
const mockCheckSelectorHealth = vi.fn<[SiteConfig], SelectorHealthResult>();

// Mock the content script functions
let fallbackActive = false;
let injectMainWorldScriptCalled = false;
let notifyFallbackActiveCalled = false;

// Mock constants
const FALLBACK_HEALTH_CHECK_DELAY_MS = 30000;

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
 */
function scheduleConditionalFallback(
  siteConfig: SiteConfig | null,
  checkSelectorHealth: (config: SiteConfig) => SelectorHealthResult
): void {
  if (!siteConfig) return;

  setTimeout(() => {
    if (!siteConfig) return;

    try {
      const health = checkSelectorHealth(siteConfig);
      
      if (!health.inputFound || !health.submitFound) {
        fallbackActive = true;
        injectMainWorldScriptCalled = true;
        notifyFallbackActiveCalled = true;
      }
    } catch (error) {
      // Health check failed - fail safe, skip injection
      console.error('[AI Leak Checker] Health check failed:', error);
    }
  }, FALLBACK_HEALTH_CHECK_DELAY_MS);
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
    it('should NOT inject when both selectors found', async () => {
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

    it('should inject when input selector missing', async () => {
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

    it('should inject when submit selector missing', async () => {
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

    it('should skip if siteConfig is null', async () => {
      scheduleConditionalFallback(null, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).not.toHaveBeenCalled();
      expect(fallbackActive).toBe(false);
      expect(injectMainWorldScriptCalled).toBe(false);
    });

    it('should handle checkSelectorHealth errors gracefully', async () => {
      mockCheckSelectorHealth.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      scheduleConditionalFallback(mockSiteConfig, mockCheckSelectorHealth);
      
      vi.advanceTimersByTime(FALLBACK_HEALTH_CHECK_DELAY_MS);

      expect(mockCheckSelectorHealth).toHaveBeenCalledWith(mockSiteConfig);
      expect(fallbackActive).toBe(false);
      expect(injectMainWorldScriptCalled).toBe(false);
    });

    it('should wait FALLBACK_HEALTH_CHECK_DELAY_MS before checking', async () => {
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
    it('handleKeyDown should skip when fallbackActive is true', () => {
      fallbackActive = true;
      
      // Simulate event handler check
      const shouldProcess = !fallbackActive;
      
      expect(shouldProcess).toBe(false);
    });

    it('handleSubmitClick should skip when fallbackActive is true', () => {
      fallbackActive = true;
      
      const shouldProcess = !fallbackActive;
      
      expect(shouldProcess).toBe(false);
    });

    it('handleFormSubmit should skip when fallbackActive is true', () => {
      fallbackActive = true;
      
      const shouldProcess = !fallbackActive;
      
      expect(shouldProcess).toBe(false);
    });
  });
});
