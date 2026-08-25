# 5. Testing

[← Selector maintenance index](index.md)

## 5.1 Unit Tests for Selector Logic

```typescript
// tests/unit/selectors/selector-chain.test.ts
import { describe, it, expect, vi } from 'vitest';
import { findElement } from '@/content/selector-chain';

describe('SelectorChain', () => {
  it('should use primary selector when available', () => {
    document.body.innerHTML = '<input data-testid="chat-input" />';
    
    const chain = {
      primary: '[data-testid="chat-input"]',
      fallback1: 'input.chat',
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeTruthy();
    expect(element?.getAttribute('data-testid')).toBe('chat-input');
  });

  it('should fallback when primary fails', () => {
    document.body.innerHTML = '<input class="chat" />';
    
    const chain = {
      primary: '[data-testid="chat-input"]',  // Won't match
      fallback1: 'input.chat',                 // Will match
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeTruthy();
    expect(element?.className).toBe('chat');
  });

  it('should return null when all selectors fail', () => {
    document.body.innerHTML = '<div>No inputs</div>';
    
    const chain = {
      primary: '[data-testid="chat-input"]',
      fallback1: 'input.chat',
      fallback2: 'input',
    };
    
    const element = findElement(chain);
    expect(element).toBeNull();
  });
});
```

## 5.2 E2E Selector Health Tests

```typescript
// tests/e2e/selector-health.spec.ts
import { test, expect } from '@playwright/test';
import selectors from '../../configs/selectors.json';

for (const site of selectors.sites) {
  test.describe(`${site.site} Selectors`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`https://${site.site}`);
      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
    });

    test('input selector chain works', async ({ page }) => {
      const input = await page.locator(site.selectors.input.primary)
        .or(page.locator(site.selectors.input.fallback1))
        .or(page.locator(site.selectors.input.fallback2))
        .first();
      
      await expect(input).toBeVisible({ timeout: 10000 });
    });

    test('submit selector chain works', async ({ page }) => {
      const submit = await page.locator(site.selectors.submit.primary)
        .or(page.locator(site.selectors.submit.fallback1))
        .or(page.locator(site.selectors.submit.fallback2))
        .first();
      
      await expect(submit).toBeAttached({ timeout: 10000 });
    });
  });
}
```

## 5.3 Manual Testing Checklist

Before merging selector updates:

- [ ] Primary selector matches on live site
- [ ] Fallback1 matches if primary removed
- [ ] Fallback2 matches if primary and fallback1 removed
- [ ] Extension intercepts paste of API key
- [ ] Modal appears correctly
- [ ] "Mask & Continue" works
- [ ] No console errors
- [ ] Works in both logged-in and logged-out states
- [ ] Works after page refresh
- [ ] Works after navigation within site
