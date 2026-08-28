[Back to Test Strategy index](index.md)

# 4. Test Types & Frameworks

## 4.1 Unit Tests

**Framework**: Vitest  
**Location**: `tests/unit/`  
**Command**: `npm run test:unit`

**What to Unit Test**:
- ✅ Detection patterns (regex, entropy calculation)
- ✅ Entropy detection with URL exclusion (URL false positive prevention)
- ✅ Redaction logic
- ✅ Category classification
- ✅ Confidence scoring
- ✅ Utility functions (parsing, formatting)
- ✅ Message type validation
- ❌ DOM manipulation (use integration/E2E)
- ❌ Chrome API calls (use mocks or integration)

**Structure**:
```
tests/unit/
├── detectors/
│   ├── patterns.test.ts      # Pattern matching tests
│   ├── entropy.test.ts       # Entropy calculation + URL exclusion
│   ├── confidence.test.ts    # Confidence scoring
│   └── redaction.test.ts     # Masking logic
├── utils/
│   ├── validators.test.ts    # Input validation
│   └── formatters.test.ts    # Output formatting
└── types/
    └── messages.test.ts      # Type guards
```

**Example Unit Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { detectApiKeys } from '@/shared/detectors/patterns';

describe('API Key Detection', () => {
  it('detects OpenAI API keys', () => {
    const text = 'My key is sk-proj-abc123xyz456def789...';
    const findings = detectApiKeys(text);
    
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('api_key_openai');
    expect(findings[0].confidence).toBeGreaterThan(0.9);
  });

  it('ignores UUID-like strings', () => {
    const text = '550e8400-e29b-41d4-a716-446655440000';
    const findings = detectApiKeys(text);
    
    expect(findings).toHaveLength(0);
  });
});
```

## 4.2 Integration Tests

**Framework**: Vitest + JSDOM/Happy-DOM  
**Location**: `tests/integration/`  
**Command**: `npm run test:integration`

**What to Integration Test**:
- ✅ Message passing between content script and service worker
- ✅ Storage read/write operations
- ✅ Component lifecycle (modal mount/unmount)
- ✅ Event handling chains
- ❌ Real browser APIs (use E2E)
- ❌ Network requests to real sites (use E2E)

**Chrome API Mocking**:
```typescript
// tests/integration/setup.ts
import { vi } from 'vitest';

globalThis.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
} as unknown as typeof chrome;
```

## 4.3 E2E Tests

**Framework**: Playwright  
**Location**: `tests/e2e/`  
**Command**: `npm run test:e2e`

**What to E2E Test**:
- ✅ Extension loads without errors
- ✅ Content script injects on target sites
- ✅ Warning modal appears on sensitive data
- ✅ "Mask & Continue" replaces text correctly
- ✅ "Send Anyway" allows submission
- ✅ "Cancel" returns to input
- ✅ Popup displays correct statistics
- ✅ Settings persist across sessions

**Test Suites**:
```
tests/e2e/
├── fixtures/
│   └── extension.ts          # Extension helper class
├── helpers.ts                # Test utility functions
├── setup.ts                  # Global test setup
├── extension-loading.spec.ts # Extension structure validation
├── extension-setup.spec.ts   # Extension loading and initialization
├── chatgpt.spec.ts           # ChatGPT integration tests
├── chatgpt-integration.spec.ts # ChatGPT mock page tests
├── claude.spec.ts            # Claude integration tests
├── detection-engine.spec.ts  # Detection engine E2E tests
├── false-positives.spec.ts   # False positive validation (includes URLs)
└── performance.spec.ts       # Performance benchmarks
```

**Example E2E Test**:
```typescript
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from './fixtures/extension';

test.describe('ChatGPT Integration', () => {
  let extension: ExtensionHelper;

  test.beforeEach(async ({ context }) => {
    extension = new ExtensionHelper(context);
    await extension.waitForLoad();
  });

  test('warns on API key paste', async ({ page }) => {
    await page.goto('https://chat.openai.com');
    await extension.waitForContentScript(page);
    
    const input = page.locator('textarea[data-id="prompt-textarea"]');
    await input.fill('sk-proj-test1234567890abcdefghijklmnop');
    await input.press('Enter');
    
    // Wait for warning modal
    const modal = page.locator('[data-testid="leak-checker-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Verify finding displayed
    await expect(modal.locator('.finding-type')).toContainText('API Key');
  });
});
```

## 4.4 Property-Based Tests (Optional)

**Framework**: fast-check (TypeScript) or Hypothesis (Python)  
**Location**: `tests/property/`  
**Command**: `npm run test:property`

**Use Cases**:
- Entropy calculation edge cases
- Regex pattern boundary conditions
- Redaction reversibility checks
