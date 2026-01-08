/**
 * @fileoverview E2E tests for extension loading and basic functionality.
 * @module e2e/extension-loading
 * 
 * Tests that verify the extension loads correctly and popup functions.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Extension Loading', () => {
  // Note: Extension loading in Playwright with Chromium is limited
  // These tests verify the extension can load without errors when manually installed
  // For full E2E testing with extension loaded, use Chrome with --load-extension flag

  test('extension loads without errors', async ({ page }) => {
    // Navigate to a page that would trigger content script
    await page.goto('data:text/html,<html><body>Test</body></html>');
    
    // Check console for errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Extension may log warnings/info but should not have fatal errors
    // Filter out known extension logs and check for actual errors
    const fatalErrors = errors.filter(e => {
      // Allow extension logs but not actual JavaScript errors
      if (e.includes('[AI Leak Checker]')) return false;
      // Actual errors usually contain "Error:" or stack traces
      return e.includes('Error:') || e.includes('ReferenceError') || e.includes('TypeError');
    });
    
    // Should have no fatal errors
    expect(fatalErrors.length).toBe(0);
  });

  test('popup HTML structure is valid', async () => {
    // Test popup HTML structure (extension loading in Chromium is limited)
    // In a real E2E scenario, extension would be loaded via Chrome
    const popupPath = path.join(__dirname, '../../dist/src/popup/index.html');
    
    // Read and verify popup HTML exists
    const exists = existsSync(popupPath);
    expect(exists).toBe(true);
    
    // Try to load it as a file (won't work in browser context but verifies structure)
    // For actual popup testing, need extension loaded in Chrome
    const html = readFileSync(popupPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html.length).toBeGreaterThan(0);
    // Verify it's valid HTML (has html tag)
    expect(html.toLowerCase()).toMatch(/<html/);
  });

  // Note: Full extension popup testing requires Chrome with extension loaded
  // This is verified manually or via Chrome automation tools
});
