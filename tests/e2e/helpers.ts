/**
 * @fileoverview E2E test helpers and utilities.
 */

import type { Page } from '@playwright/test';
import path from 'path';

/**
 * Get the extension ID from Chrome.
 */
export async function getExtensionId(page: Page): Promise<string> {
  // Navigate to extensions page to find extension ID
  await page.goto('chrome://extensions');
  await page.waitForLoadState('domcontentloaded');
  
  // Enable developer mode if needed (this is tricky in automation)
  // For now, assume extension is already loaded
  // Extension ID is typically found via chrome.runtime.id or from extension details
  
  // Alternative: load extension programmatically and get ID
  return 'mock-extension-id'; // Will be replaced with actual ID
}

/**
 * Create a test HTML page with textarea for testing.
 */
export function createTestPageHTML(hostname: string = 'chat.openai.com'): string {
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
    button[data-testid="send-button"]:hover {
      background: #0d8d6e;
    }
  </style>
</head>
<body data-ai-leak-checker-test="true">
  <h1>AI Chat Test Page</h1>
  <form id="chat-form">
    <textarea
      id="prompt-textarea"
      placeholder="Type your message here..."
      data-id="root"
    ></textarea>
    <button type="submit" data-testid="send-button">Send</button>
  </form>
</body>
</html>
  `;
}

/**
 * Set up a page with test HTML using route interception.
 * This ensures the URL matches manifest content script patterns,
 * allowing the extension to inject content scripts.
 * 
 * @param page Playwright page instance
 * @param hostname Hostname to use for the URL (must match manifest pattern)
 * @param html HTML content to serve
 */
export async function setupTestPage(
  page: Page,
  hostname: string = 'chat.openai.com',
  html?: string
): Promise<void> {
  const testHTML = html || createTestPageHTML(hostname);
  
  // Intercept requests to matching URL and serve test HTML
  // This ensures the URL matches the manifest pattern so content scripts inject
  await page.route(`https://${hostname}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: testHTML,
    });
  });
  
  // Navigate to a URL that matches the manifest pattern
  // The route interceptor will serve our test HTML
  await page.goto(`https://${hostname}/test`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Wait for the extension to initialize on a page.
 */
export async function waitForExtensionInit(page: Page, timeout = 5000): Promise<void> {
  // Check for extension initialization log
  const logPromise = page.waitForFunction(
    () => {
      // Check if content script has initialized
      return (window as any).__aiLeakCheckerInitialized === true;
    },
    { timeout }
  ).catch(() => {
    // Extension may not set this flag, continue anyway
  });

  // Also wait a bit for DOM to settle
  await page.waitForTimeout(1000);
  await logPromise;
}

/**
 * Wait for modal to appear.
 */
export async function waitForModal(page: Page, timeout = 5000): Promise<void> {
  // Modal is in shadow DOM, so we need to check for the container
  await page.waitForSelector('#ai-leak-checker-modal', { 
    state: 'visible',
    timeout 
  });
}

/**
 * Check if modal is visible.
 */
export async function isModalVisible(page: Page): Promise<boolean> {
  const modal = await page.locator('#ai-leak-checker-modal').first();
  if (!(await modal.count())) {
    return false;
  }
  
  // Check if modal container is visible (it has inline style)
  const display = await modal.evaluate((el) => {
    return window.getComputedStyle(el).display;
  });
  
  return display !== 'none';
}

/**
 * Click modal button by class name.
 * Uses test-only API exposed by modal (only available in test environments).
 */
export async function clickModalButton(
  page: Page,
  buttonClass: 'cancel-btn' | 'redact-btn' | 'send-btn'
): Promise<void> {
  await page.evaluate((className) => {
    const testAPI = (window as unknown as { __aiLeakCheckerTestAPI?: { clickButton: (className: string) => void } }).__aiLeakCheckerTestAPI;
    if (!testAPI) {
      throw new Error('Test API not found - modal may not be initialized or not in test environment');
    }
    testAPI.clickButton(className as 'cancel-btn' | 'redact-btn' | 'send-btn');
  }, buttonClass);
}

/**
 * Extract all findings from modal.
 * Uses test-only API exposed by modal (only available in test environments).
 * Returns structured data for assertions.
 */
export async function getModalFindings(
  page: Page
): Promise<Array<{ type: string; label: string; confidence: string; maskedValue: string }>> {
  return await page.evaluate(() => {
    const testAPI = (window as unknown as { __aiLeakCheckerTestAPI?: { getFindings: () => Array<{ type: string; label: string; confidence: string; maskedValue: string }> } }).__aiLeakCheckerTestAPI;
    if (!testAPI) {
      return [];
    }
    return testAPI.getFindings();
  });
}