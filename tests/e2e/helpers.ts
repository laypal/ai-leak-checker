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
<body>
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
 */
export async function clickModalButton(
  page: Page,
  buttonClass: 'cancel-btn' | 'redact-btn' | 'send-btn'
): Promise<void> {
  // Modal buttons are in shadow DOM, so we need to use evaluate
  await page.evaluate((className) => {
    const modal = document.querySelector('#ai-leak-checker-modal');
    if (!modal) throw new Error('Modal not found');
    
    const shadowRoot = (modal as HTMLElement).shadowRoot;
    if (!shadowRoot) throw new Error('Shadow root not found');
    
    const button = shadowRoot.querySelector(`.${className}`) as HTMLButtonElement;
    if (!button) throw new Error(`Button ${className} not found`);
    
    button.click();
  }, buttonClass);
}

/**
 * Extract all findings from modal shadow DOM.
 * Returns structured data for assertions.
 */
export async function getModalFindings(
  page: Page
): Promise<Array<{ type: string; label: string; confidence: string; maskedValue: string }>> {
  return await page.evaluate(() => {
    const modal = document.querySelector('#ai-leak-checker-modal');
    if (!modal) return [];

    const shadowRoot = (modal as HTMLElement).shadowRoot;
    if (!shadowRoot) return [];

    const findingsList = shadowRoot.querySelector('.findings-list');
    if (!findingsList) return [];

    const items = findingsList.querySelectorAll('li.finding-item');
    const findings: Array<{ type: string; label: string; confidence: string; maskedValue: string }> = [];

    items.forEach((item) => {
      const typeEl = item.querySelector('.finding-type');
      const valueEl = item.querySelector('.finding-value');
      const badgeEl = item.querySelector('.confidence-badge');

      if (typeEl && valueEl) {
        const label = typeEl.textContent?.trim() || '';
        const maskedValue = valueEl.textContent?.trim() || '';
        const confidence = badgeEl?.textContent?.trim() || '';

        // Map label text to DetectorType enum value
        // This mapping is the reverse of describeFinding() in engine.ts
        const labelToType: Record<string, string> = {
          'openai api key': 'api_key_openai',
          'aws credentials': 'api_key_aws',
          'github token': 'api_key_github',
          'stripe api key': 'api_key_stripe',
          'slack token': 'api_key_slack',
          'google api key': 'api_key_google',
          'anthropic api key': 'api_key_anthropic',
          'sendgrid api key': 'api_key_sendgrid',
          'twilio credentials': 'api_key_twilio',
          'mailchimp api key': 'api_key_mailchimp',
          'heroku api key': 'api_key_heroku',
          'npm access token': 'api_key_npm',
          'pypi api token': 'api_key_pypi',
          'docker hub token': 'api_key_docker',
          'supabase api key': 'api_key_supabase',
          'firebase api key': 'api_key_firebase',
          'api key': 'api_key_generic',
          'private key': 'private_key',
          'password': 'password',
          'credit card number': 'credit_card',
          'email address': 'email',
          'uk phone number': 'phone_uk',
          'uk national insurance number': 'uk_ni_number',
          'us social security number': 'us_ssn',
          'bank account (iban)': 'iban',
          'high-entropy secret': 'high_entropy',
        };

        // Extract type from label using mapping, fallback to snake_case if not found
        const normalizedLabel = label.toLowerCase();
        const type = labelToType[normalizedLabel] || normalizedLabel.replace(/\s+/g, '_');

        findings.push({ type, label, confidence, maskedValue });
      }
    });

    return findings;
  });
}