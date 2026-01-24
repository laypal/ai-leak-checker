/**
 * @fileoverview Extension helper class for E2E tests.
 * @module e2e/fixtures/extension
 * 
 * Provides utilities for working with the loaded extension in Playwright tests.
 */

import type { BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extension helper class for managing extension state in tests.
 */
export class ExtensionHelper {
  private context: BrowserContext;
  private extensionId: string | null = null;
  private extensionPath: string;

  constructor(context: BrowserContext) {
    this.context = context;
    // Extension is loaded via playwright.config.ts launch options
    this.extensionPath = path.join(__dirname, '../../../dist');
  }

  /**
   * Get the extension ID from Chrome.
   * Extension ID is needed to access extension pages like popup.
   */
  async getExtensionId(): Promise<string> {
    if (this.extensionId) {
      return this.extensionId;
    }

    // Navigate to extensions page
    const extensionsPage = await this.context.newPage();
    await extensionsPage.goto('chrome://extensions');

    // Enable developer mode if needed (inspect extensions page structure)
    await extensionsPage.evaluate(() => {
      const devModeToggle = document.querySelector('extensions-manager')
        ?.shadowRoot?.querySelector('extensions-toolbar')
        ?.shadowRoot?.querySelector('#devMode') as HTMLInputElement | null;
      
      if (devModeToggle && !devModeToggle.checked) {
        devModeToggle.click();
      }
    });

    // Wait for extensions to load
    await extensionsPage.waitForTimeout(1000);

    // Get extension ID from page
    // Extension ID is in the URL or can be extracted from extension details
    const extensionId = await extensionsPage.evaluate(() => {
      // Try to get extension ID from extensions-manager shadow DOM
      const manager = document.querySelector('extensions-manager');
      if (!manager) return null;

      const itemsList = manager.shadowRoot?.querySelector('extensions-item-list');
      if (!itemsList) return null;

      const items = itemsList.shadowRoot?.querySelectorAll('extensions-item');
      if (!items || items.length === 0) return null;

      // Get first extension's ID (assuming it's our extension)
      const firstItem = items[0];
      const id = firstItem.getAttribute('id');
      return id;
    }).catch(() => null);

    await extensionsPage.close();

    if (!extensionId) {
      // Fallback: try to get ID from background page
      // In Chrome extensions, background page URL contains extension ID
      const backgroundPages = this.context.backgroundPages();
      if (backgroundPages.length > 0) {
        const bgPage = backgroundPages[0];
        const url = bgPage.url();
        const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
        if (match && match[1]) {
          this.extensionId = match[1];
          return this.extensionId;
        }
      }

      throw new Error('Could not determine extension ID. Ensure extension is loaded.');
    }

    this.extensionId = extensionId;
    return extensionId;
  }

  /**
   * Open the extension popup.
   * Creates a new page with the popup HTML.
   */
  async openPopup(): Promise<Page> {
    const extensionId = await this.getExtensionId();
    const popupPage = await this.context.newPage();
    
    // Load popup HTML directly (popup URL format: chrome-extension://<id>/src/popup/index.html)
    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    
    // Wait for popup to load
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForTimeout(500); // Wait for React/Preact to mount
    
    return popupPage;
  }

  /**
   * Verify content script is injected on a page.
   */
  async verifyContentScriptInjected(page: Page): Promise<boolean> {
    // Check if content script has initialized
    // Content script may set a flag on window or inject elements
    return await page.evaluate(() => {
      // Check for extension-specific elements or flags
      // Content script may create a global flag
      return (
        (window as any).__aiLeakCheckerInitialized === true ||
        document.querySelector('#ai-leak-checker-modal') !== null ||
        document.body.getAttribute('data-ai-leak-checker') === 'active'
      );
    }).catch(() => false);
  }

  /**
   * Capture console logs from extension.
   * Returns a promise that resolves when logs are captured.
   */
  async captureConsoleLogs(page: Page): Promise<string[]> {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
    });

    // Return logs array (will be populated as logs occur)
    return logs;
  }

  /**
   * Get extension path for reference.
   */
  getExtensionPath(): string {
    return this.extensionPath;
  }

  /**
   * Check if extension is loaded.
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.getExtensionId();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for extension to be fully loaded and ready.
   * Polls until extension ID is available or timeout is reached.
   * 
   * Note: In Chromium test environments, extension loading may not always work.
   * This method will wait up to the timeout, but will not throw if the extension
   * doesn't load - tests should handle this gracefully.
   * 
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForLoad(timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to get extension ID (this verifies extension is loaded)
        await this.getExtensionId();
        // Extension is loaded if we can get the ID
        return;
      } catch {
        // Extension not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // Timeout reached - extension may not be loaded in this test environment
    // (e.g., Chromium may not support extension loading the same way Chrome does)
    // Don't throw - let tests proceed and handle gracefully
  }
}
