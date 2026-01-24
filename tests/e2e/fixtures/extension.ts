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
   * Extract extension ID from a chrome-extension:// URL.
   * 
   * @param url - The URL to extract the ID from
   * @returns The extension ID if found, null otherwise
   */
  private extractExtensionIdFromUrl(url: string): string | null {
    const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
    return match && match[1] ? match[1] : null;
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

    // Wait for extensions to load - wait for extension list container
    await extensionsPage.waitForSelector('extensions-manager', { timeout: 5000 }).catch(() => {
      // Fallback: wait for network idle if selector not found
      return extensionsPage.waitForLoadState('networkidle', { timeout: 5000 });
    });

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
        const extractedId = this.extractExtensionIdFromUrl(url);
        if (extractedId) {
          this.extensionId = extractedId;
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
   * Returns a cleanup function that removes the listener and returns collected logs.
   * 
   * Usage:
   *   const cleanup = await extension.captureConsoleLogs(page);
   *   // ... perform actions ...
   *   const logs = cleanup();
   */
  async captureConsoleLogs(page: Page): Promise<() => string[]> {
    const logs: string[] = [];
    
    const handler = (msg: any) => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
    };
    
    page.on('console', handler);

    // Return cleanup function that removes listener and returns logs
    return () => {
      page.off('console', handler);
      return logs;
    };
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
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
   * @returns true if extension loaded successfully, false if timeout reached
   */
  async waitForLoad(timeoutMs: number = 5000): Promise<boolean> {
    // If extension ID is already cached, return immediately
    if (this.extensionId) {
      return true;
    }

    // Start timing before the first attempt to include it in timeout calculation
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    // Try to get extension ID once (this may open pages/navigate)
    try {
      await this.getExtensionId();
      // If successful, extensionId is now set
      return true;
    } catch {
      // First attempt failed, continue to polling
    }
    
    while (Date.now() - startTime < timeoutMs) {
      // Check if extension ID was set by a concurrent call
      if (this.extensionId) {
        return true;
      }

      // Check background pages as a cheaper alternative to getExtensionId
      const backgroundPages = this.context.backgroundPages();
      if (backgroundPages.length > 0) {
        // Try to extract extension ID from background page URL
        const bgPage = backgroundPages[0];
        const url = bgPage.url();
        const extractedId = this.extractExtensionIdFromUrl(url);
        if (extractedId) {
          this.extensionId = extractedId;
          return true;
        }
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    // Timeout reached - extension may not be loaded in this test environment
    return false;
  }
}
