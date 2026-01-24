# Test Strategy - AI Leak Checker

> **Document Purpose**: Define comprehensive testing approach, coverage targets, and quality gates.
> **Version**: 1.0.0 | **Last Updated**: 2026-01-15
> **Owner**: QA/Development Team

---

## 1. Overview

This document defines the testing strategy for the AI Leak Checker browser extension. Our approach prioritizes:

1. **Detection accuracy** - Core value proposition must be reliable
2. **User experience** - Modal interactions must be smooth
3. **Platform stability** - Extension must not break target sites
4. **Privacy compliance** - No data leaks from the leak checker itself

---

## 2. Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  10% - Critical user journeys
                    │  Tests  │  Slowest, most expensive
                    ├─────────┤
              ┌─────┴─────────┴─────┐
              │    Integration     │  20% - Component interaction
              │       Tests        │  Message passing, storage
              ├───────────────────┤
        ┌─────┴───────────────────┴─────┐
        │         Unit Tests           │  70% - Detection engine, utilities
        │      Fast, isolated          │  Regex, entropy, redaction
        └───────────────────────────────┘
```

### 2.1 Test Type Distribution

| Test Type | Percentage | Purpose | Speed |
|-----------|------------|---------|-------|
| Unit | 70% | Detection patterns, utilities, pure functions | < 1s per test |
| Integration | 20% | Component interaction, message passing | < 5s per test |
| E2E | 10% | Full browser flows, real site interaction | < 30s per test |

---

## 3. Coverage Targets

### 3.1 Line Coverage Requirements

| Component | Target | Rationale |
|-----------|--------|-----------|
| `src/shared/detectors/` | **95%** | Core value proposition - must be bulletproof |
| `src/shared/utils/` | **90%** | Shared utilities affect all components |
| `src/content/` | **80%** | DOM interactions harder to unit test |
| `src/popup/` | **70%** | UI components tested primarily via E2E |
| `src/background/` | **85%** | Service worker logic critical for state |
| **Overall** | **85%** | Weighted average across all source |

### 3.2 Coverage Gates

Coverage is enforced in CI. PRs failing these gates cannot merge:

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "src/shared/detectors/": {
      "lines": 95
    }
  }
}
```

---

## 4. Test Types & Frameworks

### 4.1 Unit Tests

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

### 4.2 Integration Tests

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

### 4.3 E2E Tests

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

### 4.4 Property-Based Tests (Optional)

**Framework**: fast-check (TypeScript) or Hypothesis (Python)  
**Location**: `tests/property/`  
**Command**: `npm run test:property`

**Use Cases**:
- Entropy calculation edge cases
- Regex pattern boundary conditions
- Redaction reversibility checks

---

## 5. Corpus Testing

### 5.1 False Positive Corpus

**Purpose**: Validate that safe text does not trigger warnings  
**Location**: `tests/fixtures/false_positives_corpus.json`  
**Target**: < 5% false positive rate  
**Command**: `npm run test:corpus`

**Corpus Categories** (500+ samples total):
```json
{
  "categories": [
    {
      "name": "UUIDs",
      "count": 50,
      "samples": ["550e8400-e29b-41d4-a716-446655440000", ...]
    },
    {
      "name": "MD5 Hashes",
      "count": 50,
      "samples": ["d41d8cd98f00b204e9800998ecf8427e", ...]
    },
    {
      "name": "Base64 Images",
      "count": 30,
      "samples": ["data:image/png;base64,iVBORw0KGgo...", ...]
    },
    {
      "name": "Code Snippets",
      "count": 100,
      "samples": ["const hash = crypto.createHash('sha256');", ...]
    },
    {
      "name": "URLs with Query Params",
      "count": 50,
      "samples": ["https://example.com/callback?token=abc123", ...]
    },
    {
      "name": "URLs with High-Entropy Path Segments",
      "count": 3,
      "samples": [
        "https://kdp.amazon.com/en_US/help/topic/G4WB7VPPEAREHAAD",
        "https://example.com/api/v1/users/1234567890abcdef",
        "http://localhost:3000/docs/abc123xyz789"
      ],
      "notes": "URLs contain high-entropy segments (IDs, tokens) but are not secrets. Entropy detection excludes URLs via isPartOfUrl() helper."
    },
    {
      "name": "Product Codes",
      "count": 50,
      "samples": ["SKU-12345-ABC", "PART-NO-987654", ...]
    },
    {
      "name": "Session IDs",
      "count": 50,
      "samples": ["sess_abc123def456", ...]
    },
    {
      "name": "Common Abbreviations",
      "count": 70,
      "samples": ["API = Application Programming Interface", ...]
    },
    {
      "name": "Placeholder Text",
      "count": 50,
      "samples": ["YOUR_API_KEY_HERE", "REPLACE_ME", ...]
    }
  ]
}
```

### 5.2 True Positive Corpus

**Purpose**: Validate that real sensitive data is detected  
**Location**: `tests/fixtures/true_positives_corpus.json`  
**Target**: > 95% true positive rate

**Categories**:
- OpenAI API keys (sk-proj-*, sk-live-*)
- AWS credentials (AKIA*, aws_secret_access_key)
- Stripe keys (sk_live_*, pk_live_*)
- GitHub tokens (ghp_*, gho_*)
- Google API keys
- Email addresses
- Credit card numbers (Luhn-valid)
- Phone numbers (various formats)
- National Insurance numbers (UK)
- Social Security numbers (US)
- Private keys (RSA, SSH)

### 5.3 Corpus Test Runner

```typescript
// tests/corpus/run-corpus-test.ts
import { readFileSync } from 'fs';
import { detect } from '@/shared/detectors';

interface CorpusResult {
  total: number;
  falsePositives: number;
  falseNegatives: number;
  fpRate: number;
  fnRate: number;
  failedSamples: Array<{ sample: string; category: string; detected: boolean }>;
}

export function runCorpusTest(corpusPath: string, expectDetection: boolean): CorpusResult {
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf-8'));
  const results: CorpusResult = {
    total: 0,
    falsePositives: 0,
    falseNegatives: 0,
    fpRate: 0,
    fnRate: 0,
    failedSamples: [],
  };

  for (const category of corpus.categories) {
    for (const sample of category.samples) {
      results.total++;
      const findings = detect(sample);
      const detected = findings.length > 0;

      if (expectDetection && !detected) {
        results.falseNegatives++;
        results.failedSamples.push({ sample, category: category.name, detected });
      } else if (!expectDetection && detected) {
        results.falsePositives++;
        results.failedSamples.push({ sample, category: category.name, detected });
      }
    }
  }

  results.fpRate = (results.falsePositives / results.total) * 100;
  results.fnRate = (results.falseNegatives / results.total) * 100;

  return results;
}
```

---

## 6. CI/CD Pipeline

### 6.1 Pipeline Stages

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e

  corpus-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:corpus
      - name: Check FP Rate
        run: |
          FP_RATE=$(npm run test:corpus --json | jq '.fpRate')
          if (( $(echo "$FP_RATE > 5" | bc -l) )); then
            echo "FP rate $FP_RATE exceeds 5% threshold"
            exit 1
          fi
```

### 6.2 Quality Gates

| Gate | Threshold | Blocks Merge |
|------|-----------|--------------|
| Unit test pass rate | 100% | Yes |
| E2E test pass rate | 100% | Yes |
| Line coverage | 85% | Yes |
| FP corpus rate | < 5% | Yes |
| Lint errors | 0 | Yes |
| TypeScript errors | 0 | Yes |

---

## 7. Test Data Management

### 7.1 Sensitive Data Handling

**Rule**: Never commit real API keys, credentials, or PII to the repository.

**Approaches**:
1. Use obviously fake keys that match pattern but fail validation
2. Use environment variables for real keys in local testing
3. Prefix test data with `TEST_` or `FAKE_`

**Example Test Keys**:
```typescript
export const TEST_KEYS = {
  openai: 'sk-proj-TESTkey1234567890abcdefghijklmnopqrs',
  aws_access: 'AKIATEST12345678TEST',
  stripe: 'sk_test_FAKE1234567890abcdefghijklmno',
};
```

### 7.2 Fixtures Organization

```
tests/fixtures/
├── corpus/
│   ├── false_positives_corpus.json
│   └── true_positives_corpus.json
├── mocks/
│   ├── chrome-api.ts           # Chrome API mocks
│   ├── chatgpt-page.html       # Mock ChatGPT DOM
│   └── claude-page.html        # Mock Claude DOM
├── test-data/
│   ├── api-keys.ts             # Test API key samples
│   ├── pii-samples.ts          # Test PII samples
│   └── edge-cases.ts           # Unicode, emoji, etc.
└── selectors/
    └── snapshot-*.json         # DOM snapshot fixtures
```

---

## 8. Testing Best Practices

### 8.1 Test Naming Convention

```typescript
// Pattern: should_ExpectedBehavior_When_StateUnderTest
describe('DetectionEngine', () => {
  it('should_DetectApiKey_When_OpenAIKeyPresent', () => {});
  it('should_ReturnEmpty_When_NoSensitiveData', () => {});
  it('should_CalculateHighEntropy_When_RandomString', () => {});
});
```

### 8.2 Arrange-Act-Assert Pattern

```typescript
it('should mask email addresses', () => {
  // Arrange
  const input = 'Contact: john.doe@company.com';
  const finding = { start: 9, end: 29, type: 'email' };

  // Act
  const result = redact(input, [finding]);

  // Assert
  expect(result).toBe('Contact: [REDACTED_EMAIL]');
});
```

### 8.3 Test Isolation

- Each test must be independent
- Use `beforeEach` for setup, `afterEach` for cleanup
- Never rely on test execution order
- Clear storage/mocks between tests

---

## 9. Metrics & Reporting

### 9.1 Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test execution time | < 5 min | CI pipeline duration |
| Flaky test rate | < 1% | Failed tests that pass on retry |
| Coverage delta | >= 0% | New code coverage |
| FP rate | < 5% | Corpus test results |
| TP rate | > 95% | Corpus test results |

### 9.2 Reporting

- **Codecov**: Line coverage visualization
- **GitHub Actions**: Test results in PR checks
- **Weekly report**: FP rate trends, coverage changes

---

## 10. Appendix: Commands Reference

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Unit tests with coverage
npm run test:unit -- --coverage

# Unit tests in watch mode
npm run test:unit -- --watch

# Integration tests
npm run test:integration

# E2E tests (requires built extension)
npm run build && npm run test:e2e

# E2E tests with UI
npm run test:e2e -- --headed

# E2E specific browser
npm run test:e2e -- --project=chromium

# Corpus tests
npm run test:corpus

# All tests with verbose output
npm run test -- --reporter=verbose
```

---

## 10. E2E Testing Strategy

### 10.1 Overview

E2E tests use Playwright to load the extension in Chrome and verify behavior on real AI chat sites. Tests are isolated in a separate CI job due to long wait times (32s per conditional injection test).

### 10.2 Test Structure

- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Browser**: Chromium (Chrome extension testing)
- **Timeout**: 60s per test (configurable in `playwright.config.ts`)

### 10.3 Test Categories

1. **Extension Loading**: Verify extension loads and initializes correctly
2. **Platform Integration**: Test detection on ChatGPT and Claude
3. **Conditional Injection**: Verify fallback activation logic (32s waits)
4. **Modal UI**: Test warning modal behavior
5. **False Positives**: Verify known false positive cases don't trigger
6. **Performance**: Measure detection latency

### 10.4 CI Integration

E2E tests run in separate GitHub Actions job (`e2e`) that:
- Runs after unit/integration tests pass (`needs: test`)
- Has 15-minute timeout to accommodate 32s waits
- Uploads test reports and videos on failure
- Does not block main CI pipeline

### 10.5 Test Timing

**Conditional Injection Tests**:
- Wait 32 seconds (30s health check + 2s buffer)
- Verify `__aiLeakCheckerInjected` marker state
- Test both success (no injection) and failure (injection) paths

**Why 32s?**
- Health check runs at 30s (after retry window ends)
- 2s buffer accounts for setTimeout precision and test execution

### 10.6 Parallelization

- **Current**: Single worker (`workers: 1` in `playwright.config.ts`)
- **Reason**: Extension state is shared; parallel tests can interfere
- **Future**: Consider test sharding if suite grows >20 tests

### 10.7 Mock Pages

Tests use `createMockAIPageHTML()` helper to create pages with/without selectors:
- Allows testing selector failure scenarios without modifying real sites
- Ensures consistent test environment
- Faster than loading real ChatGPT/Claude pages

### 10.8 Debugging Failed Tests

1. Check `playwright-report/` for HTML report
2. Review videos in `test-results/` (uploaded on failure)
3. Check console logs in test output
4. Verify extension loaded correctly (`ExtensionHelper.waitForLoad()`)

---

*End of Test Strategy Document*
