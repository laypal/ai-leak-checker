---
name: create-e2e-test
description: Create end-to-end Playwright tests for AI platform detection scenarios. Use when adding tests for new AI platforms, detection workflows, modal interactions, or when the user asks to create E2E tests.
---

# Create E2E Test

Add end-to-end test for new AI platform or detection scenario using Playwright.

## File Location

Create test file in `tests/e2e/` following naming: `{platform}.spec.ts` (e.g., `gemini.spec.ts`).

## Template

```typescript
/**
 * @fileoverview E2E tests for {Platform Name} integration.
 * @module e2e/{platform}
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, waitForModal, isModalVisible, clickModalButton } from './helpers';
import { ExtensionHelper } from './fixtures/extension';

test.describe('{Platform Name} Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Use helper to set up test page with extension loaded
    await setupTestPage(page, '{platform-domain.com}');
  });

  test('warns on API key paste', async ({ page, context }) => {
    const textarea = page.locator('#prompt-textarea'); // Update selector
    const apiKey = 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI';
    
    await textarea.fill(apiKey);
    
    // Simulate paste event
    await textarea.evaluate((el) => {
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      el.dispatchEvent(event);
    });
    
    await page.waitForTimeout(1000);
    
    // Check if extension loaded and modal appeared
    const helper = new ExtensionHelper(context);
    const isLoaded = await helper.isLoaded();
    
    if (isLoaded) {
      const modalVisible = await isModalVisible(page).catch(() => false);
      if (modalVisible) {
        await expect(page.locator('.leak-checker-modal')).toBeVisible();
      }
    }
  });

  test('allows submission after redaction', async ({ page }) => {
    const textarea = page.locator('#prompt-textarea');
    await textarea.fill('sk-proj-abc123def456');
    
    const submitBtn = page.locator('button[data-testid="send-button"]');
    await submitBtn.click();
    
    // Wait for modal and click redact
    await waitForModal(page);
    await clickModalButton(page, 'redact');
    
    // Assert content redacted
    const content = await textarea.inputValue();
    expect(content).toContain('[REDACTED]');
  });
});
```

## Key Helpers

- `setupTestPage(page, hostname)` - Sets up test page with extension loaded
- `waitForModal(page)` - Waits for warning modal to appear
- `isModalVisible(page)` - Checks if modal is visible
- `clickModalButton(page, action)` - Clicks modal buttons (warn/block/redact)
- `ExtensionHelper` - Manages extension state and ID

## Selectors

Update selectors in `configs/selectors.json` for the platform. Reference selectors in tests:

```typescript
// Get selectors from config
const config = await getSelectorsForDomain('platform-domain.com');
const textareaSelector = config.inputSelectors[0];
const submitSelector = config.submitSelectors[0];
```

## Run Test

```bash
# Run specific platform tests
npm run test:e2e -- --grep="{Platform Name}"

# Run all E2E tests
npm run test:e2e
```

## Debugging

```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Enable Playwright debug mode
PWDEBUG=1 npm run test:e2e

# Screenshots on failure (auto-configured)
# Check: tests/e2e/screenshots/
```

## Checklist

- [ ] Test file created in `tests/e2e/{platform}.spec.ts`
- [ ] Uses `setupTestPage` helper for initialization
- [ ] Tests detection, modal appearance, and user actions
- [ ] Selectors match `configs/selectors.json` for platform
- [ ] Includes both positive (detection) and negative (no false positives) cases
- [ ] File header includes JSDoc with platform name