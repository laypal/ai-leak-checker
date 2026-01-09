/**
 * @fileoverview Global setup for E2E tests.
 * @module e2e/setup
 * 
 * Configures global test environment for extension testing.
 */

import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup function called before all tests.
 * Verifies extension can be built and loaded.
 */
async function globalSetup(config: FullConfig) {
  // Verify extension build exists
  const extensionPath = path.join(__dirname, '../../dist');
  const manifestPath = path.join(extensionPath, 'manifest.json');
  
  const fs = await import('fs');
  if (!fs.existsSync(manifestPath)) {
    console.warn(
      '[E2E Setup] Extension not built. Run `npm run build` before E2E tests.'
    );
    // Don't fail - webServer in playwright.config.ts will build it
  } else {
    console.log('[E2E Setup] Extension build found at:', extensionPath);
  }

  // Verify extension structure
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.js',
  ];

  const missingFiles: string[] = [];
  for (const file of requiredFiles) {
    const filePath = path.join(extensionPath, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.warn(
      `[E2E Setup] Missing required files: ${missingFiles.join(', ')}`
    );
    console.warn('[E2E Setup] Extension may not load correctly in tests.');
  } else {
    console.log('[E2E Setup] Extension structure verified.');
  }

  // Note: Extension loading is configured in playwright.config.ts
  // via launchOptions with --load-extension flag
  // This setup just verifies files exist
}

export default globalSetup;
