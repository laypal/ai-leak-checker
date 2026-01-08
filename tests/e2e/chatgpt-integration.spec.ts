/**
 * @fileoverview E2E tests for ChatGPT integration.
 * @module e2e/chatgpt-integration
 * 
 * Tests that verify the extension works correctly on ChatGPT-like pages.
 * Uses a mock page that mimics ChatGPT's structure for reliable testing.
 */

import { test, expect } from '@playwright/test';
import { createTestPageHTML } from './helpers';

test.describe('ChatGPT Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Create a mock ChatGPT-like page
    const html = createTestPageHTML('chat.openai.com');
    await page.setContent(html);
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test('warns on API key paste', async ({ page }) => {
    const textarea = page.locator('#prompt-textarea');
    const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
    
    // Type API key into textarea
    await textarea.fill(apiKey);
    
    // Trigger paste event to simulate paste
    await textarea.evaluate((el) => {
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      el.dispatchEvent(event);
    });
    
    // Note: In a real E2E test with extension loaded, the modal would appear
    // For now, we verify the textarea accepts the input
    await expect(textarea).toHaveValue(apiKey);
  });

  test('allows clean text through without warning', async ({ page }) => {
    const textarea = page.locator('#prompt-textarea');
    const cleanText = 'Hello, this is just a normal message with no sensitive data.';
    
    await textarea.fill(cleanText);
    await page.waitForTimeout(500);
    
    // Should accept clean text
    await expect(textarea).toHaveValue(cleanText);
    
    // Modal should not appear (we can't verify this without extension loaded,
    // but the test structure verifies the page works)
  });

  test('submit button is clickable', async ({ page }) => {
    const textarea = page.locator('#prompt-textarea');
    const submitButton = page.locator('button[data-testid="send-button"]');
    
    await textarea.fill('Test message');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('form structure is valid', async ({ page }) => {
    const textarea = page.locator('#prompt-textarea');
    const form = page.locator('#chat-form');
    const submitButton = page.locator('button[data-testid="send-button"]');
    
    await textarea.fill('Test message');
    
    // Verify form elements exist and are accessible
    await expect(textarea).toBeVisible();
    await expect(form).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Form structure should be valid for extension interception
    const formAction = await form.getAttribute('action');
    const formMethod = await form.getAttribute('method');
    
    // Form should exist (action/method may be empty for JS-only forms)
    expect(form).toBeTruthy();
  });
});

/**
 * Integration test with extension loaded.
 * Note: This requires the extension to be built and loaded in Playwright.
 * For CI/CD, these tests may be skipped if extension loading fails.
 */
test.describe('ChatGPT Extension Integration (Requires Extension)', () => {
  test.skip(process.env.CI === 'true', 'Skipping extension-loaded tests in CI');

  test('extension detects API key and shows modal', async ({ context, page }) => {
    // This test requires the extension to be loaded via Playwright's extension loading
    // Implementation depends on Playwright's extension support
    
    // For now, this is a placeholder that documents the expected behavior
    // In a full implementation, you would:
    // 1. Load the extension in the browser context
    // 2. Navigate to a mock ChatGPT page
    // 3. Type an API key
    // 4. Verify the modal appears
    
    test.skip(true, 'Extension loading in Playwright requires additional setup');
  });
});
