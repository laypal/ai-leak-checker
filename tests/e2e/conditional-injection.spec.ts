/**
 * @fileoverview E2E tests for conditional fallback injection.
 */

import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { setupTestPage } from './helpers';
import { ExtensionHelper } from './fixtures/extension';
import { DEFAULT_SETTINGS, MIN_FALLBACK_DELAY_MS, MAX_FALLBACK_DELAY_MS } from '@/shared/types';

/**
 * Test timeout constant: fallback delay + buffer for health check.
 * Uses test override if available (TEST_FALLBACK_DELAY_MS env var) or system default.
 * Clamped to production bounds (MIN_FALLBACK_DELAY_MS to MAX_FALLBACK_DELAY_MS).
 */
const TEST_FALLBACK_DELAY_MS = (() => {
  const envValue = process.env.TEST_FALLBACK_DELAY_MS?.trim();
  if (!envValue) {
    return DEFAULT_SETTINGS.fallbackDelayMs;
  }
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SETTINGS.fallbackDelayMs;
  }
  return Math.min(MAX_FALLBACK_DELAY_MS, Math.max(MIN_FALLBACK_DELAY_MS, parsed));
})();
const FALLBACK_DELAY_WITH_BUFFER_MS = TEST_FALLBACK_DELAY_MS + 2000;

/**
 * Create a mock AI page with optional selectors.
 */
function createMockAIPageHTML(
  options: { includeTextarea?: boolean; includeSubmitButton?: boolean } = {}
): string {
  const { includeTextarea = true, includeSubmitButton = true } = options;
  
  const textarea = includeTextarea
    ? '<textarea id="prompt-textarea" placeholder="Type your message here..." data-id="root"></textarea>'
    : '<!-- No textarea element -->';
  
  const submitButton = includeSubmitButton
    ? '<button type="submit" data-testid="send-button">Send</button>'
    : '<!-- No submit button -->';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Chat Test Page</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    #prompt-textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
    }
    button[data-testid="send-button"] {
      margin-top: 12px;
      padding: 10px 20px;
      background: #10a37f;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
  </style>
</head>
<body data-ai-leak-checker-test="true">
  <h1>AI Chat Test Page</h1>
  <form id="chat-form">
    ${textarea}
    ${submitButton}
  </form>
</body>
</html>
  `;
}

/**
 * Helper function to wait for extension load and skip test if not loaded.
 */
async function skipIfExtensionNotLoaded(context: BrowserContext): Promise<void> {
  const extension = new ExtensionHelper(context);
  const loaded = await extension.waitForLoad();
  if (!loaded) {
    test.skip();
  }
}

test.describe('Conditional Fallback Injection', () => {
  test('should NOT inject when selectors work', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create mock page WITH valid selectors
    const html = createMockAIPageHTML({
      includeTextarea: true,
      includeSubmitButton: true,
    });
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for health check period (full delay) before checking injection status
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Verify injected.js was NOT loaded
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(false);
  });

  test('should inject when selectors fail', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create mock page WITHOUT matching selectors
    const html = createMockAIPageHTML({
      includeTextarea: false,  // No input element
      includeSubmitButton: false,
    });
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for health check (fallback delay + buffer)
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Verify injected.js WAS loaded
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(true);
  });

  test('should inject when only input selector fails', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create mock page with submit button but no textarea
    const html = createMockAIPageHTML({
      includeTextarea: false,
      includeSubmitButton: true,
    });
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for health check (fallback delay + buffer)
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Verify injected.js WAS loaded (input selector missing)
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(true);
  });

  test('should inject when only submit selector fails', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create mock page with textarea but no submit button
    const html = createMockAIPageHTML({
      includeTextarea: true,
      includeSubmitButton: false,
    });
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for health check (fallback delay + buffer)
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Verify injected.js WAS loaded (submit selector missing)
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(true);
  });

  test('DOM events should be skipped when fallback active', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create page without selectors (triggers fallback)
    const html = createMockAIPageHTML({
      includeTextarea: false,
      includeSubmitButton: false,
    });
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for fallback activation
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Verify fallback is active
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(true);

    // Now add elements dynamically (simulating late load)
    await page.evaluate(() => {
      const textarea = document.createElement('textarea');
      textarea.id = 'prompt-textarea';
      textarea.setAttribute('data-id', 'root');
      document.querySelector('form')?.appendChild(textarea);
    });

    // Type sensitive data
    await page.fill('#prompt-textarea', 'sk-test-1234567890abcdefghijklmnop');
    await page.keyboard.press('Enter');

    // Verify DOM handler did NOT show modal (fallback handles it)
    // Note: In fallback mode, fetch patching intercepts, so modal may not appear
    // This test verifies that DOM handlers are skipped
    const modal = page.locator('#ai-leak-checker-modal');
    // Modal should not be visible because fallbackActive flag prevents DOM handlers
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should detect false negative (hidden element matches selector)', async ({ page, context }) => {
    await skipIfExtensionNotLoaded(context);

    // Create page with hidden textarea matching selector
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Chat Test Page</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
  </style>
</head>
<body data-ai-leak-checker-test="true">
  <h1>AI Chat Test Page</h1>
  <form id="chat-form">
    <textarea id="prompt-textarea" style="display: none;">Hidden</textarea>
    <button type="submit" data-testid="send-button">Send</button>
  </form>
</body>
</html>
    `;
    
    await setupTestPage(page, 'chatgpt.com', html);

    // Wait for health check (fallback delay + buffer)
    await page.waitForTimeout(FALLBACK_DELAY_WITH_BUFFER_MS);

    // Should activate fallback (hidden element not usable)
    const isInjected = await page.evaluate(() => {
      return (window as any).__aiLeakCheckerInjected === true;
    });
    expect(isInjected).toBe(true);
  });
});
